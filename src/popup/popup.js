/**
 * Popup script for Gmail AI Companion
 */
class PopupUI {
    constructor() {
        this.statusElement = document.getElementById('status');
        this.retryCount = 0;
        this.maxRetries = 3; // Reduced from 5 to 3
        this.retryDelay = 2000; // Increased from 1000 to 2000ms
        this.checkInterval = null;
        this.currentTabId = null;
        this.init();
    }

    /**
     * Initialize popup
     */
    async init() {
        try {
            const tab = await this.checkGmailTab();
            if (tab) {
                this.currentTabId = tab.id;
                this.setupMessageListener();
                this.setupRefreshButton();
                this.checkAIStatus();
            }
        } catch (error) {
            console.error('Popup initialization error:', error);
            this.updateStatus('error', 'Failed to initialize popup');
        }
    }

    /**
     * Set up message listener for state changes
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Popup received message:', message);

            if (message.type === 'TAB_STATE_CHANGED' && message.tabId === this.currentTabId) {
                console.log('Tab state changed:', message.state);
                if (message.state.aiInitialized) {
                    this.checkAIStatus(); // Recheck AI status when state changes
                }
            }
        });
    }

    /**
     * Start periodic status check
     */
    startStatusCheck() {
        this.checkAIStatus(); // Initial check
        // Check every 5 seconds
        setInterval(() => this.checkAIStatus(), 5000);
    }

    /**
     * Setup refresh button
     */
    setupRefreshButton() {
        const refreshButton = document.getElementById('refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.retryCount = 0; // Reset retry count on manual refresh
                this.checkAIStatus();
            });
        }
    }

    /**
     * Check if current tab is Gmail
     */
    async checkGmailTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                const currentTab = tabs[0];
                if (!currentTab) {
                    this.updateStatus('error', 'No active tab found');
                    reject(new Error('No active tab'));
                    return;
                }

                if (!currentTab.url?.includes('mail.google.com')) {
                    this.updateStatus('error', 'Please open Gmail to use this extension');
                    reject(new Error('Not a Gmail tab'));
                    return;
                }

                // Check if tab is ready
                this.checkTabReady(currentTab.id);
                resolve(currentTab);
            });
        });
    }

    /**
     * Check if tab is ready
     */
    async checkTabReady(tabId) {
        chrome.runtime.sendMessage({ type: 'CHECK_TAB_READY', tabId }, response => {
            console.log('Tab ready check response:', response);
            if (response && response.ready) {
                this.retryCount = 0; // Reset retry count when tab is ready
                this.checkAIStatus();
            } else {
                this.updateStatus('loading', 'Waiting for Gmail to load...');
                // Retry after a delay if within retry limit
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    setTimeout(() => this.checkTabReady(tabId), this.retryDelay);
                } else {
                    this.updateStatus('error', 'Gmail is taking too long to load. Try refreshing the page.');
                }
            }
        });
    }

    /**
     * Check AI status
     */
    async checkAIStatus() {
        try {
            console.log('Checking AI status for tab:', this.currentTabId);
            
            // First check if tab is ready in background
            const readyResponse = await new Promise(resolve => {
                chrome.runtime.sendMessage({ 
                    type: 'CHECK_TAB_READY', 
                    tabId: this.currentTabId 
                }, response => {
                    console.log('Tab ready response:', response);
                    resolve(response);
                });
            });

            if (!readyResponse?.ready) {
                console.log('Tab not ready:', readyResponse);
                this.updateStatus('loading', 'Waiting for Gmail to load...');
                return;
            }

            // Now try to communicate with content script
            try {
                console.log('Sending GET_AI_STATUS to content script');
                const response = await this.sendMessageToContentScript(this.currentTabId, { 
                    type: 'GET_AI_STATUS' 
                });
                
                console.log('Received AI status response:', response);
                if (response && response.available) {
                    this.retryCount = 0;
                    this.updateStatus('ready', 'AI features are ready');
                    this.updateCapabilities(response.capabilities);
                    
                    // Clear check interval since we're ready
                    if (this.checkInterval) {
                        clearInterval(this.checkInterval);
                        this.checkInterval = null;
                    }
                } else {
                    this.updateStatus('loading', 'Initializing AI capabilities...');
                    this.handleRetry(this.currentTabId);
                }
            } catch (error) {
                console.error('Error communicating with content script:', error);
                this.handleRetry(this.currentTabId);
            }
        } catch (error) {
            console.error('Error checking AI status:', error);
            this.updateStatus('error', 'Failed to check AI status');
        }
    }

    /**
     * Send message to content script with Promise wrapper
     */
    sendMessageToContentScript(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, response => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(response);
            });
        });
    }

    /**
     * Handle retry logic
     */
    handleRetry(tabId) {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.updateStatus('loading', `Initializing... (${this.retryCount}/${this.maxRetries})`);
            setTimeout(() => this.checkAIStatus(), this.retryDelay);
        } else {
            this.updateStatus('error', 'Could not initialize AI. Try refreshing Gmail.');
            // Clear the check interval when max retries are reached
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
        }
    }

    /**
     * Update status display
     */
    updateStatus(type, message) {
        if (!this.statusElement) return;
        
        this.statusElement.className = `status ${type}`;
        this.statusElement.textContent = message;
        
        // Update icon based on status
        const icon = type === 'ready' ? '✓' : type === 'error' ? '✗' : '⟳';
        this.statusElement.dataset.icon = icon;

        // Log status update
        console.log(`Status updated: [${type}] ${message}`);
    }

    /**
     * Update capabilities display
     */
    updateCapabilities(capabilities) {
        const capabilitiesElement = document.getElementById('capabilities');
        if (!capabilitiesElement) return;

        const availableCapabilities = Object.entries(capabilities)
            .filter(([, available]) => available)
            .map(([name]) => name);

        if (availableCapabilities.length > 0) {
            capabilitiesElement.innerHTML = `
                <h3>Available Features:</h3>
                <ul>
                    ${availableCapabilities.map(cap => `<li>${this.formatCapabilityName(cap)}</li>`).join('')}
                </ul>
            `;
        } else {
            capabilitiesElement.innerHTML = '<p>No AI capabilities available</p>';
        }
    }

    /**
     * Format capability name for display
     */
    formatCapabilityName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .replace(/^\w/, c => c.toUpperCase());
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupUI();
});
