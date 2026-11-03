const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar src/public klasöründen sunulur
app.use(express.static(path.join(__dirname, 'public')));

// Rotalar
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// Ana sayfa yönlendirmesi (src/public/index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla çalışıyor!`);
});