document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcı Adı Yükleme
    const currentUsername = localStorage.getItem('light_username') || sessionStorage.getItem('light_username') || "Mertt";
    document.getElementById('accountName').textContent = currentUsername;
    document.getElementById('accountAvatar').textContent = currentUsername.charAt(0).toUpperCase();

    // Çıkış Butonu İşlevi
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    });

    // Ayarlar Butonu İşlevi
    document.getElementById('settingsBtn').addEventListener('click', () => {
        alert('Ayarlar yakında eklenecek!');
    });

    // Durum Menüsünü Aç / Kapat
    const statusToggleBtn = document.getElementById('statusToggleBtn');
    const statusMenu = document.getElementById('statusMenu');

    statusToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        statusMenu.classList.toggle('show');
    });

    // Menü Dışına Tıklandığında Kapatma
    window.addEventListener('click', () => {
        statusMenu.classList.remove('show');
    });
});

// Durum Değiştirme Fonksiyonu
function setStatus(statusName, colorHex) {
    document.getElementById('statusText').textContent = statusName;
    document.getElementById('statusDot').style.backgroundColor = colorHex;
    document.getElementById('statusMenu').classList.remove('show');
}

// Üst Sekmeler Arası Geçiş Fonksiyonu
function switchHeaderTab(element, title) {
    document.querySelectorAll('.top-header .tab-btn').forEach(btn => {
        if (!btn.classList.contains('add-btn')) btn.classList.remove('active');
    });
    if (!element.classList.contains('add-btn')) {
        element.classList.add('active');
    }
    document.getElementById('panelTitle').textContent = title + ' Listesi';
}