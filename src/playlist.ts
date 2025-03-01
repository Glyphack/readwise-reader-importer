interface PlaylistData {
  videoUrls: string[];
  playlistTitle: string;
  timestamp: string;
}

let playlistInfoElement: HTMLParagraphElement;
let videoListElement: HTMLDivElement;
let urlsTextarea: HTMLTextAreaElement;
let copyAllBtn: HTMLButtonElement;
let copyTextBtn: HTMLButtonElement;
let downloadBtn: HTMLButtonElement;
let openAllBtn: HTMLButtonElement;
let saveTextBtn: HTMLButtonElement;
let saveToReadwiseBtn: HTMLButtonElement;
let extractBtn: HTMLButtonElement;
let statusMessage: HTMLDivElement;
let tabs: NodeListOf<Element>;
let tabContents: NodeListOf<Element>;

let playlistData: PlaylistData | null = null;

// YouTube video extraction functions
function isYouTubePlaylist(): boolean {
  return window.location.href.includes('youtube.com/playlist') ||
    (window.location.href.includes('youtube.com/watch') && window.location.href.includes('list='));
}

function extractPlaylistVideos(): Promise<string[]> {
  console.log('YouTube Playlist Extractor: Starting video extraction process');

  return new Promise((resolve) => {
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

    resolve(videoUrls);
  });
}

function init(): void {
  console.log('Playlist editor page loaded');

  playlistInfoElement = document.getElementById('playlist-info') as HTMLParagraphElement;
  videoListElement = document.getElementById('video-list') as HTMLDivElement;
  urlsTextarea = document.getElementById('urls-textarea') as HTMLTextAreaElement;
  copyAllBtn = document.getElementById('copy-all-btn') as HTMLButtonElement;
  copyTextBtn = document.getElementById('copy-text-btn') as HTMLButtonElement;
  downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
  openAllBtn = document.getElementById('open-all-btn') as HTMLButtonElement;
  saveTextBtn = document.getElementById('save-text-btn') as HTMLButtonElement;
  saveToReadwiseBtn = document.getElementById('save-to-readwise-btn') as HTMLButtonElement;
  extractBtn = document.getElementById('extract-btn') as HTMLButtonElement;
  statusMessage = document.getElementById('status-message') as HTMLDivElement;
  tabs = document.querySelectorAll('.tab');
  tabContents = document.querySelectorAll('.tab-content');

  if (!playlistInfoElement || !videoListElement || !urlsTextarea) {
    console.error('Required DOM elements not found');
    return;
  }

  try {
    chrome.storage.local.get('playlistData', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error accessing storage:', chrome.runtime.lastError);
        showStatus('Error loading playlist data: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (result.playlistData) {
        playlistData = result.playlistData as PlaylistData;
        displayPlaylistData();
      } else {
        playlistInfoElement.textContent = 'No playlist data found. Please extract a playlist first.';
        videoListElement.innerHTML = '<p>No videos available.</p>';
        urlsTextarea.value = '';
      }
    });
  } catch (error) {
    console.error('Error loading playlist data:', error);
    showStatus('Error loading playlist data', 'error');
  }

  setupEventListeners();
}

function displayPlaylistData(): void {
  if (!playlistData) return;

  const date = new Date(playlistData.timestamp);
  playlistInfoElement.textContent = `Playlist: ${playlistData.playlistTitle} | ${playlistData.videoUrls.length} videos | Extracted: ${date.toLocaleString()}`;

  displayVideoList();

  urlsTextarea.value = playlistData.videoUrls.join('\n');
}

function displayVideoList(): void {
  if (!playlistData) return;

  videoListElement.innerHTML = '';

  if (playlistData.videoUrls.length === 0) {
    videoListElement.innerHTML = '<p>No videos in this playlist.</p>';
    return;
  }

  playlistData.videoUrls.forEach((url, index) => {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';

    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.dataset.index = index.toString();
    removeBtn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      const index = parseInt(target.dataset.index || '0');
      removeVideo(index);
    });

    videoItem.appendChild(link);
    videoItem.appendChild(removeBtn);

    videoListElement.appendChild(videoItem);
  });
}

function removeVideo(index: number): void {
  if (!playlistData) return;

  playlistData.videoUrls.splice(index, 1);

  displayPlaylistData();

  savePlaylistData();
}

