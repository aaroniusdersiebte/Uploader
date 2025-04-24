// Prüfen, ob UploadForm bereits existiert, um doppelte Deklaration zu vermeiden
if (typeof UploadForm === 'undefined') {
  class UploadForm {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.videoFile = null;
      this.thumbnailFile = null;
      this.uploadInProgress = false;
      this.init();
    }
  
    init() {
      this.render();
      this.attachEventListeners();
    }
  
    render() {
      if (!this.container) return;
  
      this.container.innerHTML = `
        <div class="upload-form">
          <h2>Video auf YouTube hochladen</h2>
          
          <div class="form-section">
            <h3>1. Video auswählen</h3>
            <div class="file-drop-area" id="video-drop-area">
              <div class="file-message">Video hierher ziehen oder</div>
              <button id="select-video-btn" class="secondary-button">Video auswählen</button>
              <div id="selected-video-info" class="selected-file-info"></div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>2. Video-Details</h3>
            <div class="form-group">
              <label for="video-title">Titel*</label>
              <input type="text" id="video-title" class="form-control" placeholder="Gib deinem Video einen Namen" required>
            </div>
            
            <div class="form-group">
              <label for="video-description">Beschreibung</label>
              <textarea id="video-description" class="form-control" rows="4" placeholder="Beschreibe dein Video (Unterstützt Links, Hashtags und Timestamps)"></textarea>
            </div>
            
            <div class="form-group">
              <label for="video-tags">Tags (mit Komma getrennt)</label>
              <input type="text" id="video-tags" class="form-control" placeholder="tag1, tag2, tag3">
            </div>
          </div>
          
          <div class="form-section">
            <h3>3. Thumbnail</h3>
            <div class="thumbnail-section">
              <div class="thumbnail-preview" id="thumbnail-preview">
                <div class="thumbnail-placeholder">Keine Vorschau</div>
              </div>
              <button id="select-thumbnail-btn" class="secondary-button">Thumbnail auswählen</button>
            </div>
          </div>
          
          <div class="form-section">
            <h3>4. Einstellungen</h3>
            
            <div class="form-group">
              <label for="privacy-setting">Sichtbarkeit</label>
              <select id="privacy-setting" class="form-control">
                <option value="private">Privat</option>
                <option value="unlisted">Nicht gelistet</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="video-category">Kategorie</label>
              <select id="video-category" class="form-control">
                <option value="1">Film & Animation</option>
                <option value="2">Autos & Fahrzeuge</option>
                <option value="10">Musik</option>
                <option value="15">Tiere</option>
                <option value="17">Sport</option>
                <option value="20">Gaming</option>
                <option value="22" selected>Menschen & Blogs</option>
                <option value="23">Komödie</option>
                <option value="24">Unterhaltung</option>
                <option value="25">Nachrichten & Politik</option>
                <option value="26">Praktische Tipps & Styling</option>
                <option value="27">Bildung</option>
                <option value="28">Wissenschaft & Technik</option>
              </select>
            </div>
            
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" id="made-for-kids" name="made-for-kids">
                Dieses Video ist für Kinder gemacht
              </label>
            </div>
            
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" id="allow-comments" name="allow-comments" checked>
                Kommentare erlauben
              </label>
            </div>
          </div>
          
          <div class="form-actions">
            <button id="cancel-upload-btn" class="cancel-button">Abbrechen</button>
            <button id="start-upload-btn" class="primary-button" disabled>Hochladen starten</button>
          </div>
        </div>
      `;
    }
  
    attachEventListeners() {
      const selectVideoBtn = document.getElementById('select-video-btn');
      const selectThumbnailBtn = document.getElementById('select-thumbnail-btn');
      const startUploadBtn = document.getElementById('start-upload-btn');
      const cancelUploadBtn = document.getElementById('cancel-upload-btn');
      const videoTitle = document.getElementById('video-title');
      const videoDropArea = document.getElementById('video-drop-area');
      
      // Video auswählen über Dialog
      if (selectVideoBtn) {
        selectVideoBtn.addEventListener('click', async () => {
          try {
            console.log("Video auswählen geklickt");
            
            if (window.youtube && window.youtube.selectVideo) {
              console.log("youtube.selectVideo ist verfügbar");
              const result = await window.youtube.selectVideo();
              
              if (!result.canceled) {
                console.log("Video ausgewählt:", result);
                this.videoFile = {
                  name: result.fileName,
                  path: result.filePath
                };
                
                // Aktualisiere die UI
                const fileInfo = document.getElementById('selected-video-info');
                if (fileInfo) {
                  fileInfo.innerHTML = `
                    <div class="file-icon">📹</div>
                    <div class="file-details">
                      <div class="file-name">${this.videoFile.name}</div>
                      <div class="file-meta">${result.filePath}</div>
                    </div>
                  `;
                }
                
                // Upload-Button aktivieren wenn ein Titel eingegeben wurde
                if (startUploadBtn && videoTitle) {
                  startUploadBtn.disabled = !videoTitle.value.trim();
                }
              }
            } else {
              console.error("youtube.selectVideo ist NICHT verfügbar");
              alert('Video-Auswahl-Funktion nicht verfügbar');
            }
          } catch (error) {
            console.error('Fehler bei der Video-Auswahl:', error);
            alert('Fehler bei der Video-Auswahl: ' + error.message);
          }
        });
      }
      
      // Video per Drag & Drop
      if (videoDropArea) {
        videoDropArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          videoDropArea.classList.add('drag-over');
        });
        
        videoDropArea.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          videoDropArea.classList.remove('drag-over');
        });
        
        videoDropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          videoDropArea.classList.remove('drag-over');
          
          if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('video/')) {
              this.handleSelectedVideo({
                name: file.name,
                path: file.path,
                size: this.formatFileSize(file.size),
                type: file.type
              });
            }
          }
        });
      }
      
      // Thumbnail auswählen
      if (selectThumbnailBtn) {
        selectThumbnailBtn.addEventListener('click', async () => {
          try {
            if (window.youtube && window.youtube.selectThumbnail) {
              const result = await window.youtube.selectThumbnail();
              
              if (!result.canceled) {
                this.thumbnailFile = {
                  name: result.fileName,
                  path: result.filePath
                };
                
                const thumbnailPreview = document.getElementById('thumbnail-preview');
                if (thumbnailPreview) {
                  thumbnailPreview.innerHTML = `
                    <div class="thumbnail-img">
                      <div class="placeholder-thumbnail" style="background-color: var(--accent-color);">
                        <span>Thumbnail: ${this.thumbnailFile.name}</span>
                      </div>
                    </div>
                  `;
                }
              }
            }
          } catch (error) {
            console.error('Fehler beim Auswählen des Thumbnails:', error);
            alert('Fehler beim Auswählen des Thumbnails: ' + error.message);
          }
        });
      }
      
      // Upload starten-Knopf aktivieren, wenn ein Titel eingegeben wurde
      if (videoTitle && startUploadBtn) {
        videoTitle.addEventListener('input', () => {
          startUploadBtn.disabled = !videoTitle.value.trim() || !this.videoFile;
        });
      }
      
      // Upload starten
      if (startUploadBtn) {
        startUploadBtn.addEventListener('click', async () => {
          if (!this.videoFile) {
            alert('Bitte wähle zuerst ein Video aus');
            return;
          }
          
          try {
            // Sammle die Metadaten aus dem Formular
            const metadata = {
              title: document.getElementById('video-title').value,
              description: document.getElementById('video-description').value,
              tags: document.getElementById('video-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
              privacy: document.getElementById('privacy-setting').value,
              categoryId: document.getElementById('video-category').value,
              madeForKids: document.getElementById('made-for-kids').checked,
              allowComments: document.getElementById('allow-comments').checked
            };
            
            // Zeige Lade-Overlay
            this.showUploadOverlay();
            
            console.log("Upload starten mit:", {
              videoPath: this.videoFile.path,
              metadata: metadata
            });
            
            if (window.youtube && window.youtube.uploadVideo) {
              // Registriere Fortschritts-Callback
              let progressUnsubscribe;
              if (window.youtube.onUploadProgress) {
                progressUnsubscribe = window.youtube.onUploadProgress(progress => {
                  this.updateUploadProgress(progress);
                });
              }
              
              // Führe den Upload durch
              const result = await window.youtube.uploadVideo({
                videoPath: this.videoFile.path,
                metadata: metadata
              });
              
              console.log("Upload-Ergebnis:", result);
              
              if (result.success) {
                // Erfolg - Wenn Thumbnail vorhanden, lade es auch hoch
                if (this.thumbnailFile && window.youtube.uploadThumbnail) {
                  await window.youtube.uploadThumbnail({
                    videoId: result.videoId,
                    thumbnailPath: this.thumbnailFile.path
                  });
                }
                
                this.handleUploadSuccess(result.videoId);
              } else {
                throw new Error(result.error || 'Unbekannter Fehler beim Upload');
              }
              
              // Unsubscribe vom Fortschritts-Event
              if (progressUnsubscribe) {
                progressUnsubscribe();
              }
            } else {
              console.error("window.youtube.uploadVideo ist nicht verfügbar");
              alert('Upload-Funktion nicht verfügbar. Bitte überprüfen Sie die YouTube-API-Konfiguration.');
            }
          } catch (error) {
            console.error('Fehler beim Upload:', error);
            this.handleUploadError(error.message);
          }
        });
      }
      
      // Upload abbrechen
      if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', () => this.cancelUpload());
      }
    }
    
    handleSelectedVideo(videoInfo) {
      this.videoFile = videoInfo;
      
      const fileInfo = document.getElementById('selected-video-info');
      if (fileInfo) {
        fileInfo.innerHTML = `
          <div class="file-icon">📹</div>
          <div class="file-details">
            <div class="file-name">${videoInfo.name}</div>
            <div class="file-meta">${videoInfo.size || 'Unbekannte Größe'} ${videoInfo.duration ? '• ' + videoInfo.duration : ''}</div>
          </div>
        `;
        
        // Upload-Button aktivieren, wenn ein Titel eingegeben wurde
        const videoTitle = document.getElementById('video-title');
        const startUploadBtn = document.getElementById('start-upload-btn');
        if (startUploadBtn && videoTitle) {
          startUploadBtn.disabled = !videoTitle.value.trim();
        }
      }
    }
    
    showUploadOverlay() {
      // Erstelle Upload-Overlay dynamisch
      const overlay = document.createElement('div');
      overlay.className = 'upload-overlay';
      overlay.id = 'upload-overlay';
      overlay.innerHTML = `
        <div class="overlay-container">
          <div class="overlay-close" id="overlay-close">×</div>
          <h2>Uploading to YouTube</h2>
          
          <div class="progress-section">
            <div class="progress-circle">
              <svg class="progress-svg" viewBox="0 0 100 100">
                <circle class="progress-circle-bg" cx="50" cy="50" r="48"></circle>
                <circle class="progress-circle-fill" cx="50" cy="50" r="48"></circle>
              </svg>
              <div class="progress-percentage">0%</div>
            </div>
            
            <div class="progress-details">
              <div class="upload-file">${this.videoFile.name}</div>
              <div class="upload-status">Uploading...</div>
              <div class="upload-time">Initialisiere...</div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // "X" zum Schließen
      const closeBtn = document.getElementById('overlay-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          // Frage, ob der Upload wirklich abgebrochen werden soll
          if (confirm('Möchtest du den Upload wirklich abbrechen?')) {
            this.cancelUpload();
          }
        });
      }
    }
    
    updateUploadProgress(progress) {
      const progressCircle = document.querySelector('.progress-circle-fill');
      const progressText = document.querySelector('.progress-percentage');
      const uploadStatus = document.querySelector('.upload-status');
      const uploadTime = document.querySelector('.upload-time');
      
      if (progressCircle && progressText) {
        const dashOffset = 301 - (301 * progress.progress / 100);
        progressCircle.style.strokeDashoffset = dashOffset;
        progressText.textContent = `${progress.progress}%`;
        
        if (uploadStatus && progress.status) {
          uploadStatus.textContent = progress.status;
        }
        
        if (uploadTime && progress.timeRemaining) {
          uploadTime.textContent = progress.timeRemaining;
        }
        
        // Bei 100% zeige "Verarbeitung..." an
        if (progress.progress >= 100 && uploadStatus) {
          uploadStatus.textContent = 'Verarbeitung...';
          if (uploadTime) {
            uploadTime.textContent = 'Das Video wird von YouTube verarbeitet';
          }
        }
      }
    }
    
    handleUploadSuccess(videoId) {
      const overlay = document.getElementById('upload-overlay');
      if (overlay) {
        const overlayContainer = overlay.querySelector('.overlay-container');
        if (overlayContainer) {
          overlayContainer.innerHTML = `
            <h2>Upload erfolgreich!</h2>
            <div class="success-animation">
              <div class="success-checkmark">✓</div>
            </div>
            <p>Dein Video wurde erfolgreich hochgeladen und ist jetzt auf YouTube verfügbar.</p>
            <div class="success-actions">
              <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="primary-button">Video ansehen</a>
              <button id="success-close" class="secondary-button">Schließen</button>
            </div>
          `;
          
          // Zusätzliches CSS für den Erfolgsbildschirm
          const style = document.createElement('style');
          style.textContent = `
            .success-animation {
              display: flex;
              justify-content: center;
              margin: 32px 0;
            }
            
            .success-checkmark {
              width: 64px;
              height: 64px;
              background-color: var(--accent-color);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              color: white;
              animation: scaleIn 0.5s ease;
            }
            
            @keyframes scaleIn {
              0% { transform: scale(0); }
              70% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            
            .success-actions {
              display: flex;
              justify-content: center;
              gap: 16px;
              margin-top: 24px;
            }
          `;
          
          document.head.appendChild(style);
          
          // Event-Listener für den Schließen-Button
          const successCloseBtn = document.getElementById('success-close');
          if (successCloseBtn) {
            successCloseBtn.addEventListener('click', () => {
              if (overlay) {
                overlay.remove();
              }
              this.resetForm();
            });
          }
        }
      }
      
      this.uploadInProgress = false;
      
      // Reset the upload button
      const startUploadBtn = document.getElementById('start-upload-btn');
      if (startUploadBtn) {
        startUploadBtn.disabled = false;
        startUploadBtn.textContent = 'Hochladen starten';
      }
    }
    
    handleUploadError(errorMessage) {
      const overlay = document.getElementById('upload-overlay');
      if (overlay) {
        const overlayContainer = overlay.querySelector('.overlay-container');
        if (overlayContainer) {
          overlayContainer.innerHTML = `
            <h2>Upload fehlgeschlagen</h2>
            <div class="error-animation">
              <div class="error-icon">!</div>
            </div>
            <p>Beim Hochladen deines Videos ist ein Fehler aufgetreten:</p>
            <div class="error-message">${errorMessage}</div>
            <div class="error-actions">
              <button id="try-again" class="primary-button">Erneut versuchen</button>
              <button id="error-close" class="secondary-button">Abbrechen</button>
            </div>
          `;
          
          // Zusätzliches CSS für den Fehlerbildschirm
          const style = document.createElement('style');
          style.textContent = `
            .error-animation {
              display: flex;
              justify-content: center;
              margin: 32px 0;
            }
            
            .error-icon {
              width: 64px;
              height: 64px;
              background-color: #ff453a;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: bold;
              color: white;
            }
            
            .error-message {
              background-color: #2a2a2a;
              border-radius: 8px;
              padding: 12px;
              margin: 16px 0;
              color: #ff453a;
            }
            
            .error-actions {
              display: flex;
              justify-content: center;
              gap: 16px;
              margin-top: 24px;
            }
          `;
          
          document.head.appendChild(style);
          
          // Event-Listener für den Erneut-versuchen-Button
          const tryAgainBtn = document.getElementById('try-again');
          if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => {
              if (overlay) {
                overlay.remove();
              }
              this.startUpload();
            });
          }
          
          // Event-Listener für den Schließen-Button
          const errorCloseBtn = document.getElementById('error-close');
          if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
              if (overlay) {
                overlay.remove();
              }
            });
          }
        }
      }
      
      this.uploadInProgress = false;
      
      // Reset the upload button
      const startUploadBtn = document.getElementById('start-upload-btn');
      if (startUploadBtn) {
        startUploadBtn.disabled = false;
        startUploadBtn.textContent = 'Hochladen starten';
      }
    }
    
    cancelUpload() {
      // Entferne das Overlay
      const overlay = document.getElementById('upload-overlay');
      if (overlay) {
        overlay.remove();
      }
      
      this.uploadInProgress = false;
      
      // Reset the upload button
      const startUploadBtn = document.getElementById('start-upload-btn');
      if (startUploadBtn) {
        startUploadBtn.disabled = false;
        startUploadBtn.textContent = 'Hochladen starten';
      }
    }
    
    resetForm() {
      // Gehe zurück zum Dashboard
      const dashboardNav = document.querySelector('.sidebar-nav-item[data-page="Dashboard"]');
      if (dashboardNav) {
        dashboardNav.click();
      }
      
      // Formularfelder zurücksetzen für den nächsten Upload
      document.getElementById('video-title').value = '';
      document.getElementById('video-description').value = '';
      document.getElementById('video-tags').value = '';
      document.getElementById('privacy-setting').value = 'private';
      document.getElementById('video-category').value = '22';
      document.getElementById('made-for-kids').checked = false;
      document.getElementById('allow-comments').checked = true;
      
      // Datei-Auswahl zurücksetzen
      this.videoFile = null;
      this.thumbnailFile = null;
      
      const fileInfo = document.getElementById('selected-video-info');
      if (fileInfo) {
        fileInfo.innerHTML = '';
      }
      
      const thumbnailPreview = document.getElementById('thumbnail-preview');
      if (thumbnailPreview) {
        thumbnailPreview.innerHTML = `<div class="thumbnail-placeholder">Keine Vorschau</div>`;
      }
      
      // Upload-Button deaktivieren
      const startUploadBtn = document.getElementById('start-upload-btn');
      if (startUploadBtn) {
        startUploadBtn.disabled = true;
      }
    }
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
  
  // Exportieren für die Verwendung in anderen Dateien
  if (typeof module !== 'undefined') {
    module.exports = UploadForm;
  }
}