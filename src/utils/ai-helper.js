class AIHelper {
  static async preprocessText(text) {
    // Text preprocessing utility
    return text.trim().replace(/\s+/g, ' ');
  }

  static validateLanguage(language) {
    // Basic language validation
    const supportedLanguages = [
      'english', 'spanish', 'french', 'german', 
      'italian', 'portuguese', 'chinese', 'japanese', 'korean'
    ];
    return supportedLanguages.includes(language.toLowerCase());
  }
}