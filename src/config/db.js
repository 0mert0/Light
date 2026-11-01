const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'light_db',
    password: '1423', 
    port: 5432,
});

pool.on('connect', () => {
    console.log('🟢 PostgreSQL veritabanına başarıyla bağlanıldı!');
});

module.exports = pool;