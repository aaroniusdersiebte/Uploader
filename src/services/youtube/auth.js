const { BrowserWindow, dialog, net } = require('electron');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class YouTubeAuthService {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = this.loadConfig();
    this.oAuth2Client = null;
    this.server = null;
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

    // Erstelle OAuth2 Client mit localhost Redirect
    this.oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:8080/oauth2callback'
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
      // Starte lokalen Server für Callback
      const server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url, true);
          
          if (parsedUrl.pathname === '/oauth2callback') {
            // Response an Benutzer senden
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="background-color: #1A1A1A; color: white; font-family: Arial; text-align: center; padding-top: 50px;">
                  <h2>Authentifizierung erfolgreich!</h2>
                  <p>Sie können dieses Fenster jetzt schließen und zur App zurückkehren.</p>
                </body>
              </html>
            `);
            
            // Code aus der URL extrahieren
            const code = parsedUrl.query.code;
            
            if (code) {
              try {
                // Tokens erhalten
                const { tokens } = await this.oAuth2Client.getToken(code);
                this.oAuth2Client.setCredentials(tokens);
                
                // Tokens speichern
                this.config.credentials.youtube.refreshToken = tokens.refresh_token || this.config.credentials.youtube.refreshToken;
                this.config.credentials.youtube.accessToken = tokens.access_token;
                this.saveConfig();
                
                // Server beenden & Promise auflösen
                server.close();
                resolve();
              } catch (err) {
                server.close();
                reject(new Error(`Fehler beim Token erhalten: ${err.message}`));
              }
            } else {
              server.close();
              reject(new Error('Kein Autorisierungscode in der Antwort gefunden'));
            }
          }
        } catch (err) {
          console.error('Server Fehler:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<html><body>Fehler: ${err.message}</body></html>`);
        }
      }).listen(8080);
      
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
      
      // Öffne URL im Standard-Browser
      shell.openExternal(authUrl);
      
      // Dialog für Benutzerhinweis anzeigen
      dialog.showMessageBox(parentWindow, {
        type: 'info',
        title: 'YouTube Authentifizierung',
        message: 'Ein Browser-Fenster wurde geöffnet. Bitte melden Sie sich bei Google an und erlauben Sie den Zugriff.',
        detail: 'Nach erfolgreicher Anmeldung werden Sie zu einer lokalen Seite weitergeleitet. Die App wird dann automatisch fortgesetzt.',
        buttons: ['OK']
      });
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