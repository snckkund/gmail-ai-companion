class TranslationService {
    static async detectSourceLanguage(text) {
      // Simplified language detection
      const languagePatterns = {
        'en': /\b(the|is|and|of)\b/,
        'es': /\b(el|la|de|que)\b/,
        'fr': /\b(le|la|et|de)\b/,
        'de': /\b(der|die|das|und)\b/
      };
  
      for (const [lang, pattern] of Object.entries(languagePatterns)) {
        if (pattern.test(text)) return lang;
      }
      return 'en'; // Default to English
    }
  
    static sanitizeTranslationInput(text) {
      // Remove sensitive or problematic content
      return text
        .replace(/(<([^>]+)>)/gi, '')  // Remove HTML tags
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim();
    }
  }