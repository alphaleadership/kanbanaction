import { test, expect, describe, jest } from '@jest/globals';
import fc from 'fast-check';
import { GeminiClient } from '../../src/gemini/api-client.js';

describe('Property 7: Retry Logic Behavior', () => {
  test('should retry on failure and eventually succeed or fail after max retries', async () => {
    const apiKey = 'test-key';
    const mockDelay = jest.fn(() => Promise.resolve());
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // actual failures
        fc.integer({ min: 1, max: 3 }), // allowed retries
        async (failCount, allowedRetries) => {
          const client = new GeminiClient(apiKey, 'gemini-2.5-flash', mockDelay);
          const mockModel = { generateContent: jest.fn() };
          client.getModel = jest.fn(() => mockModel);
          
          let callCount = 0;
          mockModel.generateContent.mockImplementation(() => {
            callCount++;
            if (callCount <= failCount) {
              throw new Error('API Error');
            }
            return Promise.resolve({
              response: { text: () => Promise.resolve('Success') }
            });
          });

          if (failCount <= allowedRetries) {
            const result = await client.generateContent('test', allowedRetries);
            expect(result).toBe('Success');
            expect(callCount).toBe(failCount + 1);
            expect(mockDelay).toHaveBeenCalledTimes(failCount);
          } else {
            await expect(client.generateContent('test', allowedRetries)).rejects.toThrow('API Error');
            expect(callCount).toBe(allowedRetries + 1);
            expect(mockDelay).toHaveBeenCalledTimes(allowedRetries);
          }
          
          mockDelay.mockClear();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
