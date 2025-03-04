interface PlaylistData {
  videos: Video[];
  author: string | null;
  playlistTitle: string;
  timestamp: string;
}

class Video {
  title: string;
  url: string;
  constructor(title: string, url: string) {
    this.title = title;
    this.url = url;
  }
}

let playlistInfoElement: HTMLParagraphElement;
let videoListElement: HTMLDivElement;
let copyAllBtn: HTMLButtonElement;
let downloadBtn: HTMLButtonElement;
let openAllBtn: HTMLButtonElement;
let saveToReadwiseBtn: HTMLButtonElement;
let extractBtn: HTMLButtonElement;
let statusMessage: HTMLDivElement;
let tabs: NodeListOf<Element>;
let tabContents: NodeListOf<Element>;
let locationDropDown: HTMLSelectElement;

let playlistData: PlaylistData;

function init(): void {
  console.log('Playlist editor page loaded');

  playlistInfoElement = document.getElementById('playlist-info') as HTMLParagraphElement;
  videoListElement = document.getElementById('video-list') as HTMLDivElement;
  copyAllBtn = document.getElementById('copy-all-btn') as HTMLButtonElement;
  downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
  openAllBtn = document.getElementById('open-all-btn') as HTMLButtonElement;
  saveToReadwiseBtn = document.getElementById('save-to-readwise-btn') as HTMLButtonElement;
  extractBtn = document.getElementById('extract-btn') as HTMLButtonElement;
  statusMessage = document.getElementById('status-message') as HTMLDivElement;
  tabs = document.querySelectorAll('.tab');
  tabContents = document.querySelectorAll('.tab-content');
  locationDropDown = document.getElementById('location') as HTMLSelectElement;

  if (!playlistInfoElement || !videoListElement) {
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
      }

      if (playlistData == null) {
        showStatus('No playlist data found. Please try again.', 'error');
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
  playlistInfoElement.textContent = `Playlist: ${playlistData.playlistTitle} | ${playlistData.videos.length} videos`

  if (playlistData.author) {
    playlistInfoElement.textContent += `| by ${playlistData.author} `;
  }

  playlistInfoElement.textContent += `| Extracted: ${date.toLocaleString()} `;

  displayVideoList();

}

function displayVideoList(): void {
  if (!playlistData) return;

  videoListElement.innerHTML = '';

  if (playlistData.videos.length === 0) {
    videoListElement.innerHTML = '<p>No videos in this playlist.</p>';
    return;
  }

  playlistData.videos.forEach((video, index) => {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';

    const link = document.createElement('a');
    link.href = video.url;
    link.textContent = video.title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    videoItem.appendChild(link);

    if (index > 0) {
      const upBtn = document.createElement('button');
      upBtn.textContent = '⬆';
      upBtn.dataset.index = index.toString();
      upBtn.addEventListener('click', () => {
        [playlistData.videos[index], playlistData.videos[index - 1]] = [playlistData.videos[index - 1], playlistData.videos[index]];
        displayVideoList();
      });
      videoItem.appendChild(upBtn);
    }

    if (index < playlistData.videos.length - 1) {
      const downBtn = document.createElement('button');
      downBtn.textContent = '⬇';
      downBtn.dataset.index = index.toString();
      downBtn.addEventListener('click', () => {
        [playlistData.videos[index], playlistData.videos[index + 1]] = [playlistData.videos[index + 1], playlistData.videos[index]];
        displayVideoList();
      });
      videoItem.appendChild(downBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.dataset.index = index.toString();
    removeBtn.addEventListener('click', () => {
      removeVideo(index);
    });

    videoItem.appendChild(removeBtn);

    videoListElement.appendChild(videoItem);
  });
}

function removeVideo(index: number): void {
  if (!playlistData) return;

  playlistData.videos.splice(index, 1);

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
  if (!copyAllBtn || !downloadBtn || !openAllBtn || !saveToReadwiseBtn) {
    console.error('Button elements not found');
    return;
  }

  copyAllBtn.addEventListener('click', () => {
    if (!playlistData || playlistData.videos.length === 0) {
      showStatus('No URLs to copy', 'error');
      return;
    }

    let text = "";
    for (const video of playlistData.videos) {
      text += `${video.url}\n`;
    }
    navigator.clipboard.writeText(text)
      .then(() => {
        showStatus('All URLs copied to clipboard', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy URLs:', err);
        showStatus('Failed to copy URLs', 'error');
      });
  });

  downloadBtn.addEventListener('click', () => {
    if (!playlistData || playlistData.videos.length === 0) {
      showStatus('No URLs to download', 'error');
      return;
    }

    const text = playlistData.videos.join('\n');
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
    if (!playlistData || playlistData.videos.length === 0) {
      showStatus('No URLs to open', 'error');
      return;
    }

    if (playlistData.videos.length > 10) {
      if (!confirm(`Are you sure you want to open ${playlistData.videos.length} tabs ? `)) {
        return;
      }
    }

    playlistData.videos.forEach((video) => {
      window.open(video.url, '_blank');
    });
  });

  saveToReadwiseBtn.addEventListener('click', () => {
    console.log('Save to Readwise button clicked');

    if (!playlistData || playlistData.videos.length === 0) {
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
      console.log(`Preparing to send ${playlistData!.videos.length} URLs to Readwise`);

      sendUrlsToReadwise(playlistData, token);
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

async function sendUrlsToReadwise(playlistData: PlaylistData, token: string): Promise<void> {
  let successCount = 0;
  let failureCount = 0;
  let errorDetails = [];
  const urls = playlistData.videos.map(video => video.url);
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
    progressBar.style.width = `${percent}% `;
    readwiseBtn.textContent = `Saving ${current} /${total}`;
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

      let location = locationDropDown.options[locationDropDown.selectedIndex].value;

      let reqBody;
      if (playlistData && playlistData.author) {
        reqBody = {
          url: url,
          tags: tags,
          saved_using: 'auto-import',
          category: 'video',
          author: playlistData.author,
          location: location,
        };
      } else {
        reqBody = {
          url: url,
          tags: tags,
          saved_using: 'auto-import',
          category: 'video',
          location: location,
        };
      }

      const bodyJson = JSON.stringify(reqBody);
      console.log('Request body:', bodyJson);

      const response = await fetch('https://readwise.io/api/v3/save/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: bodyJson
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
