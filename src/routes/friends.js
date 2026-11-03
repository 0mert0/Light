const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

// Arkadaşlık isteği gönder
router.post('/send-request', friendController.sendFriendRequest);

// Bekleyen istekleri listele
router.get('/pending/:username/:tag', friendController.getPendingRequests);

// Arkadaşlık isteğini kabul et veya reddet
router.post('/respond', friendController.respondToRequest);

// Ekli arkadaşlar listesi
router.get('/list/:username/:tag', friendController.getAcceptedFriends);

// Engellenenler listesi
router.get('/blocked/:username/:tag', friendController.getBlockedUsers);

// Arkadaşlıktan çıkar, engelle ve engeli kaldır
router.post('/remove', friendController.removeFriend);
router.post('/block', friendController.blockFriend);
router.post('/unblock', friendController.unblockUser);

module.exports = router;