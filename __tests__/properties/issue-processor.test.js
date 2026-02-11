import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { extractIssueData, detectIssueType } from '../../src/github/issue-processor.js';

describe('Property 1: Issue Processing Completeness', () => {
  test('should extract all relevant fields from raw issue', () => {
    fc.assert(
      fc.property(
        fc.record({
          number: fc.nat(),
          title: fc.string(),
          body: fc.string(),
          labels: fc.array(fc.record({ name: fc.string() })),
          user: fc.record({ login: fc.string() }),
          created_at: fc.string()
        }),
        (rawIssue) => {
          const extracted = extractIssueData(rawIssue);
          
          return (
            extracted.number === rawIssue.number &&
            extracted.title === rawIssue.title &&
            extracted.body === rawIssue.body &&
            extracted.author === rawIssue.user.login &&
            extracted.labels.length === rawIssue.labels.length
          );
        }
      )
    );
  });

  test('should detect correct issue type from labels', () => {
      const bugLabels = ['bug', 'BUG', 'Bug Report'];
      const featureLabels = ['feature', 'enhancement', 'Feature Request'];
      
      fc.assert(
          fc.property(
              fc.record({
                  labels: fc.array(fc.string())
              }),
              (issueData) => {
                  const type = detectIssueType(issueData);
                  const labels = issueData.labels.map(l => l.toLowerCase());
                  
                  if (labels.includes('bug')) return type === 'bug';
                  if (labels.includes('feature') || labels.includes('enhancement')) return type === 'feature';
                  if (labels.includes('question')) return type === 'question';
                  return type === 'feature'; // Default
              }
          )
      );
  });
});
