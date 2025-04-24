const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class YouTubeUploader {
  constructor(authClient) {
    this.authClient = authClient;
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.authClient
    });
    this.currentUpload = null; // Speichert den aktuellen Upload, um ihn abbrechen zu können
  }

  /**
   * Video auf YouTube hochladen
   * @param {string} videoPath - Pfad zur Videodatei
   * @param {object} metadata - Metadaten für das Video
   * @param {function} progressCallback - Callback für Upload-Fortschritt
   * @returns {Promise<object>} - Upload-Ergebnis
   */
  async uploadVideo(videoPath, metadata, progressCallback) {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Datei nicht gefunden: ${videoPath}`);
      }

      const fileSize = fs.statSync(videoPath).size;
      
      // Standard-Metadaten für den Upload festlegen
      const requestMetadata = {
        snippet: {
          title: metadata.title || 'Untitled Video',
          description: metadata.description || '',
          tags: metadata.tags || [],
          categoryId: metadata.categoryId || '22', // Standard: People & Vlogs
          defaultLanguage: metadata.language || 'de',
          defaultAudioLanguage: metadata.language || 'de'
        },
        status: {
          privacyStatus: metadata.privacy || 'private',
          embeddable: metadata.embeddable !== false,
          publicStatsViewable: metadata.publicStatsViewable !== false,
          selfDeclaredMadeForKids: metadata.madeForKids || false
        }
      };

      // Geplantes Veröffentlichen behandeln
      if (metadata.publishAt) {
        requestMetadata.status.publishAt = new Date(metadata.publishAt).toISOString();
      }

      // Kommentare verwalten
      if (metadata.hasOwnProperty('allowComments') && !metadata.allowComments) {
        requestMetadata.status.commentModerationStatus = 'disabled';
      }

      let lastReportedProgress = 0;
      let startTime = Date.now();
      
      // Filestream erstellen und Upload starten
      const fileStream = fs.createReadStream(videoPath);
      
      // Upload initiieren
      console.log('Starte Video-Upload mit Metadaten:', requestMetadata);
      
      const res = await this.youtube.videos.insert({
        part: 'snippet,status',
        requestBody: requestMetadata,
        media: {
          body: fileStream
        }
      }, {
        onUploadProgress: evt => {
          const currentProgress = Math.round((evt.bytesRead / fileSize) * 100);
          
          // Nur berichten, wenn sich der Fortschritt um mindestens 1% geändert hat
          if (currentProgress > lastReportedProgress) {
            lastReportedProgress = currentProgress;
            
            // Berechne verbleibende Zeit
            const elapsedTime = Date.now() - startTime;
            const bytesPerMs = evt.bytesRead / elapsedTime;
            const remainingBytes = fileSize - evt.bytesRead;
            const remainingTimeMs = bytesPerMs > 0 ? remainingBytes / bytesPerMs : 0;
            
            let timeRemainingText = 'Berechne...';
            if (bytesPerMs > 0) {
              const remainingMinutes = Math.floor(remainingTimeMs / 60000);
              const remainingSeconds = Math.floor((remainingTimeMs % 60000) / 1000);
              timeRemainingText = `Noch ${remainingMinutes} Min ${remainingSeconds} Sek`;
            }
            
            // Status basierend auf Fortschritt
            let status = 'Uploading...';
            if (currentProgress >= 100) {
              status = 'Verarbeite Video...';
              timeRemainingText = 'YouTube verarbeitet dein Video...';
            } else if (currentProgress >= 95) {
              status = 'Fast fertig...';
            }
            
            // Callback mit detaillierten Informationen
            if (progressCallback) {
              progressCallback({
                progress: currentProgress,
                bytesRead: evt.bytesRead,
                bytesTotal: fileSize,
                status: status,
                timeRemaining: timeRemainingText,
                speed: `${Math.round(bytesPerMs * 1000 / 1024 / 1024 * 100) / 100} MB/s`
              });
            }
          }
        }
      });

      console.log('Video erfolgreich hochgeladen:', res.data);
      return res.data;
    } catch (error) {
      console.error('Upload-Fehler:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Thumbnail für ein Video festlegen
   * @param {string} videoId - ID des Videos
   * @param {string} thumbnailPath - Pfad zum Thumbnail-Bild
   * @returns {Promise<object>} - Ergebnis des Thumbnail-Uploads
   */
  async setThumbnail(videoId, thumbnailPath) {
    try {
      if (!fs.existsSync(thumbnailPath)) {
        throw new Error(`Thumbnail-Datei nicht gefunden: ${thumbnailPath}`);
      }
      
      console.log(`Setze Thumbnail für Video ${videoId}: ${thumbnailPath}`);
      
      const res = await this.youtube.thumbnails.set({
        videoId: videoId,
        media: {
          body: fs.createReadStream(thumbnailPath)
        }
      });

      console.log('Thumbnail erfolgreich gesetzt:', res.data);
      return res.data;
    } catch (error) {
      console.error('Thumbnail-Fehler:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Videokategorien abrufen
   * @param {string} regionCode - Ländercode (z.B. 'DE' für Deutschland)
   * @returns {Promise<Array>} - Liste der Videokategorien
   */
  async getVideoCategories(regionCode = 'DE') {
    try {
      console.log(`Lade Videokategorien für Region ${regionCode}`);
      
      const res = await this.youtube.videoCategories.list({
        part: 'snippet',
        regionCode: regionCode
      });

      console.log(`${res.data.items.length} Kategorien geladen`);
      return res.data.items;
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Eigene Playlists abrufen
   * @returns {Promise<Array>} - Liste der Playlists
   */
  async getMyPlaylists() {
    try {
      console.log('Lade Playlists...');
      
      const res = await this.youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 50
      });

      console.log(`${res.data.items.length} Playlists geladen`);
      return res.data.items;
    } catch (error) {
      console.error('Fehler beim Laden der Playlists:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }
  
  /**
   * Video zu einer Playlist hinzufügen
   * @param {string} videoId - ID des Videos
   * @param {string} playlistId - ID der Playlist
   * @returns {Promise<object>} - Ergebnis des Hinzufügens
   */
  async addVideoToPlaylist(videoId, playlistId) {
    try {
      console.log(`Füge Video ${videoId} zu Playlist ${playlistId} hinzu`);
      
      const res = await this.youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });

      console.log('Video erfolgreich zur Playlist hinzugefügt:', res.data);
      return res.data;
    } catch (error) {
      console.error('Fehler beim Hinzufügen zur Playlist:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }
  
  /**
   * Upload-Quota (verbleibende Upload-Kapazität) abrufen
   * @returns {Promise<object>} - Quota-Informationen
   */
  async getUploadQuota() {
    try {
      console.log('Lade Upload-Quota...');
      
      const res = await this.youtube.channels.list({
        part: 'contentDetails,statistics',
        mine: true
      });

      if (res.data.items && res.data.items.length > 0) {
        const channel = res.data.items[0];
        console.log('Quota-Infos geladen:', channel);
        return {
          channelId: channel.id,
          totalVideos: channel.statistics.videoCount,
          quotaInfo: channel.contentDetails.contentRatings
        };
      } else {
        throw new Error('Kein Kanal gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Upload-Quota:', error);
      if (error.response) {
        console.error('API-Fehlerantwort:', error.response.data);
      }
      throw error;
    }
  }
}

module.exports = YouTubeUploader;