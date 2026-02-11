import { GoogleGenerativeAI } from '@google/generative-ai';
import { delay as defaultDelay } from '../utils/helpers.js';

export class GeminiClient {
  constructor(apiKey, modelName = 'gemini-1.5-flash', delayFn = defaultDelay) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.delay = delayFn;
  }

  async generateContent(prompt, retries = 3) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        lastError = error;
        if (i < retries) {
          const waitTime = Math.pow(2, i) * 1000;
          await this.delay(waitTime);
        }
      }
    }
    throw lastError;
  }

  async generateJson(prompt, retries = 3) {
      const jsonPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON.`;
      const text = await this.generateContent(jsonPrompt, retries);
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
