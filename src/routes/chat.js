const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Mesaj Gönderme Rotası
router.post('/send', async (req, res) => {
    const { senderUsername, senderTag, receiverId, message } = req.body;

    try {
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Boş mesaj gönderilemez.' });
        }

        const senderResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [senderUsername, senderTag]);
        if (senderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Gönderen bulunamadı.' });
        }
        
        const senderId = senderResult.rows[0].id;

        await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)',
            [senderId, receiverId, message]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Mesaj gönderme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Mesaj Geçmişini Çekme Rotası
router.get('/history/:username/:tag/:friendId', async (req, res) => {
    const { username, tag, friendId } = req.params;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        
        const myId = userResult.rows[0].id;

        const messages = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
             ORDER BY created_at ASC`,
            [myId, friendId]
        );
        res.json({ messages: messages.rows, myId });
    } catch (err) {
        console.error('Mesajları getirme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

module.exports = router;