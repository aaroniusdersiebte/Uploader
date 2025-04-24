// Beispiel für theme.js
function setThemeColor(hexColor) {
    document.documentElement.style.setProperty('--accent-color', hexColor);
    localStorage.setItem('accentColor', hexColor);
  }