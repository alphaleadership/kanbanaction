import { test, expect, describe, afterAll } from '@jest/globals';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { readDb, writeDb } from '../../src/kanban/file-operations.js';

describe('Property 4: Kanban Data Structure Preservation', () => {
    const tempDir = path.join(os.tmpdir(), 'kanban-test-' + Date.now());

    test('should preserve data after write and read', async () => {
        if (!await fs.stat(tempDir).catch(() => false)) {
            await fs.mkdir(tempDir, { recursive: true });
        }
        
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    idees: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                    a_faire: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                    en_cours: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                    en_revision: fc.array(fc.record({ id: fc.nat(), titre: fc.string() })),
                    termine: fc.array(fc.record({ id: fc.nat(), titre: fc.string() }))
                }),
                async (data) => {
                    const testFile = path.join(tempDir, 'kanban-' + Math.random() + '.json');
                    await writeDb(data, testFile);
                    const readData = await readDb(testFile);
                    expect(readData).toEqual(data);
                    return true;
                }
            ),
            { numRuns: 2 }
        );
    }, 15000);

    afterAll(async () => {
        try {
            await fs.rm(tempDir, { recursive: true });
        } catch (e) {}
    });
});