function savePlaylistData(): void {
  if (!playlistData) return;

  try {
    chrome.storage.local.set({
      'playlistData': playlistData
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving to storage:', chrome.runtime.lastError);
        showStatus('Error saving data: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      console.log('Playlist data saved');
      showStatus('Changes saved successfully', 'success');
    });
  } catch (error) {
    console.error('Error saving playlist data:', error);
    showStatus('Error saving data', 'error');
  }
}

function setupEventListeners(): void {
  if (!copyAllBtn || !copyTextBtn || !downloadBtn || !openAllBtn || !saveTextBtn || !saveToReadwiseBtn) {
    console.error('Button elements not found');
    return;
  }

  copyAllBtn.addEventListener('click', () => {
    if (!playlistData || playlistData.videoUrls.length === 0) {
      showStatus('No URLs to copy', 'error');
      return;
    }

    const text = playlistData.videoUrls.join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        showStatus('All URLs copied to clipboard', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy URLs:', err);
        showStatus('Failed to copy URLs', 'error');
      });
  });

  copyTextBtn.addEventListener('click', () => {
    const text = urlsTextarea.value;
    if (!text) {
      showStatus('No text to copy', 'error');
      return;
    }

    navigator.clipboard.writeText(text)
      .catch((err) => {
        console.error('Failed to copy text:', err);
        showStatus('Failed to copy text', 'error');
      });
  });

  downloadBtn.addEventListener('click', () => {
    if (!playlistData || playlistData.videoUrls.length === 0) {
      showStatus('No URLs to download', 'error');
      return;
    }

    const text = playlistData.videoUrls.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_playlist_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  openAllBtn.addEventListener('click', () => {
    if (!playlistData || playlistData.videoUrls.length === 0) {
      showStatus('No URLs to open', 'error');
      return;
    }

    if (playlistData.videoUrls.length > 10) {
      if (!confirm(`Are you sure you want to open ${playlistData.videoUrls.length} tabs?`)) {
        return;
      }
    }

    playlistData.videoUrls.forEach((url) => {
      window.open(url, '_blank');
    });
  });

  saveTextBtn.addEventListener('click', () => {
    const text = urlsTextarea.value;
    const urls = text.split('\n').filter(url => url.trim() !== '');

    if (!playlistData) {
      playlistData = {
        videoUrls: urls,
        playlistTitle: 'Custom Playlist',
        timestamp: new Date().toISOString()
      };
    } else {
      playlistData.videoUrls = urls;
      playlistData.timestamp = new Date().toISOString();
    }

    savePlaylistData();
    displayPlaylistData();
  });

  if (extractBtn) {
    extractBtn.addEventListener('click', async () => {
      console.log('Extract button clicked');

      if (!window.location.hostname.includes('youtube.com') || !isYouTubePlaylist()) {
        showStatus('Not on a YouTube playlist page', 'error');
        return;
      }

      showStatus('Extracting videos from playlist...', 'success');

      try {
        const videoUrls = await extractPlaylistVideos();

        if (videoUrls.length > 0) {
          playlistData = {
            videoUrls: videoUrls,
            playlistTitle: document.title,
            timestamp: new Date().toISOString()
          };

          savePlaylistData();
          displayPlaylistData();

          showStatus(`Successfully extracted ${videoUrls.length} videos!`, 'success');
        } else {
          showStatus('No videos found in this playlist', 'error');
        }
      } catch (error) {
        console.error('Error extracting videos:', error);
        showStatus('Error extracting videos', 'error');
      }
    });
  }

  saveToReadwiseBtn.addEventListener('click', () => {
    console.log('Save to Readwise button clicked');

    if (!playlistData || playlistData.videoUrls.length === 0) {
      showStatus('No URLs to save to Readwise', 'error');
      console.log('No playlist data or empty video URLs array', playlistData);
      return;
    }

    console.log('Attempting to retrieve API key from storage');

    chrome.storage.sync.get(['apiKey'], (result) => {
      console.log('Storage get result:', result);

      if (chrome.runtime.lastError) {
        console.error('Error accessing storage:', chrome.runtime.lastError);
        showStatus('Error accessing Readwise API token: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      const token = result.apiKey;
      console.log('API token retrieved:', token ? 'Token found' : 'Token not found');

      if (!token) {
        showStatus('Readwise API token not found. Please set it in the extension settings.', 'error');
        return;
      }

      showStatus('Sending URLs to Readwise...', 'success');
      console.log(`Preparing to send ${playlistData!.videoUrls.length} URLs to Readwise`);

      sendUrlsToReadwise(playlistData!.videoUrls, token);
    });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      if (tabId) {
        const content = document.getElementById(tabId);
        if (content) {
          content.classList.add('active');
        }
      }
    });
  });
}

async function sendUrlsToReadwise(urls: string[], token: string): Promise<void> {
  let successCount = 0;
  let failureCount = 0;
  let errorDetails = [];
  console.log(`Starting to send ${urls.length} URLs to Readwise`);

  const readwiseBtn = document.getElementById('save-to-readwise-btn') as HTMLButtonElement;
  const originalBtnText = readwiseBtn.textContent || 'Save to Readwise';

  let progressBar = readwiseBtn.querySelector('.progress-bar') as HTMLDivElement;
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    readwiseBtn.appendChild(progressBar);
  }

  let loadingText = readwiseBtn.querySelector('.loading-text') as HTMLSpanElement;
  if (!loadingText) {
    loadingText = document.createElement('span');
    loadingText.className = 'loading-text';
    readwiseBtn.appendChild(loadingText);
  }

  // Create or get error container
  let errorContainer = document.getElementById('readwise-error-container');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'readwise-error-container';
    errorContainer.style.color = 'red';
    errorContainer.style.marginTop = '10px';
    errorContainer.style.display = 'none';
    readwiseBtn.parentNode?.insertBefore(errorContainer, readwiseBtn.nextSibling);
  }

  // Now errorContainer is guaranteed to be non-null
  const errorContainerElement = errorContainer as HTMLDivElement;

  readwiseBtn.disabled = true;

  const updateProgress = (current: number, total: number) => {
    const percent = (current / total) * 100;
    progressBar.style.width = `${percent}%`;
    readwiseBtn.textContent = `Saving ${current}/${total}`;
  };

  updateProgress(0, urls.length);

  for (const [index, url] of urls.entries()) {
    console.log(`Saving URL to Readwise: ${url}`);
    try {
      console.log(`Making API request to Readwise for URL: ${url}`);
      const tags = ['auto-import', 'youtube'];
      if (playlistData && playlistData.playlistTitle) {
        tags.push(`name:${playlistData.playlistTitle}`);
      }

      const requestBody = JSON.stringify({
        url: url,
        tags: tags,
        saved_using: 'auto-import',
        category: 'video'
      });
      console.log('Request body:', requestBody);

      const response = await fetch('https://readwise.io/api/v3/save/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: requestBody
      });

      console.log(`Response status for ${url}: ${response.status}`);
      const responseText = await response.text();
      console.log(`Response body: ${responseText}`);

      if (response.ok) {
        successCount++;
        console.log(`Successfully saved URL ${successCount}/${urls.length}`);

        updateProgress(successCount, urls.length);
      } else {
        failureCount++;
        const errorMsg = `Failed to save URL: ${url}, Status: ${response.status}, Response: ${responseText}`;
        console.error(errorMsg);
        errorDetails.push(errorMsg);

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          console.log(`Rate limit reached. Will retry after ${retryAfter} seconds`);
          showStatus(`Rate limit reached. Waiting ${retryAfter} seconds...`, 'error');

          readwiseBtn.textContent = `Rate limited. Waiting ${retryAfter}s...`;

          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

          urls.push(url);

          updateProgress(successCount, urls.length);
        } else {
          console.error(`API error: ${response.status} - ${responseText}`);
        }
      }

      console.log('Waiting 500ms before next request');
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Error sending URL to Readwise:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      failureCount++;
      errorDetails.push(`Error with URL ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`Finished processing all URLs. Success: ${successCount}, Failures: ${failureCount}`);

  readwiseBtn.disabled = false;
  readwiseBtn.textContent = originalBtnText;

  progressBar.style.width = '100%';
  setTimeout(() => {
    progressBar.style.opacity = '0';
    setTimeout(() => {
      progressBar.style.width = '0';
      progressBar.style.opacity = '1';
    }, 300);
  }, 500);

  if (failureCount === 0) {
    showStatus(`Successfully sent all ${successCount} URLs to Readwise!`, 'success');
    errorContainerElement.style.display = 'none';
  } else {
    showStatus(`Sent ${successCount} URLs to Readwise with ${failureCount} failures.`, 'error');
    
    // Display detailed error information
    errorContainerElement.innerHTML = `<strong>Errors (${failureCount}):</strong><br>`;
    errorDetails.forEach((error, i) => {
      if (i < 5) { // Show only first 5 errors to avoid overwhelming the UI
        errorContainerElement.innerHTML += `${error}<br>`;
      }
    });
    
    if (errorDetails.length > 5) {
      errorContainerElement.innerHTML += `<em>...and ${errorDetails.length - 5} more errors. Check console for details.</em>`;
    }
    
    errorContainerElement.style.display = 'block';
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  if (!statusMessage) {
    console.error('Status message element not found');
    console.log(message, type);
    return;
  }

  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.style.display = 'block';

  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Initialize the page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}
