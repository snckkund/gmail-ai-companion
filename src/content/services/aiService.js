/**
 * AI Service for managing Chrome AI API integrations
 */
class AIService {
    aiTools = null;
    instances = {};
    initialized = false;
    initializationStarted = false;
    aiModel = null;

    /**
     * Check if AI service is available
     */
    isAvailable() {
        console.log('Checking AI availability:', {
            initialized: this.initialized,
            hasTools: this.aiTools !== null,
            instanceCount: Object.keys(this.instances).length
        });
        // Only return true if we have working instances
        return this.initialized && this.aiTools !== null && Object.keys(this.instances).length > 0;
    }

    /**
     * Initialize AI tools and create instances
     */
    async initialize() {
        if (this.initializationStarted) {
            console.log('AIService initialization already in progress');
            return false;
        }

        this.initializationStarted = true;
        console.log('Initializing AIService...');

        try {
            // Check if Chrome AI API is available
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                console.error('Chrome runtime not available');
                this.initializationStarted = false;
                return false;
            }

            // Wait for AI API to be available
            if (!window.ai) {
                console.log('Waiting for Chrome AI API...');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Give it a moment to load
                if (!window.ai) {
                    console.error('Chrome AI API not available after waiting');
                    this.initializationStarted = false;
                    return false;
                }
            }

            this.aiTools = window.ai;
            console.log('AI tools loaded:', this.aiTools);
            
            // Initialize capabilities
            const capabilities = await this.checkCapabilities();
            console.log('Available capabilities:', capabilities);

            if (Object.values(capabilities).some(cap => cap)) {
                const success = await this.initializeTools();
                if (success) {
                    this.initialized = true;
                    console.log('AI Service initialized successfully');
                    this.initializationStarted = false;
                    return true;
                }
            }

            console.warn('No AI capabilities available');
            this.initializationStarted = false;
            return false;
        } catch (error) {
            console.error('Failed to initialize AI service:', error);
            this.initialized = false;
            this.initializationStarted = false;
            return false;
        }
    }

    /**
     * Check which AI capabilities are available
     */
    async checkCapabilities() {
        const capabilities = {
            languageModel: false,
            summarizer: false,
            translator: false,
            writer: false,
            rewriter: false,
            languageDetector: false
        };

        try {
            if (this.aiTools) {
                // Test each capability with a small request to ensure it's not rate limited
                if (this.aiTools.languageModel) {
                    try {
                        const instance = await this.aiTools.languageModel.create({
                            maxTokens: 100,  // Reasonable default
                            temperature: 1,  // Balanced setting
                            topK: 3         // Default value
                        });
                        capabilities.languageModel = true;
                    } catch (e) {
                        console.warn('Language model not available:', e);
                    }
                }
                
                if (this.aiTools.summarizer) {
                    try {
                        const instance = await this.aiTools.summarizer.create({
                            type: 'key-points',    // Common use case
                            format: 'markdown',     // Structured output
                            length: 'short'        // Minimal for testing
                        });
                        capabilities.summarizer = true;
                    } catch (e) {
                        console.warn('Summarizer not available:', e);
                    }
                }
                
                if (this.aiTools.translator) {
                    try {
                        // First check if translation is available for the language pair
                        if (translation.canTranslate({
                            sourceLanguage: 'en',
                            targetLanguage: 'es'
                        })) {
                            const instance = await this.aiTools.translator.create({
                                sourceLanguage: 'en',
                                targetLanguage: 'es'  // Default target language
                            });
                            capabilities.translator = true;
                        } else {
                            console.warn('Translation not available for en->es');
                        }

                        // Check language detection in the same block since it's part of translation
                        if (translation.canDetect()) {
                            const detector = await translation.createDetector();
                            capabilities.languageDetector = true;
                        } else {
                            console.warn('Language detection not available');
                        }
                    } catch (e) {
                        console.warn('Translation/Detection not available:', e);
                    }
                }
                
                if (this.aiTools.writer) {
                    try {
                        const instance = await this.aiTools.writer.create({
                            maxTokens: 100,     // Reasonable limit for testing
                            temperature: 1      // Balanced creativity
                        });
                        capabilities.writer = true;
                    } catch (e) {
                        console.warn('Writer not available:', e);
                    }
                }
                
                if (this.aiTools.rewriter) {
                    try {
                        const instance = await this.aiTools.rewriter.create({
                            tone: 'as-is',    // Preserve original tone
                            length: 'as-is'   // Preserve original length
                        });
                        capabilities.rewriter = true;
                    } catch (e) {
                        console.warn('Rewriter not available:', e);
                    }
                }

                console.log('AI Capabilities after testing:', capabilities);
            }
        } catch (error) {
            console.error('Error checking capabilities:', error);
        }

        return capabilities;
    }

    /**
     * Initialize individual AI tool instances
     */
    async initializeTools() {
        const capabilities = await this.checkCapabilities();
        const initPromises = [];

        // Initialize each available capability with proper options
        if (capabilities.languageModel) {
            initPromises.push(this.initializeCapability('languageModel', {
                maxTokens: 2000,
                temperature: 0.7,
                topK: 3
            }));
        }
        if (capabilities.summarizer) {
            initPromises.push(this.initializeCapability('summarizer', {
                type: 'key-points',
                format: 'markdown',
                length: 'medium'
            }));
        }
        if (capabilities.translator) {
            initPromises.push(this.initializeCapability('translator', {
                sourceLanguage: 'en',  
                targetLanguage: 'es',  
                preserveFormatting: true
            }));
        }
        if (capabilities.writer) {
            initPromises.push(this.initializeCapability('writer', {
                maxTokens: 1000,
                temperature: 0.7
            }));
        }
        if (capabilities.rewriter) {
            initPromises.push(this.initializeCapability('rewriter', {
                tone: 'as-is',
                length: 'as-is'
            }));
        }
        if (capabilities.languageDetector) {
            initPromises.push(this.initializeCapability('languageDetector'));
        }

        // Wait for all initializations to complete
        const results = await Promise.allSettled(initPromises);
        
        // Log initialization results
        results.forEach((result, index) => {
            const capability = Object.keys(capabilities)[index];
            if (result.status === 'rejected') {
                console.error(`Failed to initialize ${capability}:`, result.reason);
            }
        });

        // Return true if at least one capability was initialized
        return results.some(result => result.status === 'fulfilled');
    }

    /**
     * Initialize a specific AI capability
     */
    async initializeCapability(name, options = {}) {
        try {
            if (this.aiTools[name]) {
                // Special handling for translator
                if (name === 'translator') {
                    try {
                        const instance = await this.aiTools[name].create({
                            sourceLanguage: options.sourceLanguage || 'en',
                            targetLanguage: options.targetLanguage || 'es'
                        });
                        this.instances[name] = instance;
                        console.log(`${name} initialized successfully`);
                        return true;
                    } catch (e) {
                        if (e.message?.includes('rate limit') || e.message?.includes('resource_exhausted')) {
                            console.error(`${name} is rate limited:`, e);
                            return false;
                        }
                        throw e;
                    }
                }

                // For other AI tools
                try {
                    const testInstance = await this.aiTools[name].create({ maxTokens: 1 });
                    // If test succeeds, create real instance
                    const instance = await this.aiTools[name].create(options);
                    this.instances[name] = instance;
                    console.log(`${name} initialized successfully`);
                    return true;
                } catch (e) {
                    if (e.message?.includes('rate limit') || e.message?.includes('resource_exhausted')) {
                        console.error(`${name} is rate limited:`, e);
                        return false;
                    }
                    throw e; // Re-throw other errors
                }
            }
        } catch (error) {
            console.error(`Failed to initialize ${name}:`, error);
            return false;
        }
        return false;
    }

    /**
     * Get an AI tool instance
     */
    getToolInstance(toolName) {
        return this.instances[toolName] || null;
    }

    /**
     * Clean up AI instances
     */
    async cleanup() {
        for (const [name, instance] of Object.entries(this.instances)) {
            try {
                if (instance && typeof instance.destroy === 'function') {
                    await instance.destroy();
                }
            } catch (error) {
                console.error(`Error cleaning up ${name}:`, error);
            }
        }
        this.instances = {};
        this.initialized = false;
    }

    /**
     * Handle write operation
     */
    async handleWrite(text, emailBody = '') {
        if (!this.isAvailable()) {
            throw new Error('AI service not initialized');
        }

        const writer = await this.aiTools.writer.create({
            sharedContext: "Professional email communication",
            maxTokens: 1000,
            temperature: 0.7
        });
        
        if (!writer) {
            throw new Error('Writer not available');
        }
        
        try {
            // Clean up the email body by removing extra whitespace and normalizing line breaks
            const cleanBody = emailBody.trim().replace(/\s+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n');
            
            const prompt = `Write a professional email with proper formatting:
Subject: ${text.trim()}
${cleanBody ? `\nCurrent email body:\n${cleanBody}\n\nPlease improve and continue this email while maintaining the context and proper formatting.` : '\nGenerate a complete professional email body with proper paragraphs and spacing.'}\n\nEnsure to:
- Use proper paragraph spacing
- Include appropriate salutation and closing
- Maintain professional tone
- Use clear paragraph breaks`;

            const result = await writer.write(prompt);
            if (!result || typeof result !== 'string' || result.trim() === '') {
                throw new Error('No valid result from AI model');
            }

            // Clean up the generated result
            // 1. Remove any "Subject:" lines
            // 2. Ensure consistent paragraph spacing
            // 3. Remove extra blank lines
            return result
                .replace(/^Subject:.*?\n/i, '') // Remove subject line if present
                .replace(/^\s+|\s+$/g, '') // Trim start and end
                .replace(/\n{3,}/g, '\n\n') // Replace multiple blank lines with double
                .replace(/([.!?])\s*\n/g, '$1\n\n') // Add proper spacing after sentences
                .trim();
        } catch (error) {
            console.error('Error in handleWrite:', error);
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw error;
        }
    }

    /**
     * Handle rewrite operation
     */
    async handleRewrite(text) {
        if (!this.isAvailable()) {
            throw new Error('AI service not initialized');
        }

        const rewriter = await this.aiTools.rewriter.create({
            sharedContext: "Professional email communication"
        });
        
        if (!rewriter) {
            throw new Error('Rewriter not available');
        }
        
        try {
            const result = await rewriter.rewrite(text);
            if (!result || typeof result !== 'string' || result.trim() === '') {
                throw new Error('No valid result from AI model');
            }
            return result.trim();
        } catch (error) {
            console.error('Error in handleRewrite:', error);
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw error;
        }
    }

    async handleTranslate(text, targetLanguage) {
        if (!this.isAvailable()) {
            throw new Error('AI service not initialized');
        }

        try {
            // First detect the source language
            const detector = await this.aiTools.languageDetector.create();
            if (!detector) {
                throw new Error('Language detector not available');
            }

            const detectionResult = await detector.detect(text);
            if (!detectionResult || !detectionResult[0]?.detectedLanguage) {
                throw new Error('Could not detect source language');
            }

            const sourceLanguage = detectionResult[0].detectedLanguage;
            console.log('Detected source language:', sourceLanguage);

            // Don't translate if source and target are the same
            if (sourceLanguage === targetLanguage) {
                throw new Error('Source and target languages are the same');
            }

            // Create translator with source and target languages
            const translator = await this.aiTools.translator.create({
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                preserveFormatting: true
            });
            
            if (!translator) {
                throw new Error('Translator not available');
            }
            
            // Clean up the text and preserve line breaks
            const cleanText = text.trim().replace(/\n\s*\n\s*\n/g, '\n\n');
            
            const result = await translator.translate(cleanText);
            if (!result || typeof result !== 'string' || result.trim() === '') {
                throw new Error('No valid result from translation');
            }

            // Clean up the translated result while preserving formatting
            return result
                .trim()
                .replace(/\n{3,}/g, '\n\n') // Replace multiple blank lines with double
                .replace(/([.!?])\s*\n/g, '$1\n\n') // Add proper spacing after sentences
                .trim();
        } catch (error) {
            console.error('Error in handleTranslate:', error);
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw error;
        }
    }

    /**
     * Handle summarize operation
     */
    async handleSummarize(text) {
        if (!this.isAvailable()) {
            throw new Error('AI service not initialized');
        }

        const summarizer = this.getToolInstance('summarizer');
        if (!summarizer) {
            throw new Error('Summarizer not available');
        }
        
        try {
            const result = await summarizer.summarize(text);
            if (!result || typeof result !== 'string' || result.trim() === '') {
                throw new Error('No valid result from AI model');
            }
            return result.trim();
        } catch (error) {
            console.error('Error in handleSummarize:', error);
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw error;
        }
    }

    async generateText(prompt, options = {}) {
        if (!this.aiModel) {
            throw new Error('AI model not initialized');
        }

        const defaultOptions = {
            temperature: 0.7,
            maxTokens: 1000,
            stopSequences: []
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            console.log('Generating text with options:', {
                promptLength: prompt.length,
                ...finalOptions
            });

            const result = await this.aiModel.generateText({
                text: prompt,
                ...finalOptions
            });

            if (!result || !result.response) {
                throw new Error('No response from AI model');
            }

            return result.response;

        } catch (error) {
            console.error('Text generation error:', error);
            if (error.message.includes('resource_exhausted')) {
                throw new Error('AI service is currently busy. Please try again in a few minutes.');
            }
            throw error;
        }
    }

    /**
     * Handle email composition with subject and optional body
     * @param {string} subject - Email subject
     * @param {string} body - Optional email body
     */
    async handleEmailComposition(subject, body = '') {
        if (!this.isAvailable()) {
            throw new Error('AI service not initialized');
        }

        const writer = await this.aiTools.writer.create({
            sharedContext: "Professional email communication",
            maxTokens: 1000,
            temperature: 0.7
        });
        
        if (!writer) {
            throw new Error('Writer not available');
        }
        
        try {
            let prompt;
            if (!body) {
                // Only subject provided, generate entire email
                prompt = `Generate a professional email with subject: "${subject}"`;
            } else {
                // Both subject and body provided, continue from existing content
                prompt = `Continue writing a professional email with subject "${subject}" from the following content:\n\n${body}`;
            }

            const result = await writer.write(prompt);
            if (!result || typeof result !== 'string' || result.trim() === '') {
                throw new Error('No valid result from AI model');
            }
            return {
                subject: subject,
                body: result.trim()
            };
        } catch (error) {
            console.error('Error in handleEmailComposition:', error);
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw error;
        }
    }
}

// Make AIService globally available
window.AIService = new AIService();
