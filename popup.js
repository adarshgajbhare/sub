document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  const startButton = document.getElementById('startButton');
  const extractButton = document.getElementById('extractSubscriptions');
  const unsubscribeButton = document.getElementById('unsubscribeAll');
  const statusDiv = document.getElementById('status');
  const delayInput = document.getElementById('delayInput');

  let channels = [];

  // Extract subscriptions button click handler
  extractButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractSubscriptionURLs
      });

      if (results && results[0] && results[0].result) {
        const { urls, count } = results[0].result;
        const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subscriptions.txt';
        a.click();
        URL.revokeObjectURL(url);

        statusDiv.textContent = `Downloaded ${count} subscription URLs`;
      }
    } catch (error) {
      console.error('Error extracting subscriptions:', error);
      statusDiv.textContent = 'Error extracting subscriptions. Make sure you are on YouTube subscriptions page.';
    }
  });

  // Unsubscribe all button click handler
  unsubscribeButton.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to unsubscribe from all channels? This action cannot be undone.')) {
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      statusDiv.textContent = 'Starting unsubscribe process...';

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: unsubscribeFromAllChannels
      });

      if (results && results[0] && results[0].result) {
        const { unsubscribed, total } = results[0].result;
        statusDiv.textContent = `Unsubscribed from ${unsubscribed} out of ${total} channels`;
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      statusDiv.textContent = 'Error during unsubscribe process. Make sure you are on YouTube subscriptions page.';
    }
  });

  // File input handler
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      const text = e.target.result;
      channels = text.split('\n')
        .map(url => url.trim())
        .filter(url => url.includes('youtube.com/@'));
      statusDiv.textContent = `Loaded ${channels.length} channels`;
    };

    reader.readAsText(file);
  });

  // Subscribe process handler
  startButton.addEventListener('click', async function() {
    if (channels.length === 0) {
      statusDiv.textContent = 'Please load a file first';
      return;
    }

    const delay = Math.max(3, parseInt(delayInput.value) || 5) * 1000;
    statusDiv.textContent = 'Starting subscription process...';

    chrome.runtime.sendMessage({ action: 'startSubscription', channels, delay });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'subscribed') {
      statusDiv.textContent = `Subscribed to ${message.index} channels`;
    } else if (message.action === 'subscriptionFailed') {
      statusDiv.textContent = `Couldn't subscribe to channel ${message.index}, moving to next...`;
    } else if (message.action === 'subscriptionError') {
      statusDiv.textContent = `Error on channel ${message.index}: ${message.error}`;
    } else if (message.action === 'subscriptionComplete') {
      statusDiv.textContent = 'Finished processing all channels!';
    }
  });
});

// Function to extract subscription URLs
function extractSubscriptionURLs() {
  const channelURLs = new Set();

  document.querySelectorAll("#contents ytd-channel-renderer a").forEach((link) => {
    const channelURL = link.href;
    if (channelURL && channelURL.includes('@')) {
      channelURLs.add(channelURL);
    }
  });

  return {
    urls: Array.from(channelURLs),
    count: channelURLs.size
  };
}

// Add this to the beginning of your existing popup.js file

document.addEventListener('DOMContentLoaded', function() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const body = document.body;

  // Check for saved dark mode preference
  if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Dark mode toggle functionality
  darkModeToggle.addEventListener('change', function() {
    if (this.checked) {
      body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  });

  // ... Rest of your existing JavaScript code
});

