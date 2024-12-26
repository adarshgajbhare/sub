let channels = [];
let delay = 5000;
let currentIndex = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSubscription') {
    channels = message.channels;
    delay = message.delay;
    currentIndex = 0;
    subscribeToNextChannel();
  }
});

async function subscribeToNextChannel() {
  if (currentIndex >= channels.length) {
    chrome.runtime.sendMessage({ action: 'subscriptionComplete' });
    return;
  }

  const channel = channels[currentIndex];
  currentIndex++;

  try {
    const tab = await chrome.tabs.create({ url: channel, active: false });
    await new Promise(resolve => setTimeout(resolve, delay));

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: subscribeToChannel,
      });

      if (result[0].result === true) {
        chrome.runtime.sendMessage({ action: 'subscribed', index: currentIndex });
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      if (attempts === maxAttempts) {
        chrome.runtime.sendMessage({ action: 'subscriptionFailed', index: currentIndex });
      }
    }

    await chrome.tabs.remove(tab.id);
  } catch (error) {
    console.error('Error subscribing to channel:', error);
    chrome.runtime.sendMessage({ action: 'subscriptionError', index: currentIndex, error: error.message });
  }

  subscribeToNextChannel();
}

function subscribeToChannel() {
  try {
    const selectors = [
      'yt-button-shape button[aria-label*="Subscribe"]',
      '.yt-spec-button-shape-next:not([aria-label*="Subscribed"])',
      '#subscribe-button button:not([aria-label*="Subscribed"])',
      'ytd-subscribe-button-renderer button:not([aria-label*="Subscribed"])',
      '#subscribe button:not([aria-label*="Subscribed"])'
    ];

    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);

      for (const button of buttons) {
        const buttonText = button.textContent.toLowerCase();
        const buttonLabel = (button.getAttribute('aria-label') || '').toLowerCase();

        if (
          (buttonText.includes('subscribe') && !buttonText.includes('subscribed')) ||
          (buttonLabel.includes('subscribe') && !buttonLabel.includes('subscribed'))
        ) {
          button.click();
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error in subscribeToChannel:', error);
    return false;
  }
}