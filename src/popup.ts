document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const apiStatusDot = document.getElementById('api-status-dot');
  const apiStatusText = document.getElementById('api-status-text');
  const errorMessage = document.getElementById('error-message');
  const bugReportBtn = document.getElementById('bug-report-btn');

  function isYouTubePlaylist(url: string): boolean {
    return url.includes('youtube.com/playlist') ||
      (url.includes('youtube.com/watch') && url.includes('list='));
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  if (bugReportBtn) {
    bugReportBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://github.com/Glyphack/readwise-reader-importer/issues/new/choose'
      });
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
                // TODO: Show error message if some URL is empty
                const videos = results[0].result.videos.filter((video: Video) => video.url !== '');

                // Save to storage
                chrome.storage.local.set({
                  'playlistData': {
                    videos: videos,
                    author: results[0].result.author,
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
});


function extractPlaylistFromPage() {
  class Result {
    author: string | null;
    videos: Video[];
    constructor(author: string | null, videos: Video[]) {
      this.author = author;
      this.videos = videos;
    }
  }

  class Video {
    title: string;
    url: string;
    constructor(title: string, url: string) {
      this.title = title;
      this.url = url;
    }
  }
  function getVideoURLs() {
    const videoElements = document.querySelectorAll('a#video-title');
    let videoUrls = Array.from(videoElements).map(video => {
      try {
        const url = new URL((video as HTMLAnchorElement).href);
        const title = (video as HTMLAnchorElement).title;
        const videoId = url.searchParams.get('v');
        if (!videoId) {
          return new Video("", "");
        }
        return new Video(title, `https://www.youtube.com/watch?v=${videoId}`);
      } catch (e) {
        return new Video("", "");
      }
    });

    // select a tag inside yt-avatar-stack-view-model
    const authorElement = document.querySelector('yt-formatted-string.ytd-channel-name a');
    const author = authorElement ? (authorElement as HTMLAnchorElement).text : null;

    return new Result(author, [...new Set(videoUrls)]);
  }

  return getVideoURLs();
}
