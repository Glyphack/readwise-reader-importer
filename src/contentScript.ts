if (window.location.hostname.includes('youtube.com')) {
  console.log('YouTube Playlist Extractor: Content script loaded');

  function isYouTubePlaylist(): boolean {
    return window.location.href.includes('youtube.com/playlist') ||
      (window.location.href.includes('youtube.com/watch') && window.location.href.includes('list='));
  }

  function extractPlaylistVideos(): void {
    console.log('Extracting playlist videos...');

    function getVideoURLs(): string[] {
      const videoElements = document.querySelectorAll('a#video-title');
      return Array.from(videoElements).map(video => {
        try {
          const url = new URL((video as HTMLAnchorElement).href);
          const videoId = url.searchParams.get('v');
          return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
        } catch (e) {
          console.error('Error parsing URL:', e);
          return '';
        }
      }).filter(url => url && url.includes('v='));
    }

    let videoUrls = getVideoURLs();

    if (videoUrls.length === 0) {
      console.log('No videos found with primary method, trying fallback methods...');

      const videoElements = document.querySelectorAll('a.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer');
      videoElements.forEach((element: Element) => {
        const href = (element as HTMLAnchorElement).href;
        if (href && href.includes('watch?v=')) {
          videoUrls.push(href);
        }
      });

      if (videoUrls.length === 0) {
        const watchElements = document.querySelectorAll('a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer');
        watchElements.forEach((element: Element) => {
          const href = (element as HTMLAnchorElement).href;
          if (href && href.includes('watch?v=')) {
            videoUrls.push(href);
          }
        });
      }

      if (videoUrls.length === 0) {
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach((link: HTMLAnchorElement) => {
          if (link.href && link.href.includes('youtube.com/watch?v=')) {
            videoUrls.push(link.href);
          }
        });
      }
    }

    videoUrls = [...new Set(videoUrls)];

    console.log(`Found ${videoUrls.length} videos in playlist`);
    console.log(videoUrls);

    if (videoUrls.length > 0) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'openPlaylistEditor',
            videoUrls: videoUrls,
            playlistTitle: document.title
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              alert('Error extracting playlist: ' + chrome.runtime.lastError.message);
              return;
            }

            if (!response || !response.success) {
              console.error('Error response from background:', response?.error || 'Unknown error');
              alert('Error extracting playlist. Please try again.');
            } else {
              console.log('Playlist extraction successful, opening editor...');
            }
          });
        } else {
          console.error('Chrome runtime API is not available');
          alert('Error: Chrome extension API is not available. Please check if the extension is properly installed and has the required permissions.');
        }
      } catch (error) {
        console.error('Error sending message to background script:', error);
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          console.log('Extension context has been invalidated');
          alert('The extension has been updated or reloaded. Please refresh the page and try again.');
        } else {
          alert('Error extracting playlist. Please try again.');
        }
      }
    } else {
      alert('No videos found in this playlist. Please make sure you are on a YouTube playlist page.');
    }
  }
}
