import { test, expect, describe } from '@jest/globals';
import { moveTask, findTask, createTask, addTaskToColumn } from '../src/kanban/task-manager.js';
import { KANBAN_COLUMNS } from '../src/utils/constants.js';

describe('Task Manager Move Logic', () => {
    test('moveTask should move task between columns', () => {
        const db = {
            idees: [{ id: 1, titre: 'Test' }],
            a_faire: [],
            en_cours: [],
            en_revision: [],
            termine: []
        };

        moveTask(db, 1, KANBAN_COLUMNS.A_FAIRE);

        expect(db.idees).toHaveLength(0);
        expect(db.a_faire).toHaveLength(1);
        expect(db.a_faire[0].id).toBe(1);
    });

    test('moveTask should throw error if task not found', () => {
        const db = { idees: [], a_faire: [], en_cours: [], en_revision: [], termine: [] };
        expect(() => moveTask(db, 99, KANBAN_COLUMNS.TERMINE)).toThrow('Task #99 not found');
    });

    test('findTask should return task and its column', () => {
        const db = {
            idees: [],
            a_faire: [{ id: 5, titre: 'Find me' }],
            en_cours: [],
            en_revision: [],
            termine: []
        };
        const result = findTask(db, 5);
        expect(result).not.toBeNull();
        expect(result.task.titre).toBe('Find me');
        expect(result.column).toBe('a_faire');
    });
});
