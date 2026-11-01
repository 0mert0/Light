const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:1423@localhost:5432/light_db"
});

pool.connect()
    .then(() => console.log('🟢 PostgreSQL veritabanına başarıyla bağlanıldı!'))
    .catch(err => console.error(' Veritabanı bağlantı hatası:', err.stack));

module.exports = pool;