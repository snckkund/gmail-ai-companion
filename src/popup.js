document.addEventListener('DOMContentLoaded', () => {
  const modelStatus = document.getElementById('model-status');
  const aiOutput = document.getElementById('ai-output');
  const summarizeBtn = document.getElementById('summarize-btn');
  const translateBtn = document.getElementById('translate-btn');
  const draftResponseBtn = document.getElementById('draft-response-btn');

  // Prevent multiple simultaneous clicks
  function preventMultipleClicks(button, handler) {
    let isProcessing = false;
    
    button.addEventListener('click', () => {
      if (isProcessing) return;
      
      isProcessing = true;
      button.disabled = true;
      
      handler(() => {
        isProcessing = false;
        button.disabled = false;
      });
    });
  }

  // Comprehensive error handling for AI model check
  function checkAIModelStatus() {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'CHECK_AI_MODEL' }, (response) => {
          if (chrome.runtime.lastError) {
            modelStatus.textContent = 'Communication Error';
            modelStatus.classList.add('unavailable');
            reject(chrome.runtime.lastError);
            return;
          }

          if (response && response.available !== undefined) {
            modelStatus.textContent = response.available ? 'Available' : 'Unavailable';
            modelStatus.classList.add(response.available ? 'available' : 'unavailable');
            resolve(response.available);
          } else {
            modelStatus.textContent = 'Status Unknown';
            modelStatus.classList.add('unavailable');
            reject(new Error('Unexpected response format'));
          }
        });
      } catch (error) {
        modelStatus.textContent = 'Error Checking Status';
        modelStatus.classList.add('unavailable');
        reject(error);
      }
    });
  }

  // Generic message handler with error management
  function sendTabMessage(messageType, additionalData = {}, onComplete) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        aiOutput.textContent = 'No active tab found';
        onComplete();
        return;
      }

      const message = { type: messageType, ...additionalData };
      
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          aiOutput.textContent = 'Communication error';
          console.error(chrome.runtime.lastError);
          onComplete();
          return;
        }

        aiOutput.textContent = 
          (response && (response.summary || response.translation || response.draft || response.error)) || 
          'Operation failed';
        
        onComplete();
      });
    });
  }

  // Call status check on popup load
  checkAIModelStatus().catch(console.error);

  // Prevent multiple clicks for each button
  preventMultipleClicks(summarizeBtn, (onComplete) => {
    sendTabMessage('ANALYZE_EMAIL', {}, onComplete);
  });

  preventMultipleClicks(translateBtn, (onComplete) => {
    const language = prompt('Enter target language:');
    if (!language) {
      aiOutput.textContent = 'No language selected';
      onComplete();
      return;
    }
    sendTabMessage('TRANSLATE_EMAIL', { targetLanguage: language }, onComplete);
  });

  preventMultipleClicks(draftResponseBtn, (onComplete) => {
    sendTabMessage('GENERATE_RESPONSE', {}, onComplete);
  });
});