// Prüfen, ob SettingsPage bereits existiert, um doppelte Deklaration zu vermeiden
if (typeof SettingsPage === 'undefined') {
  class SettingsPage {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.init();
    }
  
    init() {
      this.render();
      this.attachEventListeners();
      this.loadApiSettings();
    }
  
    render() {
      if (!this.container) return;
  
      this.container.innerHTML = `
        <div class="settings-page">
          <h2>YouTube API Einstellungen</h2>
          
          <div class="form-section">
            <div class="form-group">
              <label for="client-id">Client ID</label>
              <input type="text" id="client-id" class="form-control" placeholder="Google API Client ID">
            </div>
            
            <div class="form-group">
              <label for="client-secret">Client Secret</label>
              <input type="password" id="client-secret" class="form-control" placeholder="Google API Client Secret">
            </div>
            
            <div class="form-group">
              <label for="api-key">API Key</label>
              <input type="text" id="api-key" class="form-control" placeholder="Google API Key">
            </div>
            
            <button id="save-api-settings" class="primary-button">Einstellungen speichern</button>
          </div>
          
          <div class="form-section">
            <h3>YouTube Verbindung</h3>
            <div id="auth-status" class="auth-status">
              <div class="status-indicator disconnected"></div>
              <span>Nicht verbunden</span>
            </div>
            
            <button id="youtube-auth-btn" class="primary-button">Bei YouTube anmelden</button>
          </div>
        </div>
      `;
    }
  
    attachEventListeners() {
      const saveApiSettingsBtn = document.getElementById('save-api-settings');
      const youtubeAuthBtn = document.getElementById('youtube-auth-btn');
      
      if (saveApiSettingsBtn) {
        saveApiSettingsBtn.addEventListener('click', () => this.saveApiSettings());
      }
      
      if (youtubeAuthBtn) {
        youtubeAuthBtn.addEventListener('click', () => this.authenticateYouTube());
      }
    }
  
    async loadApiSettings() {
      try {
        const clientIdInput = document.getElementById('client-id');
        const clientSecretInput = document.getElementById('client-secret');
        const apiKeyInput = document.getElementById('api-key');
        
        // In einer echten App würden wir hier die gespeicherten Einstellungen laden
        if (window.app && window.app.getApiSettings) {
          console.log("Lade API-Einstellungen...");
          const settings = await window.app.getApiSettings();
          console.log("API-Einstellungen geladen:", settings);
          
          if (clientIdInput) clientIdInput.value = settings.clientId || '';
          if (clientSecretInput) clientSecretInput.value = settings.clientSecret || '';
          if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
        } else {
          console.error("window.app.getApiSettings ist nicht verfügbar");
        }
        
        // Prüfen, ob wir bereits authentifiziert sind
        this.updateAuthStatus();
      } catch (error) {
        console.error('Fehler beim Laden der API-Einstellungen:', error);
      }
    }
  
    async updateAuthStatus() {
      const authStatus = document.getElementById('auth-status');
      const youtubeAuthBtn = document.getElementById('youtube-auth-btn');
      
      if (authStatus && youtubeAuthBtn) {
        try {
          if (window.youtube && window.youtube.checkAuth) {
            console.log("Prüfe Auth-Status...");
            const isAuthenticated = await window.youtube.checkAuth();
            console.log("Auth-Status:", isAuthenticated);
            
            if (isAuthenticated) {
              authStatus.innerHTML = `
                <div class="status-indicator connected"></div>
                <span>Mit YouTube verbunden</span>
              `;
              youtubeAuthBtn.textContent = 'Verbindung trennen';
            } else {
              authStatus.innerHTML = `
                <div class="status-indicator disconnected"></div>
                <span>Nicht verbunden</span>
              `;
              youtubeAuthBtn.textContent = 'Bei YouTube anmelden';
            }
          } else {
            console.error("window.youtube.checkAuth ist nicht verfügbar");
          }
        } catch (error) {
          console.error('Fehler beim Prüfen des Authentifizierungsstatus:', error);
        }
      }
    }
  
    async saveApiSettings() {
      const clientId = document.getElementById('client-id').value;
      const clientSecret = document.getElementById('client-secret').value;
      const apiKey = document.getElementById('api-key').value;
      
      try {
        if (window.app && window.app.saveApiConfig) {
          console.log("Speichere API-Einstellungen:", { clientId, clientSecret, apiKey });
          const result = await window.app.saveApiConfig({ clientId, clientSecret, apiKey });
          console.log("Ergebnis:", result);
          
          if (result.success) {
            alert('API-Einstellungen erfolgreich gespeichert!');
          } else {
            alert(`Fehler beim Speichern der API-Einstellungen: ${result.error}`);
          }
        } else {
          console.error("window.app.saveApiConfig ist nicht verfügbar");
          alert('Die Funktion zum Speichern der API-Einstellungen ist nicht verfügbar.');
        }
      } catch (error) {
        console.error('Fehler beim Speichern der API-Einstellungen:', error);
        alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      }
    }
  
    async authenticateYouTube() {
      try {
        if (window.youtube && window.youtube.authenticate) {
          console.log("Starte YouTube-Authentifizierung");
          const result = await window.youtube.authenticate();
          console.log("Auth-Ergebnis:", result);
          
          if (result && result.success) {
            alert('Erfolgreich bei YouTube angemeldet!');
          } else {
            alert(`Authentifizierung fehlgeschlagen: ${result?.error || 'Unbekannter Fehler'}`);
          }
          
          this.updateAuthStatus();
        } else {
          console.error("window.youtube.authenticate ist nicht verfügbar");
          alert('Die YouTube-Authentifizierungsfunktion ist nicht verfügbar.');
        }
      } catch (error) {
        console.error('Fehler bei der YouTube-Authentifizierung:', error);
        alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      }
    }
  }
  
  // Exportieren für die Verwendung in anderen Dateien
  if (typeof module !== 'undefined') {
    module.exports = SettingsPage;
  }
}