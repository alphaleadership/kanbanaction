export function generateBranchName(taskId, title) {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `task-${taskId}-${sanitizedTitle}`;
}

export class BranchManager {
  constructor(client) {
    this.client = client;
  }

  async createBranchForTask(taskId, title, fromBranch = 'master') {
    const branchName = generateBranchName(taskId, title);
    try {
        const baseSha = await this.client.getLatestCommitSha(fromBranch);
        await this.client.createRef(branchName, baseSha);
        return branchName;
    } catch (error) {
        if (error.status === 422) { // Already exists
            return branchName;
        }
        throw error;
    }
  }

  async createPRForTask(taskId, title, branchName, base = 'master') {
      const prTitle = `Task ${taskId}: ${title}`;
      const prBody = `Closes issue related to task ${taskId}. Automatically created by Gemini Kanban.`;
      return await this.client.createPullRequest(prTitle, prBody, branchName, base);
  }
}
