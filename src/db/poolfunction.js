const { Pool } = require('pg');

require('dotenv').config()

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

module.exports = {pool}