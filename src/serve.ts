import { DatabaseService } from "./services/databaseService";

const db = new DatabaseService();


const express = require('express')
const app = express()
const port = process.env['NODE_ENV'] == 'production' ? 80 : 3000

app.get('/', async (req:any, res:any) => {
    const clusters = (await db.getClustersWithArticles())
    res.send(clusters)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})