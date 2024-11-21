class GmailAICompanion {
  constructor() {
    this.initializeObservers();
  }

  initializeObservers() {
    // Observe changes in Gmail's interface
    const observer = new MutationObserver((mutations) => {
      this.checkForEmailContextAndInjectAITools();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkForEmailContextAndInjectAITools() {
    // Reading an email
    const emailViewContainer = document.querySelector('.a3s.aiL');
    if (emailViewContainer && !emailViewContainer.querySelector('.ai-tools-container')) {
      this.injectReadingTools(emailViewContainer);
    }

    // Composing an email
    const composeContainer = document.querySelector('.bAs');
    if (composeContainer && !composeContainer.querySelector('.ai-compose-tools')) {
      this.injectComposeTools(composeContainer);
    }
  }

  injectReadingTools(container) {
    const aiToolsContainer = document.createElement('div');
    aiToolsContainer.className = 'ai-tools-container';
    aiToolsContainer.innerHTML = `
      <div class="ai-action-buttons">
        <button class="ai-btn ai-summarize">📋 Summarize</button>
        <button class="ai-btn ai-translate">🌐 Translate</button>
      </div>
      <div class="ai-result-container"></div>
    `;

    // Summarize event listener
    aiToolsContainer.querySelector('.ai-summarize').addEventListener('click', () => {
      this.performAIAction('summarize', container.innerText);
    });

    // Translate event listener
    aiToolsContainer.querySelector('.ai-translate').addEventListener('click', () => {
      const language = prompt('Enter target language (e.g., Spanish):');
      if (language) {
        this.performAIAction('translate', container.innerText, language);
      }
    });

    container.appendChild(aiToolsContainer);
  }

  injectComposeTools(container) {
    const aiComposeTools = document.createElement('div');
    aiComposeTools.className = 'ai-compose-tools';
    aiComposeTools.innerHTML = `
      <div class="ai-compose-actions">
        <button class="ai-btn ai-improve">✍️ Improve Writing</button>
        <button class="ai-btn ai-generate">🤖 Generate Response</button>
      </div>
      <div class="ai-compose-result"></div>
    `;

    // Improve writing event listener
    aiComposeTools.querySelector('.ai-improve').addEventListener('click', () => {
      const emailBody = container.querySelector('textarea');
      if (emailBody) {
        this.performAIAction('improve', emailBody.value);
      }
    });

    // Generate response event listener
    aiComposeTools.querySelector('.ai-generate').addEventListener('click', () => {
      const emailBody = container.querySelector('textarea');
      if (emailBody) {
        this.performAIAction('generate', emailBody.value);
      }
    });

    container.appendChild(aiComposeTools);
  }

  performAIAction(action, content, additionalParam = null) {
    chrome.runtime.sendMessage({
      type: `AI_${action.toUpperCase()}`,
      content: content,
      language: additionalParam
    }, (response) => {
      this.displayAIResult(action, response);
    });
  }

  displayAIResult(action, response) {
    const resultContainer = document.querySelector(
      action === 'summarize' || action === 'translate' 
        ? '.ai-result-container' 
        : '.ai-compose-result'
    );

    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="ai-result">
          <h4>${this.getActionTitle(action)}</h4>
          <p>${response.result || 'Processing failed'}</p>
        </div>
      `;
    }
  }

  getActionTitle(action) {
    const titles = {
      'summarize': 'Email Summary',
      'translate': 'Translated Email',
      'improve': 'Improved Writing',
      'generate': 'Generated Response'
    };
    return titles[action] || 'AI Result';
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GmailAICompanion());
} else {
  new GmailAICompanion();
}