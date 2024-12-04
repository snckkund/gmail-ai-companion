/**
 * DOM utility functions for Gmail AI integration
 */
const DOMUtils = {
    /**
     * Create a throttled version of a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if an element is a valid compose window
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is a valid compose window
     */
    isValidComposeWindow(element) {
        return element && 
               !element.querySelector('.gmail-ai-tools-container') &&
               (element.querySelector('[role="textbox"]') || 
                element.querySelector('[contenteditable="true"]'));
    },

    /**
     * Check if an element has AI tools
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element has AI tools
     */
    hasAITools(element) {
        return element.querySelector('.gmail-ai-tools-container') !== null;
    },

    /**
     * Get the email content from a compose window
     * @param {HTMLElement} composeWindow - Compose window element
     * @returns {string} Email content
     */
    getEmailContent(composeWindow) {
        const textbox = composeWindow.querySelector('[role="textbox"]') ||
                       composeWindow.querySelector('[contenteditable="true"]');
        return textbox ? textbox.innerHTML : '';
    },

    /**
     * Set email content in a compose window
     * @param {HTMLElement} composeWindow - Compose window element
     * @param {string} content - Content to set
     */
    setEmailContent(composeWindow, content) {
        const textbox = composeWindow.querySelector('[role="textbox"]') ||
                       composeWindow.querySelector('[contenteditable="true"]');
        if (textbox) {
            textbox.innerHTML = content;
        }
    },

    /**
     * Create and insert a status message
     * @param {HTMLElement} container - Container element
     * @param {string} message - Message to display
     * @param {string} type - Message type ('success' or 'error')
     */
    showStatus(container, message, type = 'success') {
        const status = document.createElement('div');
        status.className = `ai-status-message ${type}`;
        status.textContent = message;
        container.appendChild(status);
        
        setTimeout(() => {
            status.remove();
        }, 3000);
    }
};

window.DOMUtils = DOMUtils;
