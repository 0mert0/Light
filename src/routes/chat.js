const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Mesaj Gönderme Rotası
router.post('/send', async (req, res) => {
    const { senderUsername, senderTag, receiverId, message } = req.body;

    try {
        const senderResult = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND tag = $2',
            [senderUsername, senderTag]
        );

        if (senderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Gönderen kullanıcı bulunamadı.' });
        }

        const senderId = senderResult.rows[0].id;

        const newMessage = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *',
            [senderId, receiverId, message]
        );

        res.status(201).json({ success: true, message: newMessage.rows[0] });
    } catch (err) {
        console.error('Mesaj gönderme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
});

// Mesaj Geçmişini ve Gönderen Bilgilerini Çekme Rotası
router.get('/history/:username/:tag/:friendId', async (req, res) => {
    const { username, tag, friendId } = req.params;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        
        const myId = userResult.rows[0].id;

        const messages = await pool.query(
            `SELECT m.*, u.username as sender_name, u.avatar as sender_avatar 
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1) 
             ORDER BY m.created_at ASC`,
            [myId, friendId]
        );
        res.json({ messages: messages.rows, myId });
    } catch (err) {
        console.error('Mesajları getirme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

module.exports = router;