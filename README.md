# Gatsby plugin Algolia index

[![Build Status](https://travis-ci.org/kdichev/gatsby-plugin-algolia-index.svg?branch=master)](https://travis-ci.org/kdichev/gatsby-plugin-algolia-index)

> 🚧 This plugin is work in progress 🚧
>
> Feel free to open issues for any questions or ideas

```sh
$ yarn add gatsby-plugin-algolia-index
```

First add credentials to a .env file, which you won't commit. If you track this in your file, and especially if the site is open source, you will leak your admin API key. This would mean anyone is able to change anything on your Algolia index.

```env
// .env.${process.env.NODE_ENV}
ALGOLIA_APP_ID=XXX
ALGOLIA_API_KEY=XXX
```

```js
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
})

// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-algolia-index`,
      options: {
        appId: process.env.ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_API_KEY,
        indexName: process.env.ALGOLIA_INDEX_NAME, // for all queries
        path: 'path/to/custom/indexing-config' // optional
        chunkSize: 10000, // default: 1000
      },
    },
  ],
}

// algolia-index-config.js must return a Promise
// (graphql: GraphQlClient) => Promise<[]<{indexName: string, indexData: []<any>}>>
module.exports = async (/*graphql*/) => [
  { indexName: 'index1', indexData: [{ hello: '1' }] },
  { indexName: 'index2', indexData: [{ hello: '2' }] },
]
```
