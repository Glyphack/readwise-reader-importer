document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const apiStatusDot = document.getElementById('api-status-dot');
  const apiStatusText = document.getElementById('api-status-text');
  const errorMessage = document.getElementById('error-message');

  function isYouTubePlaylist(url: string): boolean {
    return url.includes('youtube.com/playlist') ||
      (url.includes('youtube.com/watch') && url.includes('list='));
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // First, check if API key is configured
  chrome.storage.sync.get(['apiKey'], (result) => {
    console.log("Checking API key:", result.apiKey ? "Found" : "Not found");
    
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
    
    // Then check current tab URL to determine if it's a YouTube playlist
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      const isPlaylist = isYouTubePlaylist(currentUrl);
      const currentTab = tabs[0];

      if (saveBtn && errorMessage) {
        if (!isPlaylist) {
          saveBtn.disabled = true;
          errorMessage.textContent = 'Not on a YouTube playlist page';
          errorMessage.style.display = 'block';
        } else if (!result.apiKey) {
          saveBtn.disabled = true;
          errorMessage.textContent = 'Please configure your API key in settings';
          errorMessage.style.display = 'block';
        } else {
          saveBtn.disabled = false;
          errorMessage.style.display = 'none';
          
          // Auto-extract when on a playlist page with API key configured
          if (isPlaylist && result.apiKey && currentTab?.id) {
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: extractPlaylistFromPage
            }).then(results => {
              if (results && results[0]?.result) {
                const videoUrls = results[0].result;
                
                // Save to storage
                chrome.storage.local.set({
                  'playlistData': {
                    videoUrls: videoUrls,
                    playlistTitle: tabs[0]?.title || 'YouTube Playlist',
                    timestamp: new Date().toISOString()
                  }
                }, () => {
                  // Open the playlist editor page
                  chrome.tabs.create({
                    url: 'playlist.html'
                  });
                });
              }
            }).catch(error => {
              console.error('Error executing script:', error);
              errorMessage.textContent = 'Error extracting playlist data';
              errorMessage.style.display = 'block';
            });
          }
        }
      }
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: extractPlaylistFromPage
          }).then(results => {
            if (results && results[0]?.result) {
              const videoUrls = results[0].result;
              
              // Save to storage
              chrome.storage.local.set({
                'playlistData': {
                  videoUrls: videoUrls,
                  playlistTitle: tabs[0]?.title || 'YouTube Playlist',
                  timestamp: new Date().toISOString()
                }
              }, () => {
                // Open the playlist editor page
                chrome.tabs.create({
                  url: 'playlist.html'
                });
              });
            }
          }).catch(error => {
            console.error('Error executing script:', error);
            if (errorMessage) {
              errorMessage.textContent = 'Error extracting playlist data';
              errorMessage.style.display = 'block';
            }
          });
        }
      });
    });
  }
});

function extractPlaylistFromPage() {
  function getVideoURLs() {
    const videoElements = document.querySelectorAll('a#video-title');
    let videoUrls = Array.from(videoElements).map(video => {
      try {
        const url = new URL((video as HTMLAnchorElement).href);
        const videoId = url.searchParams.get('v');
        return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
      } catch (e) {
        return '';
      }
    }).filter(url => url && url.includes('v='));

    if (videoUrls.length === 0) {
      const videoElements = document.querySelectorAll('a.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer');
      videoElements.forEach((element) => {
        const href = (element as HTMLAnchorElement).href;
        if (href && href.includes('watch?v=')) {
          videoUrls.push(href);
        }
      });

      if (videoUrls.length === 0) {
        const watchElements = document.querySelectorAll('a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer');
        watchElements.forEach((element) => {
          const href = (element as HTMLAnchorElement).href;
          if (href && href.includes('watch?v=')) {
            videoUrls.push(href);
          }
        });
      }

      if (videoUrls.length === 0) {
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach((link) => {
          if (link.href && link.href.includes('youtube.com/watch?v=')) {
            videoUrls.push(link.href);
          }
        });
      }
    }

    return [...new Set(videoUrls)];
  }

  return getVideoURLs();
}
