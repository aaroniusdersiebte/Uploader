const { BrowserWindow, dialog } = require('electron');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class YouTubeAuthService {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = this.loadConfig();
    this.oAuth2Client = null;
    // Flag, das angibt, ob der Code bereits übermittelt wurde
    this.codeSubmitted = false;
    this.setupOAuthClient();
  }

  loadConfig() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return {
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
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  setupOAuthClient() {
    if (!this.config || !this.config.credentials || !this.config.credentials.youtube) {
      console.error('Invalid configuration structure');
      return;
    }

    const { clientId, clientSecret } = this.config.credentials.youtube;
    
    if (!clientId || !clientSecret) {
      console.error('Missing YouTube API credentials');
      return;
    }

    this.oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    // Setze vorhandene Tokens, falls vorhanden
    const { refreshToken, accessToken } = this.config.credentials.youtube;
    if (refreshToken && accessToken) {
      this.oAuth2Client.setCredentials({
        refresh_token: refreshToken,
        access_token: accessToken
      });
    }
  }

  async authenticate(parentWindow) {
    if (!this.oAuth2Client) {
      throw new Error('OAuth client not initialized');
    }

    return new Promise((resolve, reject) => {
      // Generiere die Auth-URL
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl'
        ],
        prompt: 'consent'
      });

      // Öffne die URL im Standardbrowser
      shell.openExternal(authUrl);

      // Erstelle das Code-Eingabefenster
      const codeEntryWindow = new BrowserWindow({
        width: 500,
        height: 300,
        parent: parentWindow,
        modal: true,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      // Falls das Fenster geschlossen wird, bevor der Code verarbeitet wurde,
      // wird die Promise abgelehnt.
      codeEntryWindow.on('closed', () => {
        if (!this.codeSubmitted) {
          reject(new Error('Code entry window was closed'));
        }
      });

      // HTML-Inhalt für die Code-Eingabe (ohne automatisches Schließen des Fensters)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>YouTube Autorisierung</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #111;
                color: white;
                padding: 20px;
              }
              h2 {
                margin-top: 0;
              }
              .form-group {
                margin-bottom: 15px;
              }
              label {
                display: block;
                margin-bottom: 5px;
              }
              input[type="text"] {
                width: 100%;
                padding: 8px;
                box-sizing: border-box;
                background-color: #333;
                border: 1px solid #555;
                color: white;
                border-radius: 4px;
              }
              button {
                background-color: #e39d4d;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
              }
              button:hover {
                background-color: #d38d3d;
              }
            </style>
          </head>
          <body>
            <h2>YouTube Autorisierung</h2>
            <p>Bitte gib den Autorisierungscode ein, den du von Google erhalten hast:</p>
            <div class="form-group">
              <label for="authCode">Autorisierungscode:</label>
              <input type="text" id="authCode" placeholder="4/1Ab...">
            </div>
            <button id="submitBtn">Bestätigen</button>
            <script>
              const submitBtn = document.getElementById('submitBtn');
              const authCodeInput = document.getElementById('authCode');
              
              submitBtn.addEventListener('click', () => {
                const code = authCodeInput.value.trim();
                if (code) {
                  // Speichere den Code in einer globalen Variable, damit er von der Electron-App abgefragt werden kann.
                  window.codeValue = code;
                  alert('Code erfolgreich übermittelt!');
                  // Fenster wird hier NICHT geschlossen, damit die App den Code verarbeiten kann.
                } else {
                  alert('Bitte gib einen Code ein!');
                }
              });
            </script>
          </body>
        </html>
      `;

      // Lade den HTML-Inhalt in das Fenster
      codeEntryWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      codeEntryWindow.once('ready-to-show', () => {
        codeEntryWindow.show();
      });

      // Prüfe in regelmäßigen Abständen, ob der Code übermittelt wurde
      const checkForCode = () => {
        if (codeEntryWindow.isDestroyed()) return;

        codeEntryWindow.webContents.executeJavaScript('window.codeValue')
          .then(async (code) => {
            if (code) {
              try {
                const { tokens } = await this.oAuth2Client.getToken(code);
                this.oAuth2Client.setCredentials(tokens);
                
                // Speichere die neuen Tokens in der Config
                this.config.credentials.youtube.refreshToken = tokens.refresh_token || this.config.credentials.youtube.refreshToken;
                this.config.credentials.youtube.accessToken = tokens.access_token;
                this.saveConfig();
                
                // Setze Flag und schließe das Fenster erst nach erfolgreicher Verarbeitung
                this.codeSubmitted = true;
                if (!codeEntryWindow.isDestroyed()) {
                  codeEntryWindow.close();
                }
                resolve();
              } catch (error) {
                dialog.showErrorBox('Fehler', `Autorisierungsfehler: ${error.message}`);
                if (!codeEntryWindow.isDestroyed()) {
                  codeEntryWindow.close();
                }
                reject(error);
              }
            } else {
              setTimeout(checkForCode, 1000);
            }
          })
          .catch(error => {
            console.error('Error checking for code:', error);
            setTimeout(checkForCode, 1000);
          });
      };

      setTimeout(checkForCode, 1000);
    });
  }

  async getAccessToken() {
    if (!this.oAuth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const credentials = this.oAuth2Client.credentials;
    if (!credentials.access_token) {
      throw new Error('No access token available');
    }

    if (this.isTokenExpired()) {
      try {
        const { credentials: newCredentials } = await this.oAuth2Client.refreshAccessToken();
        this.oAuth2Client.setCredentials(newCredentials);
        
        this.config.credentials.youtube.accessToken = newCredentials.access_token;
        if (newCredentials.refresh_token) {
          this.config.credentials.youtube.refreshToken = newCredentials.refresh_token;
        }
        this.saveConfig();
      } catch (error) {
        throw new Error(`Failed to refresh token: ${error.message}`);
      }
    }

    return this.oAuth2Client.credentials.access_token;
  }

  isTokenExpired() {
    if (!this.oAuth2Client || !this.oAuth2Client.credentials) {
      return true;
    }
    
    const expiryDate = this.oAuth2Client.credentials.expiry_date;
    return !expiryDate || expiryDate <= Date.now();
  }

  getAuthClient() {
    return this.oAuth2Client;
  }

  isAuthenticated() {
    return !!(this.oAuth2Client && 
              this.oAuth2Client.credentials && 
              this.oAuth2Client.credentials.access_token &&
              this.oAuth2Client.credentials.refresh_token);
  }
}

module.exports = YouTubeAuthService;
