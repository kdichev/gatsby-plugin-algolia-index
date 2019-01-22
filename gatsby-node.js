const algoliasearch = require('algoliasearch')
const report = require('gatsby-cli/lib/reporter')
const path = require('path')

const DEFAULT_CONFIG_NAME = `algolia-index-config`

const chunk = (arr, chunkSize, cache = []) => {
  const tmp = [...arr]
  while (tmp.length) cache.push(tmp.splice(0, chunkSize))
  return cache
}

exports.onPostBuild = async (
  { graphql, store },
  { appId, apiKey, path: configPath, chunkSize = 1000 }
) => {
  const activity = report.activityTimer(`Start indexing website to Algolia`)
  activity.start()
  const client = algoliasearch(appId, apiKey)
  const { program } = store.getState()

  const indexingFunction = require(path.join(
    program.directory,
    configPath ? configPath : DEFAULT_CONFIG_NAME
  ))
  const indexes = await indexingFunction(graphql)

  setStatus(activity, `${indexes.length} data sets to index`)
  const indexJobs = indexes.map(
    async ({ indexName, indexData, settings }, i) => {
      const index = client.initIndex(indexName)
      const mainIndexExists = await indexExists(index)
      const tmpIndex = client.initIndex(`${indexName}_tmp`)
      const indexToUse = mainIndexExists ? tmpIndex : index

      if (mainIndexExists) {
        setStatus(activity, `data set ${i}: copying existing index`)
        await scopedCopyIndex(client, index, tmpIndex)
      }

      setStatus(activity, `data set ${i}: executing query`)

      const chunks = chunk(indexData, chunkSize)

      setStatus(activity, `data set ${i}: splitting in ${chunks.length} jobs`)

      const chunkJobs = chunks.map(async function(chunked) {
        const { taskID } = await indexToUse.addObjects(chunked)
        return indexToUse.waitTask(taskID)
      })

      await Promise.all(chunkJobs)

      if (settings) {
        indexToUse.setSettings(settings)
      }

      if (mainIndexExists) {
        setStatus(activity, `data set ${i}: moving copied index to main index`)
        return moveIndex(client, tmpIndex, index)
      }
    }
  )

  try {
    await Promise.all(indexJobs)
  } catch (err) {
    report.panic(`failed to index to Algolia`, err)
  }
  activity.end()
}

const scopedCopyIndex = async (client, sourceIndex, targetIndex) => {
  const { taskID } = await client.copyIndex(
    sourceIndex.indexName,
    targetIndex.indexName,
    ['settings', 'synonyms', 'rules']
  )
  return targetIndex.waitTask(taskID)
}

const moveIndex = async (client, sourceIndex, targetIndex) => {
  const { taskID } = await client.moveIndex(
    sourceIndex.indexName,
    targetIndex.indexName
  )
  return targetIndex.waitTask(taskID)
}

const indexExists = async index => {
  try {
    const { nbHits } = await index.search()
    return nbHits > 0
  } catch (e) {
    return false
  }
}

const setStatus = async (activity, status) => {
  if (activity && activity.setStatus) {
    activity.setStatus(status)
  } else {
    console.log('Algolia:', status)
  }
}
