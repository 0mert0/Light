const pool = require('../config/db');

// Arkadaşlık isteği gönder
exports.sendFriendRequest = async (req, res) => {
    const { senderFullUsername, receiverInput } = req.body;

    try {
        const [senderUsername, senderTag] = senderFullUsername.split('#');
        const senderQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [senderUsername, senderTag]);
        if (senderQuery.rows.length === 0) return res.status(404).json({ error: 'Oturum açan kullanıcı bulunamadı.' });
        const senderId = senderQuery.rows[0].id;

        const [targetUsername, targetTag] = receiverInput.split('#');
        if (!targetUsername || !targetTag) {
            return res.status(400).json({ error: 'Lütfen geçerli bir KullanıcıAdi#Tag formatı girin.' });
        }

        const targetUserQuery = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND tag = $2',
            [targetUsername, targetTag]
        );

        if (targetUserQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bu kullanıcı adı ve etikete sahip kimse bulunamadı!' });
        }

        const receiverId = targetUserQuery.rows[0].id;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Kendine arkadaşlık isteği atamazsın kanka!' });
        }

        const existingRequest = await pool.query(
            'SELECT * FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)',
            [senderId, receiverId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Bu kullanıcıyla aranızda zaten bir ilişki veya istek var!' });
        }

        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
            [senderId, receiverId, 'pending']
        );

        res.status(200).json({ message: 'Arkadaşlık isteği başarıyla gönderildi!' });
    } catch (err) {
        console.error('Arkadaşlık isteği hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// Bekleyen istekleri listele
exports.getPendingRequests = async (req, res) => {
    const { username, tag } = req.params;

    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

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
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// İsteği Kabul Et veya Reddet
exports.respondToRequest = async (req, res) => {
    const { friendId, action } = req.body; // friendId aslında friend_requests tablosundaki satır ID'sidir
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    try {
        const updateResult = await pool.query(
            `UPDATE friend_requests SET status = $1 WHERE id = $2 RETURNING *`,
            [newStatus, friendId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ error: 'Arkadaşlık isteği veritabanında bulunamadı.' });
        }

        res.json({ success: true, message: action === 'accept' ? 'İstek kabul edildi.' : 'İstek reddedildi.' });
    } catch (err) {
        console.error("İstek yanıtlama hatası:", err);
        res.status(500).json({ error: 'İşlem gerçekleştirilemedi.' });
    }
};

// Kabul edilen arkadaşları listele
exports.getAcceptedFriends = async (req, res) => {
    const { username, tag } = req.params;
    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

        const friendsQuery = await pool.query(
            `SELECT u.id, u.username, u.tag, u.status, u.avatar 
             FROM friend_requests fr 
             JOIN users u ON (u.id = fr.sender_id OR u.id = fr.receiver_id) 
             WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) 
             AND fr.status = 'accepted' AND u.id != $1`,
            [userId]
        );

        res.status(200).json({ friends: friendsQuery.rows });
    } catch (err) {
        console.error('Arkadaş listesi hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// Engellenen kullanıcıları listele
exports.getBlockedUsers = async (req, res) => {
    const { username, tag } = req.params;
    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

        const blockedQuery = await pool.query(
            `SELECT u.id, u.username, u.tag 
             FROM friend_requests fr 
             JOIN users u ON u.id = fr.receiver_id 
             WHERE fr.sender_id = $1 AND fr.status = 'blocked'`,
            [userId]
        );

        res.status(200).json({ blocked: blockedQuery.rows });
    } catch (err) {
        console.error('Engellenenler listesi hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// Arkadaşlıktan çıkar
exports.removeFriend = async (req, res) => {
    const { username, tag, friendId } = req.body;
    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

        await pool.query(
            `DELETE FROM friend_requests WHERE status = 'accepted' AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
            [userId, friendId]
        );

        res.status(200).json({ message: 'Arkadaşlıktan çıkarıldı.' });
    } catch (err) {
        console.error('Arkadaşlıktan çıkarma hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// Arkadaşı engelle
exports.blockFriend = async (req, res) => {
    const { username, tag, friendId } = req.body;
    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

        await pool.query(
            `UPDATE friend_requests SET status = 'blocked' WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
            [userId, friendId]
        );

        res.status(200).json({ message: 'Kullanıcı engellendi.' });
    } catch (err) {
        console.error('Engelleme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// Engeli kaldır
exports.unblockUser = async (req, res) => {
    const { username, tag, friendId } = req.body;
    try {
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        const userId = userQuery.rows[0].id;

        await pool.query(
            `DELETE FROM friend_requests WHERE status = 'blocked' AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
            [userId, friendId]
        );

        res.status(200).json({ message: 'Engel kaldırıldı.' });
    } catch (err) {
        console.error('Engel kaldırma hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};