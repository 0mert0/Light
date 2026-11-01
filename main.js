const { app, BrowserWindow } = require('electron');
const path = require('path');

// Sunucumuzu doğrudan Electron içerisinden başlatıyoruz
require('./src/server.js');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Light App",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Sunucunun ayağa kalkması için 1 saniye bekleyip sayfayı yüklüyoruz
  setTimeout(() => {
    win.loadURL('http://localhost:3000');
  }, 1000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});