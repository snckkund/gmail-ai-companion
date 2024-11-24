// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusContainer = document.getElementById('modelStatus');
    
    function updateStatus(response) {
      statusContainer.innerHTML = '';
      
      if (!response.initialized) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = 'Checking AI availability...';
        statusContainer.appendChild(message);
        return;
      }
      
      Object.entries(response.models).forEach(([model, status]) => {
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        
        const modelName = document.createElement('span');
        modelName.textContent = model.replace(/([A-Z])/g, ' $1').trim();
        
        const statusWrapper = document.createElement('div');
        statusWrapper.className = 'status-wrapper';
        
        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.textContent = status ? 'Available' : 'Unavailable';
        
        const indicator = document.createElement('div');
        indicator.className = `status-indicator ${status ? 'status-active' : 'status-inactive'}`;
        
        statusWrapper.appendChild(statusText);
        statusWrapper.appendChild(indicator);
        
        statusItem.appendChild(modelName);
        statusItem.appendChild(statusWrapper);
        statusContainer.appendChild(statusItem);
      });
    }
  
    // Initial status check
    chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' }, updateStatus);
  });