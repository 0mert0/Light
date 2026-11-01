const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. Arkadaşlık İsteği Gönderme
router.post('/send-request', async (req, res) => {
    const { senderFullUsername, receiverInput } = req.body;

    try {
        if (!receiverInput || !receiverInput.includes('#')) {
            return res.status(400).json({ error: 'Lütfen kullanıcı adını etiket ile birlikte yaz (Örn: isim#1234).' });
        }

        if (!senderFullUsername || !senderFullUsername.includes('#')) {
            return res.status(400).json({ error: 'Oturum bilgisi eksik, lütfen tekrar giriş yapın.' });
        }

        const [receiverName, receiverTag] = receiverInput.split('#');
        const [senderName, senderTag] = senderFullUsername.split('#');

        if (senderFullUsername === receiverInput) {
            return res.status(400).json({ error: 'Kendine arkadaşlık isteği gönderemezsin!' });
        }

        const senderResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [senderName, senderTag]);
        const receiverResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [receiverName, receiverTag]);

        if (senderResult.rows.length === 0 || receiverResult.rows.length === 0) {
            return res.status(404).json({ error: 'Böyle bir kullanıcı bulunamadı.' });
        }

        const senderId = senderResult.rows[0].id;
        const receiverId = receiverResult.rows[0].id;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Kendine arkadaşlık isteği gönderemezsin!' });
        }

        const checkRequest = await pool.query(
            'SELECT * FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status != $3',
            [senderId, receiverId, 'rejected']
        );

        if (checkRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Bu kullanıcıyla zaten bekleyen bir isteğiniz veya arkadaşlığınız var.' });
        }

        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
            [senderId, receiverId, 'pending']
        );

        res.json({ message: 'Arkadaşlık isteği başarıyla gönderildi.' });
    } catch (err) {
        console.error('Arkadaşlık isteği hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 2. Gelen Bekleyen İstekleri Listeleme
router.get('/pending/:username/:tag', async (req, res) => {
    const { username, tag } = req.params;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        const requests = await pool.query(
            `SELECT fr.id, u.username, u.tag 
             FROM friend_requests fr 
             JOIN users u ON fr.sender_id = u.id 
             WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
            [userId]
        );

        res.json({ requests: requests.rows });
    } catch (err) {
        console.error('Bekleyenleri getirme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 3. İsteği Kabul Et veya Reddet
router.post('/respond', async (req, res) => {
    const { requestId, action } = req.body;

    try {
        if (action === 'accept') {
            await pool.query("UPDATE friend_requests SET status = 'accepted' WHERE id = $1", [requestId]);
            res.json({ message: 'Arkadaşlık isteği kabul edildi!' });
        } else if (action === 'reject') {
            await pool.query("DELETE FROM friend_requests WHERE id = $1", [requestId]);
            res.json({ message: 'Arkadaşlık isteği reddedildi.' });
        } else {
            res.status(400).json({ error: 'Geçersiz işlem.' });
        }
    } catch (err) {
        console.error('İstek yanıtlama hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 4. Kabul Edilmiş Arkadaşları ve Durumlarını Listeleme
router.get('/list/:username/:tag', async (req, res) => {
    const { username, tag } = req.params;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        const friends = await pool.query(
            `SELECT u.id, u.username, u.tag, u.status 
             FROM friend_requests fr 
             JOIN users u ON (CASE WHEN fr.sender_id = $1 THEN fr.receiver_id ELSE fr.sender_id END) = u.id 
             WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) AND fr.status = 'accepted'`,
            [userId]
        );

        res.json({ friends: friends.rows });
    } catch (err) {
        console.error('Arkadaş listesi getirme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 5. Arkadaşlıktan Çıkarma
router.post('/remove', async (req, res) => {
    const { username, tag, friendId } = req.body;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        await pool.query(
            `DELETE FROM friend_requests 
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
            [userId, friendId]
        );

        res.json({ message: 'Arkadaşlıktan çıkarıldı.' });
    } catch (err) {
        console.error('Arkadaş silme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 6. Kullanıcının Anlık Durumunu Güncelleme
router.post('/update-status', async (req, res) => {
    const { username, tag, status } = req.body;

    try {
        await pool.query(
            'UPDATE users SET status = $1 WHERE username = $2 AND tag = $3',
            [status, username, tag]
        );
        res.json({ message: 'Durum güncellendi.' });
    } catch (err) {
        console.error('Durum güncelleme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 7. Kullanıcıyı Engelleme Rotası
router.post('/block', async (req, res) => {
    const { username, tag, friendId } = req.body;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        if (userId === parseInt(friendId)) {
            return res.status(400).json({ error: 'Kendini engelleyemezsin!' });
        }

        const existing = await pool.query(
            'SELECT * FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)',
            [userId, friendId]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                'UPDATE friend_requests SET status = $1 WHERE (sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)',
                ['blocked', userId, friendId]
            );
        } else {
            await pool.query(
                'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
                [userId, friendId, 'blocked']
            );
        }

        res.json({ message: 'Kullanıcı engellendi.' });
    } catch (err) {
        console.error('Engelleme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 8. Engeli Kaldırma Rotası
router.post('/unblock', async (req, res) => {
    const { username, tag, friendId } = req.body;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        await pool.query(
            'DELETE FROM friend_requests WHERE status = $1 AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))',
            ['blocked', userId, friendId]
        );

        res.json({ message: 'Kullanıcının engeli kaldırıldı.' });
    } catch (err) {
        console.error('Engeli kaldırma hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// 9. 🚀 Eksik Olan: Engellenenleri Listeleme Rotası
router.get('/blocked/:username/:tag', async (req, res) => {
    const { username, tag } = req.params;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const userId = userResult.rows[0].id;

        const blockedUsers = await pool.query(
            `SELECT u.id, u.username, u.tag 
             FROM friend_requests fr 
             JOIN users u ON (CASE WHEN fr.sender_id = $1 THEN fr.receiver_id ELSE fr.sender_id END) = u.id 
             WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) AND fr.status = 'blocked'`,
            [userId]
        );

        res.json({ blocked: blockedUsers.rows });
    } catch (err) {
        console.error('Engellenenleri getirme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

module.exports = router;