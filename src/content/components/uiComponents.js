/**
 * UI Components for Gmail AI integration
 */
class UIComponents {
    constructor() {
        this.buttonClass = 'ai-tool-button';
    }

    /**
     * Create AI tools container for Gmail interface
     * @param {string} type - Type of container ('compose' or 'view')
     * @returns {HTMLElement} The created container element
     */
    createToolsContainer(type) {
        const container = document.createElement('div');
        container.className = `gmail-ai-tools-container ${type}-tools`;
        
        if (type === 'compose') {
            container.innerHTML = this.getComposeToolsHTML();
        } else if (type === 'view') {
            container.innerHTML = this.getViewToolsHTML();
        }
        
        return container;
    }

    /**
     * Get HTML for compose tools
     * @returns {string} The HTML for compose tools
     */
    getComposeToolsHTML() {
        return `
            <button class="${this.buttonClass}" data-action="write">✨ Write</button>
            <button class="${this.buttonClass}" data-action="rewrite">🔄 Rewrite</button>
            <button class="${this.buttonClass}" data-action="translate">🌐 Translate</button>
            ${this.createLanguageSelectHTML()}
        `;
    }

    /**
     * Get HTML for view tools
     * @returns {string} The HTML for view tools
     */
    getViewToolsHTML() {
        return `
            <button class="${this.buttonClass}" data-action="summarize">📝 Summarize</button>
            <button class="${this.buttonClass}" data-action="translate">🌐 Translate</button>
            ${this.createLanguageSelectHTML()}
        `;
    }

    /**
     * Create language selection dropdown HTML
     * @returns {string} The HTML for language selection dropdown
     */
    createLanguageSelectHTML() {
        return `
            <select class="language-select" aria-label="Select target language">
                <option value="" disabled selected>Select language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese (Simplified)</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
            </select>
        `;
    }

    /**
     * Create output container for AI results
     * @param {string} action - Action type
     * @param {string} content - Content to display
     * @returns {HTMLElement} The created output container element
     */
    createOutputContainer(action, content) {
        const container = document.createElement('div');
        container.className = 'gmail-ai-output-container';
        
        const header = document.createElement('div');
        header.className = 'gmail-ai-output-header';
        header.textContent = this.getActionTitle(action);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'gmail-ai-output-content';
        contentDiv.textContent = content;
        
        container.appendChild(header);
        container.appendChild(contentDiv);
        
        return container;
    }

    /**
     * Get title for action
     * @param {string} action - Action type
     * @returns {string} The title for the action
     */
    getActionTitle(action) {
        const titles = {
            'write': 'AI Generated Text',
            'rewrite': 'Rewritten Text',
            'summarize': 'Email Summary',
            'translate': 'Translated Text'
        };
        return titles[action] || `${action.charAt(0).toUpperCase() + action.slice(1)} Result`;
    }

    /**
     * Show loading state for an element
     * @param {HTMLElement} button - Element to show loading state
     */
    showLoading(button) {
        button.disabled = true;
        button.classList.add('loading');
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.textContent = 'Processing...';
    }

    /**
     * Hide loading state for an element
     * @param {HTMLElement} button - Element to hide loading state
     */
    hideLoading(button) {
        button.disabled = false;
        button.classList.remove('loading');
        const originalText = button.dataset.originalText;
        if (originalText) {
            button.textContent = originalText;
            delete button.dataset.originalText;
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, etc.)
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `gmail-ai-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

window.UIComponents = new UIComponents();
