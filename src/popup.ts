document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const apiStatusDot = document.getElementById('api-status-dot');
  const apiStatusText = document.getElementById('api-status-text');
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
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
        apiStatusDot.classList.remove('bg-red-500');
        apiStatusDot.classList.add('bg-green-500');
        apiStatusText.textContent = 'API Key: Configured';
      } else {
        apiStatusDot.classList.remove('bg-green-500');
        apiStatusDot.classList.add('bg-red-500');
        apiStatusText.textContent = 'API Key: Not configured';
      }
    }

    // Then check current tab URL to determine if it's a YouTube playlist
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      const isPlaylist = isYouTubePlaylist(currentUrl);
      const currentTab = tabs[0];

      if (errorMessage) {
        if (!isPlaylist) {
          if (saveBtn) saveBtn.disabled = true;
          errorMessage.textContent = 'Not on a YouTube playlist page';
          errorMessage.classList.remove('hidden');
        } else if (!result.apiKey) {
          if (saveBtn) saveBtn.disabled = true;
          errorMessage.textContent = 'Please configure your API key in settings';
          errorMessage.classList.remove('hidden');
        } else {
          if (saveBtn) saveBtn.disabled = false;
          errorMessage.classList.add('hidden');
        }
      }

      // Add click event listener for the save button
      if (saveBtn && errorMessage) {
        saveBtn.addEventListener('click', () => {
          if (!isPlaylist) {
            errorMessage.textContent = 'Not on a YouTube playlist page';
            errorMessage.classList.remove('hidden');
            return;
          }

          if (!result.apiKey) {
            errorMessage.textContent = 'Please configure your API key in settings';
            errorMessage.classList.remove('hidden');
            return;
          }

          if (currentTab?.id) {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.textContent = 'Extracting...';

            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: extractPlaylistFromPage
            }).then(results => {
              if (results && results[0]?.result) {
                // Filter out empty URLs
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
              if (errorMessage) {
                errorMessage.textContent = 'Error extracting playlist data';
                errorMessage.classList.remove('hidden');
              }
              saveBtn.disabled = false;
              saveBtn.textContent = 'Extract Playlist';
            });
          }
        });
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
