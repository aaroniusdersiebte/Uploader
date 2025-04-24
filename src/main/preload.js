// src/main/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// App API Zugriff
contextBridge.exposeInMainWorld('app', {
  getApiSettings: () => ipcRenderer.invoke('app:getApiSettings'),
  saveApiConfig: (config) => ipcRenderer.invoke('app:saveApiConfig', config),
  getTheme: () => ipcRenderer.invoke('app:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('app:setTheme', theme),
  setAccentColor: (color) => ipcRenderer.invoke('app:setAccentColor', color)
});

// YouTube API Zugriff
contextBridge.exposeInMainWorld('youtube', {
  checkAuth: () => ipcRenderer.invoke('youtube:checkAuth'),
  authenticate: () => ipcRenderer.invoke('youtube:authenticate'),
  selectVideo: () => ipcRenderer.invoke('youtube:selectVideo'),
  selectThumbnail: () => ipcRenderer.invoke('youtube:selectThumbnail'),
  uploadVideo: (data) => ipcRenderer.invoke('youtube:uploadVideo', data),
  uploadThumbnail: (data) => ipcRenderer.invoke('youtube:uploadThumbnail', data),
  getCategories: () => ipcRenderer.invoke('youtube:getCategories'),
  getPlaylists: () => ipcRenderer.invoke('youtube:getPlaylists'),
  onUploadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('youtube:uploadProgress', subscription);
    return () => ipcRenderer.removeListener('youtube:uploadProgress', subscription);
  }
});