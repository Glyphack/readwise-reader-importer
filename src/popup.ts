document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const playlistEditorBtn = document.getElementById('playlist-editor-btn');
  const apiStatusDot = document.getElementById('api-status-dot');
  const apiStatusText = document.getElementById('api-status-text');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  if (playlistEditorBtn) {
    playlistEditorBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'playlist.html'
      });
    });
  }

  chrome.storage.sync.get(['apiKey'], (result) => {
    if (apiStatusDot && apiStatusText) {
      if (result.apiKey) {
        apiStatusDot.classList.remove('inactive');
        apiStatusDot.classList.add('active');
        apiStatusText.textContent = 'API Key: Configured';
      } else {
        apiStatusDot.classList.remove('active');
        apiStatusDot.classList.add('inactive');
        apiStatusText.textContent = 'API Key: Not configured';
      }
    }
  });
});
