import { describe, expect, jest, test } from '@jest/globals';
import { IssueAnalyzer } from '../src/gemini/analyzer.js';

describe('IssueAnalyzer clarification discussion', () => {
  test('returns an empty discussion payload when no missing details', async () => {
    const mockClient = {
      generateJson: jest.fn()
    };
    const analyzer = new IssueAnalyzer(mockClient);

    const result = await analyzer.generateClarificationDiscussion({ title: 't', body: 'b' }, []);

    expect(result).toEqual({
      summary: 'No blocking information is missing.',
      questions: [],
      requestedInputs: []
    });
    expect(mockClient.generateJson).not.toHaveBeenCalled();
  });

  test('asks Gemini for clarification questions when details are missing', async () => {
    const expected = {
      summary: 'Il manque des informations pour avancer.',
      questions: ['Question 1'],
      requestedInputs: ['Logs complets']
    };
    const mockClient = {
      generateJson: jest.fn().mockResolvedValue(expected)
    };
    const analyzer = new IssueAnalyzer(mockClient);

    const issueData = { title: 'Bug API', body: 'Erreur 500 aléatoire' };
    const details = ['Étapes de reproduction absentes'];
    const result = await analyzer.generateClarificationDiscussion(issueData, details);

    expect(result).toEqual(expected);
    expect(mockClient.generateJson).toHaveBeenCalledTimes(1);
    expect(mockClient.generateJson.mock.calls[0][0]).toContain('Bug API');
    expect(mockClient.generateJson.mock.calls[0][0]).toContain(details[0]);
  });
});
