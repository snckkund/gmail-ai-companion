/**
 * Background script for Gmail AI Companion
 */

// Track active Gmail tabs and their states
const tabStates = new Map();

/**
 * Update tab state and ensure all properties are preserved
 */
function updateTabState(tabId, updates) {
    const currentState = tabStates.get(tabId) || {};
    const newState = { ...currentState, ...updates };
    tabStates.set(tabId, newState);
    console.log(`Tab ${tabId} state updated:`, newState);

    // Notify all open popups about the state change
    chrome.runtime.sendMessage({
        type: 'TAB_STATE_CHANGED',
        tabId: tabId,
        state: newState
    }).catch(() => {
        // Ignore errors when no popups are open to receive the message
    });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url?.includes('mail.google.com')) {
        console.log(`Tab ${tabId} updated:`, changeInfo);
        
        // Track tab state changes
        if (changeInfo.status === 'complete') {
            // Don't reset aiInitialized on Gmail SPA navigation
            const currentState = tabStates.get(tabId) || {};
            updateTabState(tabId, { 
                loaded: true,
                // Preserve AI initialization state during Gmail navigation
                aiInitialized: currentState.aiInitialized ?? false,
                capabilities: currentState.capabilities
            });
            
            // Notify the tab that it's ready
            chrome.tabs.sendMessage(tabId, { type: 'TAB_READY' }).catch(() => {
                // Content script not ready yet, that's okay
                console.log(`Tab ${tabId} not ready for TAB_READY message`);
            });
        }
        
        // Handle Gmail SPA navigation
        if (changeInfo.url) {
            const currentState = tabStates.get(tabId) || {};
            updateTabState(tabId, { 
                url: changeInfo.url,
                // Preserve AI state and capabilities during navigation
                aiInitialized: currentState.aiInitialized ?? false,
                capabilities: currentState.capabilities
            });
        }
    }
});

// Listen for tab removals
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
    console.log(`Tab ${tabId} removed, remaining tabs:`, Array.from(tabStates.keys()));
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message, 'from:', sender);

    if (message.type === 'GET_GMAIL_TABS') {
        chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
            const activeTabIds = tabs.map(tab => tab.id)
                .filter(id => {
                    const state = tabStates.get(id);
                    return state && state.loaded && state.aiInitialized;
                });
            console.log('Active Gmail tabs:', activeTabIds);
            sendResponse({ tabs: activeTabIds });
        });
        return true;
    }
    
    if (message.type === 'CHECK_TAB_READY') {
        const tabId = message.tabId;
        const state = tabStates.get(tabId) || {};
        const isReady = state.loaded && state.aiInitialized;
        console.log(`Tab ${tabId} ready check:`, { state, isReady });
        sendResponse({ ready: isReady, state });
        return false;
    }

    if (message.type === 'AI_INITIALIZED') {
        const tabId = sender.tab?.id;
        if (!tabId) {
            console.error('No tab ID in AI_INITIALIZED message');
            sendResponse({ success: false });
            return false;
        }

        console.log(`AI initialized in tab ${tabId} with capabilities:`, message.capabilities);
        
        // Update state while preserving the current URL
        const currentState = tabStates.get(tabId) || {};
        updateTabState(tabId, { 
            aiInitialized: true,
            loaded: true,
            capabilities: message.capabilities,
            url: currentState.url
        });
        
        sendResponse({ success: true });
        return false;
    }

    if (message.type === 'RESET_AI_STATE') {
        const tabId = sender.tab?.id;
        if (!tabId) {
            console.error('No tab ID in RESET_AI_STATE message');
            sendResponse({ success: false });
            return false;
        }

        console.log(`Resetting AI state for tab ${tabId}`);
        const currentState = tabStates.get(tabId) || {};
        updateTabState(tabId, { 
            aiInitialized: false,
            capabilities: null,
            url: currentState.url
        });
        sendResponse({ success: true });
        return false;
    }
});
