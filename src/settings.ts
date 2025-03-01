document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form') as HTMLFormElement;
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement;

  chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    chrome.storage.sync.set({ apiKey }, () => {
      showStatus('API key saved successfully!', 'success');
    });
  });

  function showStatus(message: string, type: 'success' | 'error'): void {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.style.display = 'block';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
});
