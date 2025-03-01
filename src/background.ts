console.log('YouTube Playlist Extractor: Background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  if (message.action === 'openPlaylistEditor') {
    try {
      chrome.storage.local.set({
        'playlistData': {
          videoUrls: message.videoUrls || [],
          playlistTitle: message.playlistTitle || 'YouTube Playlist',
          timestamp: new Date().toISOString()
        }
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving to storage:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        console.log('Playlist data saved to storage');

        chrome.tabs.create({
          url: chrome.runtime.getURL('playlist.html')
        }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('Error creating tab:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          sendResponse({ success: true, tabId: tab.id });
        });
      });
    } catch (error: unknown) {
      console.error('Error in background script:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: errorMessage });
    }

    return true; // Keep the message channel open for the async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Playlist Extractor extension installed');

  chrome.storage.local.set({
    'playlistData': null
  }, () => {
    console.log('Storage initialized');
  });
});
