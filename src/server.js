const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = require('./config/db');

// Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Veritabanı Tablolarını Oluşturma Fonksiyonu
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                tag VARCHAR(4) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Çevrim İçi',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_username_tag UNIQUE (username, tag)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS friend_requests (
                id SERIAL PRIMARY KEY,
                sender_id INT REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 🚀 Mesajlar Tablosu Eklendi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INT REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('🟢 PostgreSQL veritabanı ve tablolar hazır.');
    } catch (err) {
        console.error('Veritabanı başlatma hatası:', err);
    }
};
initDB();

// Rotalar
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat'); // 🚀 Chat Rotaları Dahil Edildi

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes); // 🚀 Sunucuya Bağlandı

// Sunucuyu Başlatma
app.listen(PORT, () => {
    console.log(`🚀 Light sunucusu çalışıyor: http://localhost:${PORT}`);
});