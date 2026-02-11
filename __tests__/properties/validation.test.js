import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { validateKanbanStructure } from '../../src/utils/validators.js';
import { KANBAN_COLUMNS } from '../../src/utils/constants.js';

describe('Property 12: File Format Validation', () => {
  test('should validate correct kanban structure', () => {
    fc.assert(
      fc.property(
        fc.record({
            idees: fc.array(fc.anything()),
            a_faire: fc.array(fc.anything()),
            en_cours: fc.array(fc.anything()),
            en_revision: fc.array(fc.anything()),
            termine: fc.array(fc.anything())
        }),
        (data) => {
          const result = validateKanbanStructure(data);
          return result.valid === true;
        }
      )
    );
  });

  test('should reject invalid kanban structure (missing column or not array)', () => {
    fc.assert(
        fc.property(
            fc.object(), 
            (data) => {
                const columns = Object.values(KANBAN_COLUMNS);
                const hasAllColumns = columns.every(col => data && Array.isArray(data[col]));
                
                const result = validateKanbanStructure(data);
                return hasAllColumns ? result.valid : !result.valid;
            }
        )
    );
  });
});
