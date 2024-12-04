/**
 * Configuration settings for Gmail AI integration
 */
// Gmail AI Companion Configuration
window.Config = {
    // AI Tool settings
    ai: {
        rewriter: {
            maxTokens: 2000,
            temperature: 0.7
        },
        summarizer: {
            maxTokens: 150,
            temperature: 0.3
        },
        translator: {
            defaultSourceLang: 'en',
            defaultTargetLang: 'es'
        },
        writer: {
            maxTokens: 1000,
            temperature: 0.7
        }
    },

    // DOM selectors
    selectors: {
        composeWindows: [
            '.AD',  // Main compose window
            '.nH.Hd',  // Full-screen compose
            'div[role="dialog"]'  // Popup compose window
        ],
        emailView: '.adn.ads',  // Email view container (parent of .gs)
        textbox: '[role="textbox"]',
        contentEditable: '[contenteditable="true"]',
        emailBody: '.a3s.aiL',  // Email body content
        emailHeader: '.ha h2, .h7'  // Email header
    },

    // UI settings
    ui: {
        throttleDelay: 500,
        statusMessageDuration: 3000,
        loadingClass: 'loading',
        containerClass: 'gmail-ai-tools-container',
        buttonClass: 'ai-tool-button'
    },

    // Supported languages
    languages: [
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
    ]
};
