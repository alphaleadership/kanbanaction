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

  async createBranchForTask(taskId, title, fromBranch) {
    const branchName = generateBranchName(taskId, title);
    try {
        // Check if branch already exists
        await this.client.getRef(branchName);
        console.log(`Branch ${branchName} already exists, using it.`);
        return branchName;
    } catch (error) {
        if (error.status === 404) {
            // Branch does not exist, create it from the base branch
            console.log(`Branch ${branchName} does not exist. Creating it...`);
            const baseBranch = fromBranch || await this.client.getDefaultBranch();
            const baseSha = await this.client.getLatestCommitSha(baseBranch);
            await this.client.createRef(branchName, baseSha);
            return branchName;
        }
        // Rethrow if it's another type of error
        throw error;
    }
  }

  async createPRForTask(taskId, title, branchName, base) {
      const prTitle = `Task ${taskId}: ${title}`;
      const prBody = `Closes issue related to task ${taskId}. Automatically created by Gemini Kanban.`;
      const baseBranch = base || await this.client.getDefaultBranch();
      return await this.client.createPullRequest(prTitle, prBody, branchName, baseBranch);
  }
}
