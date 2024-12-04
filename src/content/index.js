/**
 * Main entry point for Gmail AI integration
 */
class GmailAIIntegration {
    constructor() {
        this.initialized = false;
        this.initializationStarted = false;
        console.log('GmailAIIntegration constructor called');
        this.initializeAsync();
    }

    /**
     * Initialize asynchronously
     */
    async initializeAsync() {
        console.log('Starting async initialization...');
        
        // Wait for Gmail to be ready
        let attempts = 0;
        while (!document.querySelector('[role="main"]') && attempts < 20) {
            console.log('Waiting for Gmail UI...');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!document.querySelector('[role="main"]')) {
            console.error('Gmail UI not found after waiting');
            return;
        }

        // Wait for chrome.runtime to be available
        attempts = 0;
        while (!chrome?.runtime && attempts < 10) {
            console.log('Waiting for chrome.runtime...');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!chrome?.runtime) {
            console.error('Chrome runtime not available');
            return;
        }

        console.log('Gmail UI and chrome.runtime ready, initializing...');
        this.setupMessageListener();
        this.setupEventListeners();
        await this.init();
    }

    /**
     * Initialize the extension
     */
    async init() {
        if (this.initializationStarted) {
            console.log('Initialization already in progress');
            return false;
        }

        this.initializationStarted = true;
        console.log('Starting Gmail AI initialization...');

        try {
            // Wait for AIService to be available
            let attempts = 0;
            while (!window.AIService && attempts < 10) {
                console.log('Waiting for AIService to be available...');
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (!window.AIService) {
                console.error('AIService not available after waiting');
                this.initializationStarted = false;
                return false;
            }

            console.log('AIService found, initializing...');
            const initialized = await window.AIService.initialize();
            
            if (initialized) {
                this.initialized = true;
                this.setupMutationObserver();
                this.checkForComposeWindows();
                
                // Get capabilities
                const capabilities = await window.AIService.checkCapabilities();
                console.log('AI capabilities:', capabilities);
                
                // Notify background script about successful initialization
                console.log('Sending AI_INITIALIZED message to background');
                await chrome.runtime.sendMessage({ 
                    type: 'AI_INITIALIZED',
                    capabilities: capabilities
                });
                
                console.log('Gmail AI Integration initialized successfully');
                this.initializationStarted = false;
                return true;
            } else {
                console.warn('Failed to initialize AI services');
                this.initialized = false;
                this.initializationStarted = false;
                return false;
            }
        } catch (error) {
            console.error('Error initializing Gmail AI Integration:', error);
            this.initialized = false;
            this.initializationStarted = false;
            return false;
        }
    }

    /**
     * Set up message listener for popup communication
     */
    setupMessageListener() {
        if (typeof chrome === 'undefined' || !chrome?.runtime?.onMessage) {
            console.warn('Chrome runtime not available for message listener');
            return;
        }

        try {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('Content script received message:', request);
                
                if (request.type === 'GET_AI_STATUS') {
                    this.handleGetAIStatus(sendResponse);
                    return true; // Will respond asynchronously
                }

                if (request.type === 'TAB_READY') {
                    this.handleTabReady();
                    return false;
                }

                if (request.type === 'CHECK_AI_STATUS') {
                    window.AIService?.initialize().then(() => {
                        this.updateToolsAvailability();
                    });
                    return false;
                }
            });
        } catch (error) {
            console.error('Error setting up message listener:', error);
        }
    }

    setupEventListeners() {
        // Listen for button clicks in both compose and view modes
        document.addEventListener('click', async (event) => {
            const button = event.target.closest('.ai-tool-button');
            if (!button) return;

            const toolId = button.dataset.toolId;
            if (!toolId) return;

            try {
                this.showLoading(button);
                const container = button.closest('.gmail-ai-tools-container');
                const type = container.classList.contains('compose-tools') ? 'compose' : 'view';

                // Make sure AIService is initialized
                if (!window.AIService?.isAvailable()) {
                    console.log('Waiting for AIService to initialize...');
                    await window.AIService?.initialize();
                }

                await this.handleToolAction(toolId, container);
            } catch (error) {
                console.error(`Error in ${toolId}:`, error);
                this.showNotification(`Error: ${error.message}`, 'error');
            } finally {
                this.hideLoading(button);
            }
        });

        // Listen for language selector changes
        document.addEventListener('change', (event) => {
            const select = event.target;
            if (select.classList.contains('language-select')) {
                const container = select.closest('.gmail-ai-tools-container');
                const translateBtn = container.querySelector('.translate-button');
                if (translateBtn) {
                    translateBtn.dataset.targetLang = select.value;
                }
            }
        });
    }

    updateToolsAvailability() {
        const isAvailable = window.AIService?.isAvailable();
        const buttons = document.querySelectorAll('.ai-tool-button');
        buttons.forEach(button => {
            button.disabled = !isAvailable;
            button.title = isAvailable ? '' : 'AI tools not available';
        });
    }

    showLoading(button) {
        button.disabled = true;
        button.classList.add('loading');
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.textContent = 'Processing...';
    }

    hideLoading(button) {
        button.disabled = false;
        button.classList.remove('loading');
        const originalText = button.dataset.originalText;
        if (originalText) {
            button.textContent = originalText;
            delete button.dataset.originalText;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `gmail-ai-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            background-color: ${type === 'success' ? '#34A853' : '#EA4335'};
            color: white;
            font-size: 14px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Handle GET_AI_STATUS message
     */
    async handleGetAIStatus(sendResponse) {
        console.log('Handling GET_AI_STATUS request');
        console.log('Current state:', {
            initialized: this.initialized,
            initializationStarted: this.initializationStarted,
            hasAIService: !!window.AIService,
            aiServiceInitialized: window.AIService?.initialized
        });

        // If not initialized and not currently initializing, try to initialize
        if (!this.initialized && !this.initializationStarted) {
            console.log('Attempting initialization from status check');
            await this.init();
        }

        // Check current status
        const isInitialized = this.initialized && window.AIService?.isAvailable();
        let capabilities = {};

        try {
            if (window.AIService) {
                capabilities = await window.AIService.checkCapabilities();
            }
        } catch (error) {
            console.error('Error checking capabilities:', error);
        }

        const response = {
            available: isInitialized,
            capabilities: capabilities
        };

        console.log('Sending status response:', response);
        sendResponse(response);

        // If initialized, ensure background knows about it
        if (isInitialized) {
            try {
                await chrome.runtime.sendMessage({ 
                    type: 'AI_INITIALIZED',
                    capabilities: capabilities
                });
                console.log('Notified background of initialization');
            } catch (error) {
                console.error('Error notifying background:', error);
            }
        }
    }

    /**
     * Handle TAB_READY message
     */
    async handleTabReady() {
        console.log('Handling TAB_READY message');
        console.log('Current initialization status:', {
            initialized: this.initialized,
            initializationStarted: this.initializationStarted
        });

        if (!this.initialized && !this.initializationStarted) {
            const success = await this.init();
            console.log('Initialization result:', success);
        } else {
            console.log('No initialization needed');
        }
    }

    /**
     * Setup listener for Gmail SPA navigation
     */
    setupNavigationListener() {
        // Watch for URL changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.handleNavigation();
            }
        }).observe(document, { subtree: true, childList: true });

        // Also watch for Gmail's custom navigation events
        document.addEventListener('hashchange', () => this.handleNavigation());
    }

    /**
     * Handle Gmail navigation
     */
    async handleNavigation() {
        console.log('Gmail navigation detected');
        // Reset AI state
        await AIService.cleanup();
        chrome.runtime.sendMessage({ type: 'RESET_AI_STATE' });
        // Re-initialize
        this.init();
    }

    /**
     * Set up mutation observer for Gmail interface changes
     */
    setupMutationObserver() {
        const observer = new MutationObserver(
            this.throttle((mutations) => {
                let shouldCheck = mutations.some(mutation => 
                    mutation.addedNodes.length > 0 || mutation.type === 'attributes'
                );

                if (shouldCheck) {
                    this.checkForComposeWindows();
                }
            }, window.Config.ui.throttleDelay)
        );

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    /**
     * Throttle function to limit execution rate
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    /**
     * Check for and enhance compose windows
     */
    checkForComposeWindows() {
        if (!window.Config || !window.Config.selectors) {
            console.error('Config or selectors not defined');
            return;
        }

        console.log('Checking for compose windows and reply boxes...');
        
        try {
            // First, check for compose windows
            const composeSelectors = window.Config.selectors.composeWindows;
            console.log('Compose selectors:', composeSelectors);
            
            composeSelectors.forEach(selector => {
                const windows = document.querySelectorAll(selector);
                console.log(`Found ${windows.length} potential compose windows for selector: ${selector}`);
                
                windows.forEach((window, index) => {
                    console.log(`Checking compose window ${index + 1}:`, window);
                    if (this.isValidComposeWindow(window)) {
                        if (!this.hasAITools(window)) {
                            console.log(`Adding tools to compose window ${index + 1}`);
                            const toolsContainer = this.createToolsContainer('compose');
                            this.addToolsToWindow(window, toolsContainer);
                        } else {
                            console.log(`Window ${index + 1} already has AI tools`);
                        }
                    } else {
                        console.log(`Window ${index + 1} is not a valid compose window`);
                    }
                });
            });

            // Check for reply boxes
            const replyBoxSelectors = [
                '.ip.iq',  // Inline reply box
                '.gA.gt',  // Full reply box
                '.adn',    // Another reply container variant
                '.Am.aO9'  // Reply editor container
            ];

            replyBoxSelectors.forEach(selector => {
                const replyBoxes = document.querySelectorAll(selector);
                console.log(`Found ${replyBoxes.length} reply boxes for selector: ${selector}`);

                replyBoxes.forEach((box, index) => {
                    // Verify it's a reply box by checking for the editor
                    const hasEditor = box.querySelector('.Am.Al.editable, [role="textbox"]');
                    const isInCompose = box.closest('.M9, [role="dialog"]')?.querySelector('.aO.gZT');
                    
                    if (hasEditor && !isInCompose && !this.hasAITools(box)) {
                        console.log(`Adding tools to reply box ${index + 1}`);
                        const toolsContainer = this.createToolsContainer('reply');
                        this.addToolsToReplyBox(box, toolsContainer);
                    }
                });
            });

            // Then, check for email view
            const emailViewSelector = window.Config.selectors.emailView;
            const emailViews = document.querySelectorAll(emailViewSelector);
            console.log(`Found ${emailViews.length} email views for selector: ${emailViewSelector}`);
            
            emailViews.forEach((view, index) => {
                if (!this.hasAITools(view)) {
                    console.log(`Adding tools to email view ${index + 1}`);
                    const toolsContainer = this.createToolsContainer('view');
                    this.addToolsToWindow(view, toolsContainer);
                }
            });
        } catch (error) {
            console.error('Error in checkForComposeWindows:', error);
        }
    }

    /**
     * Add tools specifically to reply box
     */
    addToolsToReplyBox(replyBox, toolsContainer) {
        try {
            // Find the editor container within the reply box
            const editorContainer = replyBox.querySelector('.Am.Al.editable, [role="textbox"]')?.parentElement;
            if (!editorContainer) {
                console.error('Could not find editor container in reply box');
                return;
            }

            // Insert the tools container before the editor
            editorContainer.insertBefore(toolsContainer, editorContainer.firstChild);
            console.log('Successfully added tools to reply box');

        } catch (error) {
            console.error('Error adding tools to reply box:', error);
        }
    }

    /**
     * Check if a compose window is valid
     */
    isValidComposeWindow(window) {
        if (!window) return false;
        
        try {
            const hasTextbox = window.querySelector(window.Config?.selectors?.textbox || '[role="textbox"]');
            const hasContentEditable = window.querySelector(window.Config?.selectors?.contentEditable || '[contenteditable="true"]');
            
            // Log for debugging
            console.log('Checking compose window:', {
                hasTextbox: !!hasTextbox,
                hasContentEditable: !!hasContentEditable
            });
            
            return hasTextbox || hasContentEditable;
        } catch (error) {
            console.error('Error in isValidComposeWindow:', error);
            return false;
        }
    }

    /**
     * Check if AI tools are already added
     */
    hasAITools(element) {
        const containerClass = window.Config?.ui?.containerClass || 'gmail-ai-tools-container';
        return element.querySelector('.' + containerClass) !== null;
    }

    /**
     * Add AI tools to a window (compose or view)
     */
    addToolsToWindow(window, toolsContainer) {
        try {
            console.log('Adding tools to window:', window);
            
            // Check if this is a compose window or email view
            const isComposeWindow = window.querySelector('[role="textbox"]') || 
                                  window.querySelector('[contenteditable="true"]');
            
            if (isComposeWindow) {
                // For compose window, insert before the textbox
                const textboxSelector = window.Config?.selectors?.textbox || '[role="textbox"]';
                const contentEditableSelector = window.Config?.selectors?.contentEditable || '[contenteditable="true"]';
                
                const targetElement = window.querySelector(textboxSelector) || 
                                    window.querySelector(contentEditableSelector);
                
                if (targetElement && targetElement.parentNode) {
                    targetElement.parentNode.insertBefore(toolsContainer, targetElement);
                    console.log('Successfully added tools to compose window');
                } else {
                    console.error('Could not find compose textbox to insert tools');
                }
            } else {
                // For email view, try multiple insertion points
                const headerSelector = window.Config?.selectors?.emailHeader || '.ha h2, .h7';
                const bodySelector = window.Config?.selectors?.emailBody || '.a3s.aiL';
                
                // First try to insert after the header
                const header = window.querySelector(headerSelector);
                if (header && header.parentNode) {
                    header.parentNode.insertBefore(toolsContainer, header.nextSibling);
                    console.log('Successfully added tools after email header');
                    return;
                }
                
                // Then try to insert before the body
                const body = window.querySelector(bodySelector);
                if (body && body.parentNode) {
                    body.parentNode.insertBefore(toolsContainer, body);
                    console.log('Successfully added tools before email body');
                    return;
                }
                
                // If all else fails, try to append to the window itself
                if (window.classList.contains('adn') || window.classList.contains('ads')) {
                    window.appendChild(toolsContainer);
                    console.log('Successfully added tools to email container');
                } else {
                    console.error('Could not find suitable location to insert tools in email view');
                }
            }
        } catch (error) {
            console.error('Error in addToolsToWindow:', error);
        }
    }

    /**
     * Get email subject from compose window
     * @param {HTMLElement} container - Container element
     * @returns {string} Email subject
     */
    getEmailSubject(container) {
        const composeWindow = container.closest('.M9');
        if (!composeWindow) {
            console.error('Compose window not found');
            return null;
        }

        const subjectInput = composeWindow.querySelector('input[name="subjectbox"]');
        if (!subjectInput) {
            console.error('Subject input not found');
            return null;
        }

        return subjectInput.value.trim();
    }

    /**
     * Set email subject in compose window
     * @param {HTMLElement} container - Container element
     * @param {string} subject - Subject to set
     */
    setEmailSubject(container, subject) {
        const composeWindow = container.closest('.M9');
        if (!composeWindow) {
            console.error('Compose window not found');
            return;
        }

        const subjectInput = composeWindow.querySelector('input[name="subjectbox"]');
        if (!subjectInput) {
            console.error('Subject input not found');
            return;
        }

        subjectInput.value = subject;
        // Trigger input event to ensure Gmail updates properly
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * Get content from compose window
     */
    getComposeContent(container) {
        console.log('Getting compose content from container:', {
            containerClasses: container.className,
            containerRole: container.getAttribute('role'),
            hasParentCompose: !!container.closest('.M9'),
            hasParentDialog: !!container.closest('[role="dialog"]')
        });

        // First try to get the compose window
        const composeWindow = container.closest('.M9') || 
                            container.closest('[role="dialog"]') ||
                            container.closest('.AD') ||
                            container; // Fallback to container itself

        console.log('Found compose window:', {
            found: !!composeWindow,
            classes: composeWindow?.className,
            role: composeWindow?.getAttribute('role')
        });

        // Try multiple selectors to find the editor
        const editorSelectors = [
            '[role="textbox"]',
            '[contenteditable="true"]',
            '.Am.Al.editable',
            '.Ar.Au',
            '[aria-label="Message Body"]',
            '.gmail_default',
            '.editable',
            // Add Gmail-specific selectors
            '.gmail-editor',
            '.compose-content'
        ];

        let editor = null;
        let usedSelector = null;

        // First try within compose window
        for (const selector of editorSelectors) {
            editor = composeWindow.querySelector(selector);
            if (editor) {
                usedSelector = selector;
                break;
            }
        }

        // If not found, try the container itself
        if (!editor) {
            for (const selector of editorSelectors) {
                if (container.matches(selector)) {
                    editor = container;
                    usedSelector = 'container-self';
                    break;
                }
            }
        }

        // If still not found, try searching up the parent chain
        if (!editor) {
            let parent = container.parentElement;
            while (parent && !editor) {
                for (const selector of editorSelectors) {
                    if (parent.matches(selector)) {
                        editor = parent;
                        usedSelector = 'parent-match';
                        break;
                    }
                }
                parent = parent.parentElement;
            }
        }

        console.log('Editor search result:', {
            found: !!editor,
            usedSelector,
            editorClasses: editor?.className,
            editorRole: editor?.getAttribute('role'),
            hasContent: editor?.textContent?.length > 0
        });

        if (!editor) {
            console.error('Editor not found with selectors:', editorSelectors);
            return null;
        }

        // Get text content, trying multiple properties
        let content = '';
        
        // Try different ways to get content
        if (editor.value !== undefined && editor.value !== '') {
            content = editor.value;
        } else if (editor.innerText) {
            content = editor.innerText;
        } else if (editor.textContent) {
            content = editor.textContent;
        } else {
            // Try getting content from child nodes
            const textNodes = Array.from(editor.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR')
                .map(node => node.nodeType === Node.TEXT_NODE ? node.textContent : '\n')
                .join('');
            if (textNodes) {
                content = textNodes;
            }
        }

        console.log('Content extraction result:', {
            hasContent: !!content,
            contentLength: content.length,
            firstChars: content ? content.substring(0, 20) + '...' : 'none'
        });

        return content.trim();
    }

    /**
     * Get email content from email view or reply context
     * @param {HTMLElement} container - Container element
     * @returns {string} Email content
     */
    getEmailContent(container) {
        // Get container type
        const type = container.getAttribute('data-type');
        console.log('Getting email content for type:', type);

        // Clean and validate content
        const cleanContent = (content) => {
            if (!content) return null;
            
            // Remove excessive whitespace and normalize line breaks
            let cleaned = content.trim()
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n\s*\n/g, '\n\n');

            // Remove common email clutter
            cleaned = cleaned
                .replace(/From:.*?\n/g, '')
                .replace(/To:.*?\n/g, '')
                .replace(/Subject:.*?\n/g, '')
                .replace(/On.*wrote:$/gm, '')
                .replace(/>[^\n]*/g, '')  // Remove quoted text
                .replace(/\[External\]|\[EXTERNAL\]/gi, '')
                .trim();

            return cleaned.length > 10 ? cleaned : null;
        };

        // For email view containers
        if (type === 'view') {
            const emailContainer = container.closest('.gs');
            if (!emailContainer) {
                console.error('Email container not found for view');
                return null;
            }

            // Try multiple selectors in priority order
            const viewSelectors = [
                '.a3s.aiL',                    // Main email content
                '.adP.adO > div:first-child',  // Email body in expanded view
                '.adP > div:first-child',      // Email body in compact view
                '.ii.gt',                      // Alternative email content
                '.gmail_quote:not([style*="display: none"])',  // Visible quoted text
                '.adn'                         // Email container
            ];

            for (const selector of viewSelectors) {
                const elements = emailContainer.querySelectorAll(selector);
                for (const element of elements) {
                    const content = cleanContent(element.innerText || element.textContent);
                    if (content) {
                        console.log('Found view content with selector:', selector);
                        return content;
                    }
                }
            }
        }

        // For reply context
        if (type === 'reply') {
            const replyBox = container.closest('.ip.iq') || 
                            container.closest('.gA.gt') || 
                            container.closest('.adn');

            if (replyBox) {
                // Get all email blocks in the thread
                const emailBlocks = document.querySelectorAll('.adn.ads');
                let originalEmail = null;

                // Find the email we're replying to (usually the previous one)
                for (const block of emailBlocks) {
                    if (!replyBox.contains(block)) {
                        const content = cleanContent(block.innerText || block.textContent);
                        if (content) {
                            originalEmail = content;
                            break;
                        }
                    }
                }

                if (originalEmail) {
                    console.log('Found original email in thread');
                    return originalEmail;
                }

                // Fallback to quoted content
                const quotedContent = replyBox.querySelector('.gmail_quote');
                if (quotedContent) {
                    const content = cleanContent(quotedContent.innerText || quotedContent.textContent);
                    if (content) {
                        console.log('Found content in quote');
                        return content;
                    }
                }
            }
        }

        // Try general content extraction as fallback
        const allSelectors = [
            '.a3s.aiL',
            '.ii.gt',
            '.adP.adO > div:first-child',
            '.adP > div:first-child',
            '.gmail_quote:not([style*="display: none"])',
            '.adn',
            '.h7'
        ];

        let element = container;
        while (element) {
            for (const selector of allSelectors) {
                const elements = element.querySelectorAll(selector);
                for (const el of elements) {
                    const content = cleanContent(el.innerText || el.textContent);
                    if (content) {
                        console.log('Found content with fallback selector:', selector);
                        return content;
                    }
                }
            }
            element = element.parentElement;
        }

        console.error('No valid email content found');
        return null;
    }

    /**
     * Handle tool action
     * @param {string} toolId - Tool ID to handle
     * @param {HTMLElement} container - Container element
     */
    async handleToolAction(toolId, container) {
        let outputContainer = container.querySelector('.gmail-ai-output');
        if (!outputContainer) {
            outputContainer = document.createElement('div');
            outputContainer.className = 'gmail-ai-output';
            outputContainer.style.cssText = 'margin: 10px 0; padding: 10px; border-left: 3px solid #4285f4; background: #f8f9fa;';
            container.appendChild(outputContainer);
        }

        try {
            // Set loading state
            outputContainer.innerHTML = 'Processing...';
            const button = container.querySelector(`[data-tool-id="${toolId}"]`);
            if (button) {
                button.classList.add('loading');
                button.disabled = true;
            }

            // Define timeout duration
            const TIMEOUT_DURATION = 30000; // 30 seconds
            let timeoutId = null;

            try {
                // Get email content
                const emailContent = this.getEmailContent(container);
                if (!emailContent) {
                    throw new Error('No email content found');
                }
                console.log('Found email content:', emailContent);

                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('AI operation timed out'));
                    }, TIMEOUT_DURATION);
                });

                // Configure AI writer for better responses
                const writer = await ai.writer.create({
                    sharedContext: 'Professional email communication',
                    temperature: 0.3,
                    maxTokens: 800,
                    topP: 0.8
                });

                let response;
                switch (toolId) {
                    case 'quick-response': {
                        const prompt = `Create a professional email response to this message:
${emailContent}
Guidelines for the response:
1. Address the main points directly
2. Keep a professional and courteous tone
3. Be clear about any actions you'll take
4. Include specific next steps if needed
5. Close with a clear call to action if appropriate
Make the response concise but thorough, maintaining professionalism throughout.`;

                        response = await Promise.race([
                            writer.write(prompt),
                            timeoutPromise
                        ]);

                        // Insert response into editor
                        const editor = this.getActiveEditor(container);
                        if (editor) {
                            if (editor.isContentEditable) {
                                editor.innerHTML = response.replace(/\n/g, '<br>');
                            } else {
                                editor.value = response;
                            }
                            // Dispatch events
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                            editor.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        break;
                    }
                    case 'summarize': {
                        const prompt = `Analyze and summarize this email concisely:
${emailContent}
Provide a structured summary including:
1. Main Topic: The primary subject or purpose
2. Key Points: Important details and information
3. Action Items: Required actions, if any
4. Timeline: Any mentioned deadlines or dates
5. Next Steps: Follow-up actions or responses needed`;

                        response = await Promise.race([
                            writer.write(prompt),
                            timeoutPromise
                        ]);

                        // Format summary with HTML
                        response = response.trim()
                            .replace(/(\d+\. .*?):/g, '<strong>$1:</strong>')
                            .replace(/\n/g, '<br>')
                            .replace(/• /g, '&bull; ')
                            .replace(/\*([^\*]+)\*/g, '<em>$1</em>');

                        outputContainer.innerHTML = response;
                        break;
                    }
                    case 'translate': {
                        const targetLang = container.querySelector('.language-select')?.value || 'en';
                        
                        // First detect the source language
                        const detector = await ai.languageDetector.create();
                        const detectionResult = await Promise.race([
                            detector.detect(emailContent),
                            timeoutPromise
                        ]);

                        if (!detectionResult || !detectionResult[0]) {
                            throw new Error('Could not detect source language');
                        }

                        const sourceLanguage = detectionResult[0].detectedLanguage;
                        const confidence = (detectionResult[0].confidence * 100).toFixed(1);

                        // Map language codes to readable names
                        const languageNames = {
                            'en': 'English',
                            'es': 'Spanish',
                            'fr': 'French',
                            'de': 'German',
                            'it': 'Italian',
                            'pt': 'Portuguese',
                            'ru': 'Russian',
                            'ja': 'Japanese',
                            'ko': 'Korean',
                            'zh': 'Chinese'
                        };

                        // Use translation API with detected language
                        const translator = await ai.translator.create({
                            sourceLanguage: sourceLanguage,
                            targetLanguage: targetLang
                        });

                        response = await Promise.race([
                            translator.translate(emailContent),
                            timeoutPromise
                        ]);

                        // Show detected language and confidence
                        const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
                        const targetLangName = languageNames[targetLang] || targetLang;
                        const detectedInfo = `<div style="margin-bottom: 8px; font-style: italic;">
                            Detected language: ${sourceLangName} (${confidence}% confidence)<br>
                            Translating to: ${targetLangName}
                        </div>`;
                        outputContainer.innerHTML = detectedInfo + response.replace(/\n/g, '<br>');
                        break;
                    }
                    default:
                        throw new Error(`Unknown tool ID: ${toolId}`);
                }

                console.log('Successfully processed content');
            } catch (error) {
                console.error('Error in AI operation:', error);
                outputContainer.innerHTML = `Error: ${error.message}`;
                throw error;
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }
        } catch (error) {
            console.error('Tool action failed:', error);
            outputContainer.innerHTML = `Error: ${error.message}`;
        } finally {
            const button = container.querySelector(`[data-tool-id="${toolId}"]`);
            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    }

    /**
     * Get active editor
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} Active editor element
     */
    getActiveEditor(container) {
        // Get container type
        const type = container.getAttribute('data-type');
        console.log('Getting active editor for type:', type);

        // For reply boxes
        if (type === 'reply') {
            const replyBox = container.closest('.ip.iq') || 
                            container.closest('.gA.gt') || 
                            container.closest('.adn');

            if (replyBox) {
                // Try Gmail-specific reply editor selectors first
                const editorSelectors = [
                    '.Am.Al.editable',  // Standard reply editor
                    '.Ar.Au',          // Alternative reply editor
                    '.Am.aO9',         // Another reply variant
                    '[role="textbox"]',
                    '[contenteditable="true"]',
                    '.gmail_default',
                    '.editable'
                ];

                // First try within the reply box
                for (const selector of editorSelectors) {
                    const editor = replyBox.querySelector(selector);
                    if (editor) {
                        console.log('Found reply editor with selector:', selector);
                        return editor;
                    }
                }

                // If not found, try the reply box itself
                for (const selector of editorSelectors) {
                    if (replyBox.matches(selector)) {
                        console.log('Reply box itself is the editor');
                        return replyBox;
                    }
                }
            }
        }

        // For compose windows
        if (type === 'compose') {
            const composeWindow = container.closest('.M9') || 
                                container.closest('[role="dialog"]');
            
            if (composeWindow) {
                const editorSelectors = [
                    '[role="textbox"]',
                    '[contenteditable="true"]',
                    '.Am.Al.editable',
                    '.Ar.Au',
                    '[aria-label="Message Body"]'
                ];

                for (const selector of editorSelectors) {
                    const editor = composeWindow.querySelector(selector);
                    if (editor) {
                        console.log('Found compose editor with selector:', selector);
                        return editor;
                    }
                }
            }
        }

        // For email view containers
        if (type === 'view') {
            // For view containers, create a new output container if it doesn't exist
            let outputContainer = container.closest('.gs')?.querySelector('.gmail-ai-output-container');
            
            if (!outputContainer) {
                outputContainer = document.createElement('div');
                outputContainer.className = 'gmail-ai-output-container';
                
                // Insert after the tools container
                const emailContent = container.closest('.gs')?.querySelector('.a3s.aiL');
                if (emailContent) {
                    emailContent.parentElement.insertBefore(outputContainer, emailContent);
                } else {
                    container.after(outputContainer);
                }
            }

            // Create or get the content div inside the output container
            let contentDiv = outputContainer.querySelector('.gmail-ai-output-content');
            if (!contentDiv) {
                contentDiv = document.createElement('div');
                contentDiv.className = 'gmail-ai-output-content';
                outputContainer.appendChild(contentDiv);
            }

            console.log('Using output container for view type');
            return contentDiv;
        }

        // General fallback for any other case
        const generalSelectors = [
            '[role="textbox"]',
            '[contenteditable="true"]',
            '.Am.Al.editable',
            '.Ar.Au',
            '[aria-label="Message Body"]',
            '.gmail_default',
            '.editable'
        ];

        // Try within container first
        for (const selector of generalSelectors) {
            const editor = container.querySelector(selector);
            if (editor) {
                console.log('Found editor with general selector:', selector);
                return editor;
            }
        }

        // Try container itself
        for (const selector of generalSelectors) {
            if (container.matches(selector)) {
                console.log('Container itself is the editor');
                return container;
            }
        }

        // Try parent elements
        let parent = container.parentElement;
        while (parent) {
            for (const selector of generalSelectors) {
                const editor = parent.querySelector(selector);
                if (editor) {
                    console.log('Found editor in parent with selector:', selector);
                    return editor;
                }
                if (parent.matches(selector)) {
                    console.log('Parent element is the editor');
                    return parent;
                }
            }
            parent = parent.parentElement;
        }

        console.error('No editor found with any selector');
        return null;
    }

    /**
     * Sanitize content to prevent XSS and handle special characters
     * @param {string} content - Content to sanitize
     * @returns {string} Sanitized content
     */
    sanitizeContent(content) {
        if (!content) return '';
        
        return content
            // Encode special characters
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            // Convert line breaks to <br> tags
            .replace(/\n/g, '<br>');
    }

    /**
     * Create tools container element
     */
    createToolsContainer(type) {
        const container = document.createElement('div');
        const containerClass = window.Config?.ui?.containerClass || 'gmail-ai-tools-container';
        const buttonClass = window.Config?.ui?.buttonClass || 'ai-tool-button';
        
        container.className = containerClass;
        container.setAttribute('data-type', type); // Add type attribute for styling
        
        // Add buttons based on type
        if (type === 'compose') {
            container.innerHTML = `
                <button class="${buttonClass}" data-tool-id="write">✨ Write</button>
                <button class="${buttonClass}" data-tool-id="rewrite">🔄 Rewrite</button>
                <button class="${buttonClass}" data-tool-id="translate">🌐 Translate</button>
                <select class="language-select">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                </select>
            `;
        } else if (type === 'view') {
            container.innerHTML = `
                <button class="${buttonClass}" data-tool-id="summarize">📝 Summarize</button>
                <button class="${buttonClass}" data-tool-id="translate">🌐 Translate</button>
                <select class="language-select">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                </select>
            `;
        } else if (type === 'reply') {
            const quickResponseBtn = document.createElement('button');
            quickResponseBtn.className = buttonClass;
            quickResponseBtn.setAttribute('data-tool-id', 'quick-response');
            quickResponseBtn.textContent = '🚀 Quick Response';
            quickResponseBtn.style.cssText = 'padding: 4px 8px; margin-right: 8px; border: 1px solid #dadce0; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;';
            
            quickResponseBtn.onclick = () => this.handleToolAction('quick-response', container, quickResponseBtn);

            quickResponseBtn.onmouseover = () => {
                quickResponseBtn.style.backgroundColor = '#f1f3f4';
                quickResponseBtn.style.borderColor = '#c6c6c6';
            };
            quickResponseBtn.onmouseout = () => {
                quickResponseBtn.style.backgroundColor = 'white';
                quickResponseBtn.style.borderColor = '#dadce0';
            };

            // Create translate button
            const translateBtn = document.createElement('button');
            translateBtn.className = buttonClass;
            translateBtn.setAttribute('data-tool-id', 'translate');
            translateBtn.textContent = '🌐 Translate';
            translateBtn.style.cssText = 'padding: 4px 8px; margin-right: 8px; border: 1px solid #dadce0; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;';
            
            translateBtn.onclick = () => this.handleToolAction('translate', container, translateBtn);
            translateBtn.onmouseover = () => {
                translateBtn.style.backgroundColor = '#f1f3f4';
                translateBtn.style.borderColor = '#c6c6c6';
            };
            translateBtn.onmouseout = () => {
                translateBtn.style.backgroundColor = 'white';
                translateBtn.style.borderColor = '#dadce0';
            };

            // Create language select
            const langSelect = document.createElement('select');
            langSelect.className = 'language-select';
            langSelect.style.cssText = 'padding: 4px; border: 1px solid #dadce0; border-radius: 4px; background: white; font-size: 13px; font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;';

            const languages = [
                { code: '', label: 'Select Language' },
                { code: 'es', label: 'Spanish' },
                { code: 'fr', label: 'French' },
                { code: 'de', label: 'German' },
                { code: 'it', label: 'Italian' },
                { code: 'pt', label: 'Portuguese' },
                { code: 'zh', label: 'Chinese' },
                { code: 'ja', label: 'Japanese' },
                { code: 'ko', label: 'Korean' }
            ];

            languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = lang.label;
                langSelect.appendChild(option);
            });

            // Add all elements to container
            container.appendChild(quickResponseBtn);
            container.appendChild(translateBtn);
            container.appendChild(langSelect);
        }
        
        return container;
    }
}

// Initialize the extension when the window loads
window.addEventListener('load', () => {
    const gmailAI = new GmailAIIntegration();
});
