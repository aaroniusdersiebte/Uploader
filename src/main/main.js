const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const YouTubeAuthService = require('../services/youtube/auth');
const YouTubeUploader = require('../services/youtube/uploader');
const { google } = require('googleapis');

// Globale Referenzen, um GC zu verhindern
let mainWindow;
let youtubeAuth;
let youtubeUploader;

// Pfad zur Konfiguration
const configPath = path.join(app.getPath('userData'), 'user-preferences.json');

// Erstelle/Prüfe Konfigurationsdatei
function ensureConfig() {
  try {
    // Wenn die Datei im User-Datenverzeichnis nicht existiert, kopiere aus dem config-Verzeichnis
    if (!fs.existsSync(configPath)) {
      const defaultConfigPath = path.join(__dirname, '../../config/user-preferences.json');
      if (fs.existsSync(defaultConfigPath)) {
        fs.copyFileSync(defaultConfigPath, configPath);
      } else {
        // Erstelle Standardkonfiguration
        const defaultConfig = {
          appearance: {
            accentColor: "#e39d4d",
            theme: "dark"
          },
          credentials: {
            youtube: {
              clientId: "",
              clientSecret: "",
              apiKey: "",
              refreshToken: "",
              accessToken: ""
            }
          }
        };
        
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      }
    }
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen der Konfiguration:', error);
    return false;
  }
}

// Fenster erstellen
const createWindow = () => {
  // Stelle sicher, dass Konfiguration existiert
  ensureConfig();
  
  // Initialisiere YouTube Auth-Service
  youtubeAuth = new YouTubeAuthService(configPath);
  
  // Initialisiere YouTube Uploader
  if (youtubeAuth.isAuthenticated()) {
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111111',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  // Lade die Index-HTML-Datei
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Fenster anzeigen, wenn geladen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Entwicklertools öffnen im Dev-Modus
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
};

// App ist bereit
app.whenReady().then(() => {
  createWindow();
  
  // MacOS: Fenster neu erstellen, wenn Dock-Icon angeklickt wird
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Verhindern, dass die App im Hintergrund weiterläuft
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('app:getApiSettings', async () => {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        clientId: config.credentials.youtube.clientId,
        clientSecret: config.credentials.youtube.clientSecret,
        apiKey: config.credentials.youtube.apiKey
      };
    } catch (error) {
      console.error('Fehler beim Laden der API-Einstellungen:', error);
      return { clientId: '', clientSecret: '', apiKey: '' };
    }
  });

// IPC-Events für YouTube-Authentifizierung
ipcMain.handle('youtube:checkAuth', async () => {
  return youtubeAuth.isAuthenticated();
});

ipcMain.handle('youtube:authenticate', async () => {
  try {
    await youtubeAuth.authenticate(mainWindow);
    // Nach erfolgreicher Authentifizierung den Uploader initialisieren
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC-Events für Video-Upload
ipcMain.handle('youtube:selectVideo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv'] }
    ]
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { 
    canceled: false, 
    filePath: result.filePaths[0],
    fileName: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('youtube:selectThumbnail', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }
    ]
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { 
    canceled: false, 
    filePath: result.filePaths[0],
    fileName: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('youtube:uploadVideo', async (event, { videoPath, metadata }) => {
  if (!youtubeUploader) {
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
  }
  
  try {
    const result = await youtubeUploader.uploadVideo(videoPath, metadata, progress => {
      // Sende Fortschritt an den Renderer-Prozess
      mainWindow.webContents.send('youtube:uploadProgress', progress);
    });
    
    return { success: true, videoId: result.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube:uploadThumbnail', async (event, { videoId, thumbnailPath }) => {
  if (!youtubeUploader) {
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
  }
  
  try {
    await youtubeUploader.setThumbnail(videoId, thumbnailPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube:getCategories', async () => {
  if (!youtubeUploader) {
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
  }
  
  try {
    const categories = await youtubeUploader.getVideoCategories();
    return { success: true, categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube:getPlaylists', async () => {
  if (!youtubeUploader) {
    youtubeUploader = new YouTubeUploader(youtubeAuth.getAuthClient());
  }
  
  try {
    const playlists = await youtubeUploader.getMyPlaylists();
    return { success: true, playlists };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC-Events für Theme und Einstellungen
ipcMain.handle('app:getTheme', () => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.appearance;
});

ipcMain.handle('app:setTheme', (event, theme) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.appearance.theme = theme;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:setAccentColor', (event, color) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.appearance.accentColor = color;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:saveApiConfig', (event, { clientId, clientSecret, apiKey }) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.credentials.youtube.clientId = clientId;
    config.credentials.youtube.clientSecret = clientSecret;
    config.credentials.youtube.apiKey = apiKey;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Neuen Auth-Service mit aktualisierten Anmeldedaten erstellen
    youtubeAuth = new YouTubeAuthService(configPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});