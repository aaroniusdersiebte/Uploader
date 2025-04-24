document.addEventListener('DOMContentLoaded', () => {
    console.log('App gestartet!');
    
    // Seitenleiste-Navigation
    setupNavigation();
    
    // Upload-Button-Funktion
    setupUploadButton();
    
    // Einstellungsseite initialisieren (versteckt)
    const settingsPage = new SettingsPage('settings-content');
  });
  
  function setupNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
    const pageTitle = document.querySelector('.page-title');
    const dashboardContent = document.getElementById('dashboard-content');
    const settingsContent = document.getElementById('settings-content');
    
    if (sidebarItems.length && pageTitle) {
      sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
          // Aktiven Status umschalten
          sidebarItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          // Titel ändern
          const title = item.getAttribute('data-page');
          if (title) pageTitle.textContent = title;
          
          // Inhalte ein-/ausblenden basierend auf der Seite
          if (title === 'Settings') {
            dashboardContent.style.display = 'none';
            settingsContent.style.display = 'block';
          } else {
            dashboardContent.style.display = 'block';
            settingsContent.style.display = 'none';
          }
        });
      });
    }
    
    // Spezieller Event-Listener für Einstellungen-Icon
    const settingsNav = document.getElementById('settings-nav');
    if (settingsNav) {
      settingsNav.addEventListener('click', () => {
        sidebarItems.forEach(i => i.classList.remove('active'));
        settingsNav.classList.add('active');
        pageTitle.textContent = 'Settings';
        
        dashboardContent.style.display = 'none';
        settingsContent.style.display = 'block';
      });
    }
  }
  
  function setupUploadButton() {
    // ... bestehender Code für das Upload-Overlay wie zuvor ...
  }
  
  function simulateUploadProgress() {
    // ... bestehender Code für die Upload-Simulation wie zuvor ...

    // Einfache App-Initialisierung für den Test
document.addEventListener('DOMContentLoaded', () => {
    console.log('App gestartet!');
    
    // Seitenleiste-Navigation
    setupNavigation();
    
    // Upload-Button-Funktion
    setupUploadButton();
  });
  
  function setupNavigation() {
    // Simuliere Seitenleiste-Klicks für den Test
    const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
    const pageTitle = document.querySelector('.page-title');
    
    if (sidebarItems.length && pageTitle) {
      sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
          // Aktiven Status umschalten
          sidebarItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          // Titel ändern
          const title = item.getAttribute('data-page');
          if (title) pageTitle.textContent = title;
        });
      });
    }
  }
  
  function setupUploadButton() {
    const uploadBtn = document.querySelector('.upload-button');
    const overlay = document.querySelector('.upload-overlay');
    const closeBtn = document.querySelector('.overlay-close');
    
    if (uploadBtn && overlay && closeBtn) {
      // Upload-Button zeigt Overlay
      uploadBtn.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        simulateUploadProgress();
      });
      
      // Schließen-Button versteckt Overlay
      closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
      });
    }
  }
  
  function simulateUploadProgress() {
    const progressCircle = document.querySelector('.progress-circle-fill');
    const progressText = document.querySelector('.progress-percentage');
    
    if (progressCircle && progressText) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        const dashOffset = 301 - (301 * progress / 100);
        progressCircle.style.strokeDashoffset = dashOffset;
        progressText.textContent = `${progress}%`;
        
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            document.querySelector('.upload-status').textContent = 'Processing...';
          }, 500);
        }
      }, 100);
    }
  }
  }