import { Octokit } from '@octokit/rest';

export class GitHubClient {
  constructor(token, repoPath) {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repoPath.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  async getIssue(issueNumber) {
    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });
    return data;
  }

  async createComment(issueNumber, body) {
    const { data } = await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body
    });
    return data;
  }

  async addLabels(issueNumber, labels) {
    const { data } = await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels
    });
    return data;
  }

  async getRef(ref) {
      const { data } = await this.octokit.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: `heads/${ref}`
      });
      return data;
  }

  async createRef(ref, sha) {
      const { data } = await this.octokit.git.createRef({
          owner: this.owner,
          repo: this.repo,
          ref: `refs/heads/${ref}`,
          sha
      });
      return data;
  }

  async createCommit(message, tree, parents) {
      const { data } = await this.octokit.git.createCommit({
          owner: this.owner,
          repo: this.repo,
          message,
          tree,
          parents
      });
      return data;
  }

  async updateRef(ref, sha) {
      await this.octokit.git.updateRef({
          owner: this.owner,
          repo: this.repo,
          ref: `heads/${ref}`,
          sha
      });
  }

  async getDefaultBranch() {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo
    });
    return data.default_branch;
  }

  async createPullRequest(title, body, head, base) {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      head,
      base
    });
    return data;
  }

  async createIssue(title, body, labels = []) {
    const { data } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      labels
    });
    return data;
  }

  async getLatestCommitSha(branch) {
      const targetBranch = branch || await this.getDefaultBranch();
      const { data } = await this.octokit.repos.getBranch({
          owner: this.owner,
          repo: this.repo,
          branch: targetBranch
      });
      return data.commit.sha;
  }
  
  async commitFile(filePath, content, message, branch) {
      const targetBranch = branch || await this.getDefaultBranch();
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
          try {
              const currentSha = await this.getLatestCommitSha(targetBranch);
              const { data: commit } = await this.octokit.git.getCommit({
                  owner: this.owner,
                  repo: this.repo,
                  commit_sha: currentSha
              });

              // Check if file content is identical to avoid unnecessary commits
              let fileSha = null;
              try {
                  const { data: existingContent } = await this.octokit.repos.getContent({
                      owner: this.owner,
                      repo: this.repo,
                      path: filePath,
                      ref: currentSha
                  });
                  fileSha = existingContent.sha;
              } catch (error) {
                  if (error.status !== 404) { // Ignore 404 (file not found), rethrow other errors
                      throw error;
                  }
              }

              const { data: blob } = await this.octokit.git.createBlob({
                  owner: this.owner,
                  repo: this.repo,
                  content,
                  encoding: 'utf-8'
              });

              if (fileSha === blob.sha) {
                  console.log(`File ${filePath} content is identical. Skipping commit.`);
                  return commit;
              }

              const { data: tree } = await this.octokit.git.createTree({
                  owner: this.owner,
                  repo: this.repo,
                  base_tree: commit.tree.sha,
                  tree: [{
                      path: filePath,
                      mode: '100644',
                      type: 'blob',
                      sha: blob.sha
                  }]
              });

              const newCommit = await this.createCommit(message, tree.sha, [currentSha]);
              await this.updateRef(targetBranch, newCommit.sha);
              return newCommit;
          } catch (error) {
              if (error.message.includes('Update is not a fast forward') && i < maxRetries - 1) {
                  console.warn(`Non-fast-forward update detected for branch ${targetBranch}. Retrying... (Attempt ${i + 1}/${maxRetries})`);
                  // Ensure 'delay' utility is imported at the top of the file: import { delay } from '../utils/helpers.js';
                  await delay(1000 * (i + 1)); // Exponential backoff
              } else {
                  throw error; // Re-throw if it's not a fast-forward error or max retries reached
              }
          }
      }
  }
}
