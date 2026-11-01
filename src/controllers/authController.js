const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Rastgele 4 haneli tag üret (Örn: #4819)
        const tag = Math.floor(1000 + Math.random() * 9000).toString();

        // Şifreyi güvenli bir şekilde hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Veritabanına kaydet
        const newUser = await pool.query(
            'INSERT INTO users (username, tag, email, password) VALUES ($1, $2, $3, $4) RETURNING id, username, tag, email',
            [username, tag, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Kayıt başarılı!',
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error('Kayıt hatası:', err);
        
        // PostgreSQL benzersizlik (unique) kısıtlaması hatası (code: 23505)
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda!' });
        }

        res.status(500).json({ message: 'Sunucu hatası, kayıt oluşturulamadı.' });
    }
};

exports.login = async (req, res) => {
    // Frontend'den hangi isimle gelirse gelsin yakala (email, username veya loginIdentifier)
    const loginIdentifier = req.body.loginIdentifier || req.body.email || req.body.username;
    const { password } = req.body;

    try {
        if (!loginIdentifier || !password) {
            return res.status(400).json({ message: 'Lütfen tüm alanları doldurun!' });
        }

        // Kullanıcıyı e-posta veya kullanıcı adına göre bul
        const userQuery = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [loginIdentifier, loginIdentifier]
        );

        if (userQuery.rows.length === 0) {
            return res.status(400).json({ message: 'Kullanıcı bulunamadı!' });
        }

        const user = userQuery.rows[0];

        // Şifreyi doğrula
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Şifre hatalı!' });
        }

        res.status(200).json({
            message: 'Giriş başarılı!',
            user: {
                id: user.id,
                username: user.username,
                tag: user.tag,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Giriş hatası:', err);
        res.status(500).json({ message: 'Sunucu hatası, giriş yapılamadı.' });
    }
};