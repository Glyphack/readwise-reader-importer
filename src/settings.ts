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

    if (type === 'success') {
      statusMessage.className = 'mt-4 p-3 bg-green-100 text-green-700 rounded-md';
    } else {
      statusMessage.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-md';
    }

    statusMessage.classList.remove('hidden');

    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 3000);
  }
});
