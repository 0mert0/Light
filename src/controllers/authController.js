const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || "light_secret_key_cok_gizli";

exports.register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsin.' });
    } catch (err) {
        res.status(400).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı!' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Giriş başarılı!', token });
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};