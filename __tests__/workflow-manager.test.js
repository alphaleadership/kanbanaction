import { describe, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('../src/kanban/file-operations.js', () => ({
  readDb: jest.fn(),
  writeDb: jest.fn(),
}));

const { WorkflowManager } = await import('../src/workflow/manager.js');
const { readDb } = await import('../src/kanban/file-operations.js');

describe('WorkflowManager.processPendingTasks', () => {
  test('processes pending tasks from IDEES and A_FAIRE columns', async () => {
    const mockDb = {
      '💡 Idées': [
        { id: 1, titre: 'Task 1', metadata: {} }
      ],
      '📋 À faire': [
        { id: 2, titre: 'Task 2' }
      ],
      '🚧 En cours': [],
      '✅ Terminé': []
    };

    readDb.mockResolvedValue(mockDb);

    const githubClient = {
      getIssue: jest.fn(),
      createIssue: jest.fn().mockResolvedValue({ data: { number: 123 } }),
      addComment: jest.fn()
    };
    const geminiClient = {};
    const analyzer = {
      analyzeTask: jest.fn().mockResolvedValue({
        titre: 'Task 1',
        description: 'Analyzed description',
        labels: ['enhancement']
      })
    };
    const branchManager = {};

    const manager = new WorkflowManager(githubClient, geminiClient, analyzer, branchManager);

    // We just want to see if it runs without ReferenceError: KANBAN_COLUMNS is not defined
    // We'll mock the internal calls enough to get past the initial scan
    await manager.processPendingTasks();

    expect(readDb).toHaveBeenCalled();
  });
});
