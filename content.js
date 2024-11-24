// content.js
class GmailAIIntegration {
    constructor() {
        this.aiTools = null;
        this.supportedLanguages = [
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ru', name: 'Russian' },
            { code: 'zh', name: 'Chinese' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' }
        ];
        this.init();
        this.setupMutationObserver();
        // Initial check for compose windows
        this.checkForComposeWindows();
    }

    async init() {
        try {
            if (typeof window.ai !== 'undefined') {
                this.aiTools = await window.ai;
                this.injectAITools();
                this.setupEventListeners();
                this.updateAIStatus();
            } else {
                console.warn('Chrome AI APIs not available');
                this.updateAIStatus(false);
            }
        } catch (error) {
            console.error('Failed to initialize AI tools:', error);
            this.updateAIStatus(false);
        }
    }

    setupMutationObserver() {
        const config = {
            childList: true,
            subtree: true,
            attributes: true
        };

        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                // Check if any new nodes were added
                if (mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
                // Check if any attributes were modified
                if (mutation.type === 'attributes') {
                    shouldCheck = true;
                }
            });

            if (shouldCheck) {
                this.checkForComposeWindows();
                this.checkForEmailViews();
            }
        });

        observer.observe(document.body, config);
    }

    checkForComposeWindows() {
        // Try multiple selectors that Gmail uses for compose windows
        const composeSelectors = [
            '.AD', // Main compose window
            '.nH.Hd', // Full-screen compose
            'div[role="dialog"]' // Popup compose window
        ];

        composeSelectors.forEach(selector => {
            const composeWindows = document.querySelectorAll(selector);
            composeWindows.forEach(window => {
                // Check if this window is actually a compose window by looking for typical elements
                const hasEditor = window.querySelector('.Am.Al.editable');
                const hasSubject = window.querySelector('input[name="subjectbox"]');
                
                if ((hasEditor || hasSubject) && !window.querySelector('.gmail-ai-tools')) {
                    const toolsContainer = this.createAIToolsContainer('compose');
                    
                    // Try different insertion points
                    const insertionPoints = [
                        window.querySelector('.Ar.Au'), // Below recipient field
                        window.querySelector('.AD'), // Main compose area
                        hasSubject?.parentElement, // Near subject field
                        hasEditor?.parentElement // Near editor
                    ];

                    // Use the first valid insertion point
                    for (const point of insertionPoints) {
                        if (point) {
                            point.parentElement.insertBefore(toolsContainer, point);
                            console.log('Successfully injected AI tools into compose window');
                            break;
                        }
                    }
                }
            });
        });
    }

    checkForEmailViews() {
        const emailViews = document.querySelectorAll('.a3s.aiL');
        emailViews.forEach(view => {
            if (!view.parentElement.querySelector('.gmail-ai-tools')) {
                const toolsContainer = this.createAIToolsContainer('view');
                view.parentElement.insertBefore(toolsContainer, view);
            }
        });
    }

    createAIToolsContainer(type) {
        const container = document.createElement('div');
        container.className = 'gmail-ai-tools';
        container.style.margin = '8px 0';
        container.style.padding = '8px';
        container.setAttribute('data-type', type); // Add type attribute for debugging

        const toolsWrapper = document.createElement('div');
        toolsWrapper.className = 'gmail-ai-tools-wrapper';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'gmail-ai-buttons-container';

        const buttons = type === 'compose' ? [
            { 
                text: '✨ Improve Writing', 
                action: this.improveWriting.bind(this),
                class: 'improve-btn'
            },
            { 
                text: '🌍 Translate', 
                action: this.toggleTranslateOptions.bind(this),
                class: 'translate-btn'
            },
            { 
                text: '✍️ Generate Email', 
                action: this.generateEmail.bind(this),
                class: 'generate-btn'
            }
        ] : [
            { 
                text: '📝 Summarize', 
                action: this.summarizeEmail.bind(this),
                class: 'summarize-btn'
            },
            { 
                text: '🌍 Translate', 
                action: this.toggleTranslateOptions.bind(this),
                class: 'translate-btn'
            },
            { 
                text: '✍️ Generate Response', 
                action: this.generateResponse.bind(this),
                class: 'generate-btn'
            }
        ];

        buttons.forEach(({ text, action, class: btnClass }) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = `gmail-ai-button ${btnClass}`;
            button.addEventListener('click', action);
            buttonsContainer.appendChild(button);
        });

        // Translation options container
        const translateOptions = document.createElement('div');
        translateOptions.className = 'gmail-ai-translate-options hidden';
        
        const languageSelect = document.createElement('select');
        languageSelect.className = 'gmail-ai-language-select';
        
        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === 'en') option.selected = true;
            languageSelect.appendChild(option);
        });

        const translateButton = document.createElement('button');
        translateButton.textContent = 'Translate';
        translateButton.className = 'gmail-ai-button translate-confirm-btn';
        translateButton.addEventListener('click', () => this.translateEmail());

        translateOptions.appendChild(languageSelect);
        translateOptions.appendChild(translateButton);
        
        toolsWrapper.appendChild(buttonsContainer);
        toolsWrapper.appendChild(translateOptions);
        container.appendChild(toolsWrapper);

        return container;
    }

    async improveWriting() {
        try {
            const emailContent = this.getEmailContent();
            if (!emailContent) {
                this.showNotification('No content to improve', 'error');
                return;
            }

            this.showLoadingState('improve-btn');
            const rewriter = await this.aiTools.rewriter.create({
                sharedContext: "Professional email communication"
            });
            const improved = await rewriter.rewrite(emailContent, {
                context: "Make it more professional and clear"
            });
            this.updateEmailContent(improved);
            this.showNotification('Writing improved successfully', 'success');
        } catch (error) {
            this.showNotification('Error improving writing', 'error');
            console.error(error);
        } finally {
            this.hideLoadingState('improve-btn');
        }
    }

    async summarizeEmail() {
        try {
            const emailContent = this.getEmailContent();
            if (!emailContent) {
                this.showNotification('No content to summarize', 'error');
                return;
            }

            this.showLoadingState('summarize-btn');
            const summarizer = await this.aiTools.summarizer.create();
            const summary = await summarizer.summarize(emailContent);
            
            const summaryContainer = this.createOutputContainer('Summary');
            summaryContainer.querySelector('.gmail-ai-output-content').textContent = summary;
            
            // Insert summary at the top of the email
            const emailContainer = document.querySelector('.a3s.aiL');
            if (emailContainer) {
                emailContainer.parentElement.insertBefore(summaryContainer, emailContainer);
            }
        } catch (error) {
            this.showNotification('Error summarizing email', 'error');
            console.error(error);
        } finally {
            this.hideLoadingState('summarize-btn');
        }
    }

    async translateEmail() {
        try {
            const emailContent = this.getEmailContent();
            if (!emailContent) {
                this.showNotification('No content to translate', 'error');
                return;
            }

            const targetLanguage = document.querySelector('.gmail-ai-language-select').value;
            this.showLoadingState('translate-btn');

            const detector = await this.aiTools.languageDetector.create();
            const sourceLanguage = await detector.detect(emailContent);
            
            const translator = await this.aiTools.translator.create({
                sourceLanguage: sourceLanguage[0].detectedLanguage,
                targetLanguage: targetLanguage
            });
            
            const translated = await translator.translate(emailContent);
            this.updateEmailContent(translated);
            this.showNotification('Translation completed', 'success');
        } catch (error) {
            this.showNotification('Error translating email', 'error');
            console.error(error);
        } finally {
            this.hideLoadingState('translate-btn');
            this.toggleTranslateOptions({ target: document.querySelector('.translate-btn') });
        }
    }

    async generateEmail() {
        try {
            const subject = this.getEmailSubject();
            
            if (!subject) {
                this.showNotification('Please provide a subject first', 'error');
                return;
            }

            this.showLoadingState('generate-btn');
            const generator = await this.aiTools.writer.create({
                tone: "formal",
                sharedContext: subject,
            });
            const email = await generator.write(`Generate a professional email with subject: ${subject}`);

            this.updateEmailContent(email);
            this.showNotification('Email generated successfully', 'success');
        } catch (error) {
            this.showNotification('Error generating email', 'error');
            console.error(error);
        } finally {
            this.hideLoadingState('generate-btn');
        }
    }

    async generateResponse() {
        try {
            const emailContent = this.getEmailContent();
            if (!emailContent) {
                this.showNotification('No email content to respond to', 'error');
                return;
            }

            this.showLoadingState('generate-btn');
            const generator = await this.aiTools.languageModel.create({
                systemPrompt: 'You are a friendly, helpful assistant specialized in email writing and response.',
                maxTokens: 100
            });
            const response = await generator.prompt(`Generate a short and discreet response to this email: ${emailContent}`);

            const editor = document.querySelector('.Am.Al.editable');
            if (editor) {
                editor.focus();
                document.execCommand('insertText', false, response);
            }
            
            this.showNotification('Response generated successfully', 'success');
        } catch (error) {
            this.showNotification('Error generating response', 'error');
            console.error(error);
        } finally {
            this.hideLoadingState('generate-btn');
        }
    }

    toggleTranslateOptions(event) {
        const button = event.target;
        const container = button.closest('.gmail-ai-tools-wrapper');
        const options = container.querySelector('.gmail-ai-translate-options');
        options.classList.toggle('hidden');
    }

    getEmailContent() {
        const composeEditor = document.querySelector('.Am.Al.editable');
        const emailView = document.querySelector('.a3s.aiL');
        return (composeEditor || emailView)?.innerText || '';
    }

    updateEmailContent(content) {
        const editor = document.querySelector('.Am.Al.editable');
        const emailView = document.querySelector('.a3s.aiL');
        
        if (editor) {
            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, content);
        } else if (emailView) {
            emailView.innerText = content;
        }
    }

    getEmailSubject() {
        return document.querySelector('input[name="subjectbox"]')?.value || '';
    }

    createOutputContainer(title) {
        const container = document.createElement('div');
        container.className = 'gmail-ai-output-container';
        
        const header = document.createElement('div');
        header.className = 'gmail-ai-output-header';
        header.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'gmail-ai-output-content';
        
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
    }

    showLoadingState(buttonClass) {
        const button = document.querySelector(`.${buttonClass}`);
        if (button) {
            button.disabled = true;
            button.classList.add('loading');
        }
    }

    hideLoadingState(buttonClass) {
        const button = document.querySelector(`.${buttonClass}`);
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `gmail-ai-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateAIStatus(status = true) {
        chrome.runtime.sendMessage({
            type: 'UPDATE_MODEL_STATUS',
            status: {
                languageModel: status,
                summarizer: status,
                translator: status,
                languageDetector: status
            }
        });
    }

    setupEventListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'CHECK_AI_STATUS') {
                this.updateAIStatus();
            }
        });
    }
}

// Initialize immediately and also on DOM ready
const initializeExtension = () => {
    new GmailAIIntegration();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}