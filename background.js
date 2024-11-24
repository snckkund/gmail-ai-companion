// background.js
let modelStatus = {
    initialized: false,
    models: {
      languageModel: false,
      summarizer: false,
      translator: false,
      languageDetector: false
    }
  };
  
  // Handle messages from popup and content scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
      case 'GET_MODEL_STATUS':
        sendResponse(modelStatus);
        break;
      
      case 'UPDATE_MODEL_STATUS':
        modelStatus = {
          initialized: true,
          models: request.status
        };
        break;
    }
    return true;
  });
  
  // When extension is installed or updated
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
  });
  
  // Monitor for Gmail tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('mail.google.com')) {
      chrome.tabs.sendMessage(tabId, { type: 'CHECK_AI_STATUS' });
    }
  });