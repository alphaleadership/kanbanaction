import { test, expect, describe, jest } from '@jest/globals';
import fc from 'fast-check';
import { IssueAnalyzer } from '../../src/gemini/analyzer.js';
import { KANBAN_COLUMNS } from '../../src/utils/constants.js';

describe('Property 2: AI Analysis Consistency', () => {
  test('should correctly process various AI responses', async () => {
    const mockClient = {
      generateJson: jest.fn()
    };
    const analyzer = new IssueAnalyzer(mockClient);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          complexity: fc.constantFrom('low', 'medium', 'high'),
          type: fc.constantFrom('bug', 'feature', 'question'),
          suggestedColumn: fc.constantFrom(...Object.values(KANBAN_COLUMNS)),
          acceptanceCriteria: fc.array(fc.string(), { minLength: 3 }),
          missingInformation: fc.record({
            isMissing: fc.boolean(),
            details: fc.array(fc.string())
          })
        }),
        async (mockResponse) => {
          mockClient.generateJson.mockResolvedValue(mockResponse);
          
          const issueData = { title: 'Test', body: 'Body', labels: [] };
          const result = await analyzer.analyzeIssue(issueData);
          
          expect(result).toEqual(mockResponse);
          expect(mockClient.generateJson).toHaveBeenCalled();
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
});
