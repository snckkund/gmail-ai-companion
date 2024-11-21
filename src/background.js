class GmailAIService {
  constructor() {
    this.aiModel = null;
    this.initializeAIModel();
    this.setupMessageListeners();
  }

  async initializeAIModel() {
    try {
      if ('ai' in chrome && chrome.ai) {
        this.aiModel = await chrome.ai.getModel('gemini-nano');
        console.log('AI Model Initialized Successfully');
      } else {
        console.warn('Chrome AI API not available');
      }
    } catch (error) {
      console.error('AI Model Initialization Failed:', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch(message.type) {
        case 'AI_SUMMARIZE':
          this.summarizeContent(message.content)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'AI_TRANSLATE':
          this.translateContent(message.content, message.language)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'AI_IMPROVE':
          this.improveWriting(message.content)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'AI_GENERATE':
          this.generateResponse(message.content)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
          return true;

        default:
          return false;
      }
    });
  }

  async summarizeContent(text) {
    if (!this.aiModel) throw new Error('AI Model Unavailable');

    try {
      const summary = await this.aiModel.generateText(
        `Create a concise 3-4 sentence summary of the following text: ${text}`
      );
      return summary || 'Unable to generate summary';
    } catch (error) {
      console.error('Summarization Error:', error);
      return 'Summary generation failed';
    }
  }

  async translateContent(text, targetLanguage) {
    if (!this.aiModel) throw new Error('AI Model Unavailable');

    try {
      const translation = await this.aiModel.generateText(
        `Translate the following text to ${targetLanguage}: ${text}`
      );
      return translation || 'Unable to translate';
    } catch (error) {
      console.error('Translation Error:', error);
      return 'Translation failed';
    }
  }

  async improveWriting(text) {
    if (!this.aiModel) throw new Error('AI Model Unavailable');

    try {
      const improvedText = await this.aiModel.generateText(
        `Improve the clarity and professionalism of this text, maintaining the original meaning: ${text}`
      );
      return improvedText || 'Unable to improve text';
    } catch (error) {
      console.error('Writing Improvement Error:', error);
      return 'Writing improvement failed';
    }
  }

  async generateResponse(context) {
    if (!this.aiModel) throw new Error('AI Model Unavailable');

    try {
      const response = await this.aiModel.generateText(
        `Draft a professional email response based on this context: ${context}`
      );
      return response || 'Unable to generate response';
    } catch (error) {
      console.error('Response Generation Error:', error);
      return 'Response generation failed';
    }
  }
}

// Initialize the background service
new GmailAIService();