import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { getNextId, createTask, addTaskToColumn } from '../../src/kanban/task-manager.js';
import { KANBAN_COLUMNS } from '../../src/utils/constants.js';

describe('Task Manager Properties', () => {
  test('Property 10: ID Uniqueness', () => {
    fc.assert(
      fc.property(
        fc.record({
            idees: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
            a_faire: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
            en_cours: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
            en_revision: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
            termine: fc.array(fc.record({ id: fc.nat(), titre: fc.string() }))
        }),
        (db) => {
          const nextId = getNextId(db);
          const allIds = Object.values(db).flat().map(t => t.id);
          return !allIds.includes(nextId);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3: Task Creation Completeness', () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), fc.array(fc.string()),
        (titre, desc, criteres) => {
          const task = createTask(titre, desc, criteres);
          return (
              task.titre === titre &&
              task.description === desc &&
              Array.isArray(task.criteres_acceptation) &&
              task.criteres_acceptation.length === criteres.length
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  test('addTaskToColumn should maintain uniqueness and validity', () => {
      fc.assert(
          fc.property(
            fc.record({
                idees: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                a_faire: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                en_cours: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                en_revision: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                termine: fc.array(fc.record({ id: fc.nat(), titre: fc.string() }))
            }),
            fc.string({minLength: 1}),
            (db, titre) => {
                const task = createTask(titre);
                const col = KANBAN_COLUMNS.IDEES;
                const originalCount = db[col].length;
                
                addTaskToColumn(db, task, col);
                
                const newAllTasks = Object.values(db).flat();
                const ids = newAllTasks.map(t => t.id);
                const uniqueIds = new Set(ids);
                
                return (
                    db[col].length === originalCount + 1 &&
                    ids.length === uniqueIds.size &&
                    db[col].some(t => t.titre === titre)
                );
            }
          ),
          { numRuns: 20 }
      )
  })
});
