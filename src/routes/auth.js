const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 🚀 public/uploads klasörü yoksa otomatik oluştur
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Ayarları (Profil Fotoğrafı İçin)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Profil Güncelleme Rotası
router.post('/update-profile', upload.single('avatarFile'), async (req, res) => {
    const { currentUsername, currentTag, newUsername } = req.body;
    let newAvatar = req.body.newAvatar;

    if (req.file) {
        newAvatar = `/uploads/${req.file.filename}`;
    }

    try {
        if (newUsername) {
            const checkUser = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND tag = $2 AND NOT (username = $3 AND tag = $4)',
                [newUsername, currentTag, currentUsername, currentTag]
            );
            if (checkUser.rows.length > 0) {
                return res.status(400).json({ error: 'Bu kullanıcı adı ve etiket kombinasyonu zaten kullanımda.' });
            }
        }

        let query = 'UPDATE users SET ';
        let values = [];
        let index = 1;

        if (newUsername) {
            query += `username = $${index++}`;
            values.push(newUsername);
        }
        if (newAvatar !== undefined && newAvatar !== '') {
            if (newUsername) query += ', ';
            query += `avatar = $${index++}`;
            values.push(newAvatar);
        }

        query += ` WHERE username = $${index++} AND tag = $${index++} RETURNING *;`;
        values.push(currentUsername, currentTag);

        const updated = await pool.query(query, values);
        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        res.json({ success: true, user: updated.rows[0] });
    } catch (err) {
        console.error('Profil güncelleme hatası:', err);
        res.status(500).json({ error: 'Sunucu hatası oluştu: ' + err.message });
    }
});

module.exports = router;