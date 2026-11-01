function injectAddFriendModal() {
    if (document.getElementById('addFriendModal')) return;

    const modalHTML = `
        <div id="addFriendModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); justify-content:center; align-items:center; z-index:1000;">
            <div style="background:#fff; padding:25px; border-radius:12px; width:400px; box-shadow:0 4px 20px rgba(0,0,0,0.15);">
                <h3 style="margin-bottom:10px; color:#1e293b; font-size:18px;">Arkadaş Ekle</h3>
                <p style="font-size:13px; color:#64748b; margin-bottom:15px;">Arkadaşının kullanıcı adını ve etiketini yaz (Örn: <b>Mertt#1453</b>)</p>
                <input type="text" id="targetUsernameInput" placeholder="KullanıcıAdı#1234" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; outline:none; margin-bottom:15px; font-size:14px;">
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button id="closeModalBtn" style="padding:8px 14px; background:#f1f5f9; border:none; border-radius:6px; color:#475569; font-weight:600; cursor:pointer;">İptal</button>
                    <button id="sendRequestBtn" style="padding:8px 14px; background:#10b981; border:none; border-radius:6px; color:white; font-weight:600; cursor:pointer;">İstek Gönder</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('addFriendModal').style.display = 'none';
        document.getElementById('targetUsernameInput').value = '';
    });

    document.getElementById('sendRequestBtn').addEventListener('click', async () => {
        const receiverInput = document.getElementById('targetUsernameInput').value.trim();
        
        // localStorage veya sessionStorage'dan kullanıcı adı ve tag'i güvenli şekilde alıp birleştiriyoruz
        const username = localStorage.getItem('light_username') || sessionStorage.getItem('light_username');
        const tag = localStorage.getItem('light_tag') || sessionStorage.getItem('light_tag');

        if (!username || !tag) {
            alert('Oturum bilgisi bulunamadı, lütfen tekrar giriş yap.');
            window.location.href = 'index.html';
            return;
        }

        const senderFullUsername = `${username}#${tag}`;

        if (!receiverInput) {
            alert('Lütfen kullanıcı adı ve etiketini girin.');
            return;
        }

        try {
            const response = await fetch('/api/friends/send-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderFullUsername,
                    receiverInput
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                document.getElementById('targetUsernameInput').value = '';
                document.getElementById('addFriendModal').style.display = 'none';
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Sunucuya bağlanırken bir hata oluştu.');
        }
    });
}

window.openAddFriendModal = function() {
    injectAddFriendModal();
    document.getElementById('addFriendModal').style.display = 'flex';
};