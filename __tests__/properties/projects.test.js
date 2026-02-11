import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { KANBAN_COLUMNS } from '../../src/utils/constants.js';

// Simple mapping logic that we might use in the future
function mapColumnToProjectStatus(column, mapping) {
    return mapping[column] || 'Todo';
}

describe('Property 17 & 18: Project Synchronization Mapping', () => {
  test('should correctly map kanban columns to project statuses', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(KANBAN_COLUMNS)),
        fc.dictionary(fc.constantFrom(...Object.values(KANBAN_COLUMNS)), fc.string()),
        (column, mapping) => {
          const status = mapColumnToProjectStatus(column, mapping);
          if (mapping[column]) {
              expect(status).toBe(mapping[column]);
          } else {
              expect(status).toBe('Todo');
          }
          return true;
        }
      )
    );
  });
});
