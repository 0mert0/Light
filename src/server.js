const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createUserTable } = require('./models/User');
const pool = require('./config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SECRET_KEY = process.env.JWT_SECRET || "light_secret_key_cok_gizli";

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Veritabanı tablosunu oluştur
createUserTable();

// --- AUTH ROTALARI ---
const authRouter = express.Router();

// Kayıt Ol (Email, Kullanıcı Adı, Şifre)
authRouter.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsin.' });
    } catch (err) {
        res.status(400).json({ message: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
    }
});

// Giriş Yap (Kullanıcı Adı veya Email ile)
authRouter.post('/login', async (req, res) => {
    const { loginIdentifier, password } = req.body;
    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [loginIdentifier]
        );
        if (userResult.rows.length === 0) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı!' });

        const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Giriş başarılı!', token });
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

app.use('/api/auth', authRouter);

// Socket.IO Gerçek Zamanlı Mesajlaşma
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('chat_message', (data) => {
        io.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Light sunucusu çalışıyor: http://localhost:${PORT}`);
});