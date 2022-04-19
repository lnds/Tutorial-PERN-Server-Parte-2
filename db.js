// db.js

const Pool = require("pg").Pool

const connectionString = process.env.CONNECTION_URL

const pool = new Pool({
    connectionString,
})

module.exports = pool
