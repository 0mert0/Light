const pool = require('../config/db');

// Arkadaşlık isteği gönder (Username#Tag ile)
exports.sendFriendRequest = async (req, res) => {
    const senderId = req.body.senderId; // İstek atan kullanıcının ID'si
    const { targetUsername, targetTag } = req.body; // Eklenmek istenen kişinin adı ve etiketi

    try {
        // 1. Hedef kullanıcıyı bul
        const targetUserQuery = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND tag = $2',
            [targetUsername, targetTag]
        );

        if (targetUserQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Bu kullanıcı adı ve etikete sahip kimse bulunamadı!' });
        }

        const receiverId = targetUserQuery.rows[0].id;

        if (senderId === receiverId) {
            return res.status(400).json({ message: 'Kendine arkadaşlık isteği atamazsın kanka!' });
        }

        // 2. Daha önce istek atılmış mı kontrol et
        const existingRequest = await pool.query(
            'SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2',
            [senderId, receiverId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ message: 'Bu kullanıcıya zaten arkadaşlık isteği göndermişsin!' });
        }

        // 3. İsteği veritabanına kaydet
        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
            [senderId, receiverId, 'pending']
        );

        res.status(200).json({ message: 'Arkadaşlık isteği başarıyla gönderildi!' });
    } catch (err) {
        console.error('Arkadaşlık isteği hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// Bekleyen istekleri listele
exports.getPendingRequests = async (req, res) => {
    const userId = req.params.userId;

    try {
        const requests = await pool.query(
            `SELECT fr.id, u.username, u.tag, fr.sender_id 
             FROM friend_requests fr 
             JOIN users u ON fr.sender_id = u.id 
             WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
            [userId]
        );

        res.status(200).json({ requests: requests.rows });
    } catch (err) {
        console.error('İstekleri getirme hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// İsteği Kabul Et veya Reddet
exports.respondToRequest = async (req, res) => {
    const { requestId, status } = req.body; // status: 'accepted' veya 'rejected'

    try {
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Geçersiz işlem!' });
        }

        await pool.query(
            'UPDATE friend_requests SET status = $1 WHERE id = $2',
            [status, requestId]
        );

        res.status(200).json({ message: status === 'accepted' ? 'İstek kabul edildi!' : 'İstek reddedildi.' });
    } catch (err) {
        console.error('İstek yanıtlama hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};