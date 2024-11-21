class EmailAnalyzer {
    static extractKeyPoints(text) {
      // Advanced email key point extraction
      const sentences = text.split(/[.!?]+/);
      return sentences
        .filter(sentence => sentence.trim().length > 20)
        .slice(0, 3);
    }
  
    static detectEmailTone(text) {
      const tones = {
        formal: ['regards', 'sincerely', 'professional'],
        casual: ['hey', 'hi', 'thanks', 'cheers'],
        urgent: ['immediately', 'critical', 'urgent']
      };
  
      for (const [tone, keywords] of Object.entries(tones)) {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
          return tone;
        }
      }
      return 'neutral';
    }
  }
  