import { describe, expect, jest, test } from '@jest/globals';
import { WorkflowManager } from '../src/workflow/manager.js';

describe('WorkflowManager.installWorkflows', () => {
  test('installs workflows that checkout action source and install modules on runner', async () => {
    const githubClient = {
      commitFile: jest.fn().mockResolvedValue(undefined)
    };
    const manager = new WorkflowManager(githubClient, {}, {}, {});

    process.env.GITHUB_ACTION_REPOSITORY = 'alphaleadership/kanbanaction';

    await manager.installWorkflows();

    expect(githubClient.commitFile).toHaveBeenCalledTimes(3);

    const firstWorkflowContent = githubClient.commitFile.mock.calls[0][1];
    expect(firstWorkflowContent).toContain('Checkout action source');
    expect(firstWorkflowContent).toContain('working-directory: .kanban-action');
    expect(firstWorkflowContent).toContain('run: npm ci');
    expect(firstWorkflowContent).toContain('repository: alphaleadership/kanbanaction');
    expect(firstWorkflowContent).toContain('ref: main');
  });
});
