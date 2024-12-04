**links:**
 - [Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis)
 - [Prompt API](https://developer.chrome.com/docs/extensions/ai/prompt-api)
 - [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
 - [Language Detection](https://developer.chrome.com/docs/ai/language-detection)
 - [Translator API](https://developer.chrome.com/docs/ai/translator-api)

The Chrome Built-in AI APIs provide a variety of capabilities for integrating AI features into web applications or extensions. Here's a breakdown of the key properties and functions for each of the components:

### 1. **Language Model (`ai.languageModel`)**
   - **Properties**:
     - `maxTokens`: Maximum number of tokens the model can generate (6144 by default).
     - `tokensSoFar`: Tokens processed in the current interaction.
     - `tokensLeft`: Remaining tokens available for generation.
     - `topK`: Specifies the top-K sampling for response diversity (default: 3).
     - `temperature`: Controls randomness in output (1 is balanced).

   - **Functions**:
     - `prompt()`: Generates a response based on a given prompt.
     - `promptStreaming()`: Streams the response in chunks.
     - `destroy()`: Cleans up the instance.
     - `countPromptTokens()`: Counts the tokens in a provided prompt.

---

### 2. **Summarizer (`ai.summarizer`)**
   - **Properties**:
     - `type`: Summarization type (e.g., "key-points").
     - `format`: Output format (e.g., "markdown").
     - `length`: Length of the summary (e.g., "medium").
     - `sharedContext`: Context shared across summaries (optional).

   - **Functions**:
     - `summarize()`: Generates a summary for provided input.
     - `summarizeStreaming()`: Streams the summary in parts.
     - `destroy()`: Cleans up the instance.

---

### 3. **Writer (`ai.writer`)**
   - **Properties**:
     - `sharedContext`: Shared writing context (optional).

   - **Functions**:
     - `write()`: Generates written content based on input.
     - `writeStreaming()`: Streams the written content in parts.
     - `destroy()`: Cleans up the instance.

---

### 4. **Rewriter (`ai.rewriter`)**
   - **Properties**:
     - `tone`: Desired tone for rewritten content (e.g., "as-is").
     - `length`: Desired length for rewritten content (e.g., "as-is").
     - `sharedContext`: Context shared across rewrites (optional).

   - **Functions**:
     - `rewrite()`: Rewrites the given content.
     - `rewriteStreaming()`: Streams the rewritten content.
     - `destroy()`: Cleans up the instance.

---

### 5. **Translation (`translation`)**
   - **Capabilities**:
     - `canTranslate({sourceLanguage, targetLanguage})`: Checks if translation is available for the given language pair.
     - `canDetect()`: Checks if language detection is available.

   - **Translator**:
     - **Functions**:
       - `translate()`: Translates text from source to target language.
     - **Properties**:
       - Created using `createTranslator({sourceLanguage, targetLanguage})`.

   - **Detector**:
     - **Functions**:
       - `detect()`: Detects the language of a given text.
     - **Properties**:
       - Created using `createDetector()`.

---

### 6. **Language Detector (`ai.languageDetector`)**
   - **Capabilities**:
     - `capabilities()`: Indicates availability of language detection features (`available: 'readily'`).

   - **Functions**:
     - `detect()`: Detects the language of input text.
     - `destroy()`: Cleans up the instance.

---

### 7. **General Notes**
   - Many APIs include `destroy()` methods to release resources.
   - Streaming functions (`promptStreaming`, `summarizeStreaming`, etc.) are ideal for progressive output.
   - `sharedContext` allows consistent interactions across multiple API calls.
   - Capabilities like `canTranslate`, `canDetect`, and `capabilities()` help ensure the desired functionality is supported before usage.

These APIs provide a powerful toolkit for embedding advanced AI capabilities into web applications or extensions, enabling tasks like summarization, language detection, translation, and content generation with high customization.

---

#### **Sample Code Examples**

##### **Prompt API**
```javascript
// Synchronous example
const session = await ai.languageModel.create();
const result = await session.prompt("Explain quantum physics in simple terms.");
console.log(result);

// Streaming example
const stream = await session.promptStreaming("Generate a long story about a hero.");
for await (const chunk of stream) {
  console.log(chunk);
}
```

##### **Summarizer API**
```javascript
const summarizer = await ai.summarizer.create({ type: "key-points", length: "medium" });
const summary = await summarizer.summarize("Long text content...");
console.log(summary);
```

##### **Translator API**
```javascript
const translator = await ai.translator.create({ sourceLanguage: "en", targetLanguage: "es" });
const translation = await translator.translate("Hello, how are you?");
console.log(translation);
```

##### **Language Detector API**
```javascript
const detector = await ai.languageDetector.create();
const results = await detector.detect("Bonjour, comment ça va?");
console.log(results);
```

##### **Writer API**
```javascript
const writer = await ai.writer.create({ tone: "formal" });
const draft = await writer.write("Write a professional email requesting a meeting.");
console.log(draft);
```

##### **Rewriter API**
```javascript
const rewriter = await ai.rewriter.create({ tone: "more-formal" });
const rewritten = await rewriter.rewrite("Hey, what's up?");
console.log(rewritten);
```