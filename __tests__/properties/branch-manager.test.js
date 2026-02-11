import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { generateBranchName } from '../../src/github/branch-manager.js';

describe('Property 24: Branch Creation and Naming', () => {
  test('should generate valid branch names', () => {
    fc.assert(
      fc.property(
        fc.nat(), fc.string({ minLength: 1 }),
        (id, title) => {
          const branchName = generateBranchName(id, title);
          
          // Should start with task-ID-
          const prefix = `task-${id}-`;
          const isValidPrefix = branchName.startsWith(prefix);
          
          // Should only contain lowercase, numbers, and hyphens
          const isValidChars = /^[a-z0-9-]+$/.test(branchName);
          
          // Should not have double hyphens
          const noDoubleHyphens = !branchName.includes('--');
          
          return isValidPrefix && isValidChars && noDoubleHyphens;
        }
      )
    );
  });
});
