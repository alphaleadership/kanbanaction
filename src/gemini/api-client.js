import { GoogleGenerativeAI } from '@google/generative-ai';
import { delay as defaultDelay } from '../utils/helpers.js';

export class GeminiClient {
  constructor(apiKey, modelOrOptions = 'gemini-2.5-flash', delayFn = defaultDelay) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.delay = delayFn;
    const options = typeof modelOrOptions === 'string'
      ? { primaryModel: modelOrOptions }
      : (modelOrOptions || {});

    this.primaryModel = options.primaryModel || 'gemini-2.5-flash';
    this.fallbackModels = (options.fallbackModels || []).filter(Boolean);
    this.retries = Number.isInteger(options.retries) && options.retries >= 0 ? options.retries : 3;
    this.models = new Map();
  }

  getModel(modelName) {
    if (!this.models.has(modelName)) {
      this.models.set(modelName, this.genAI.getGenerativeModel({ model: modelName }));
    }
    return this.models.get(modelName);
  }

  getCandidateModels(preferredModel) {
    const candidates = [preferredModel, this.primaryModel, ...this.fallbackModels].filter(Boolean);
    return [...new Set(candidates)];
  }

  async generateContent(prompt, retries = this.retries, options = {}) {
    let lastError;
    const candidateModels = this.getCandidateModels(options.preferredModel);

    for (let i = 0; i <= retries; i++) {
      for (const modelName of candidateModels) {
        try {
          const model = this.getModel(modelName);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (error) {
          lastError = error;
        }
      }

      if (i < retries) {
        const waitTime = Math.pow(2, i) * 1000;
        await this.delay(waitTime);
      }
    }

    throw lastError;
  }

  async generateJson(prompt, retries = this.retries, options = {}) {
      const jsonPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON.`;
      const text = await this.generateContent(jsonPrompt, retries, options);
      try {
          // Find JSON block if it exists
          const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : text;
          return JSON.parse(jsonStr);
      } catch (error) {
          throw new Error(`Failed to parse Gemini response as JSON: ${error.message}
Response: ${text}`);
      }
  }
}
