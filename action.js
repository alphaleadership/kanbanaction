import * as core from '@actions/core';
import * as github from '@actions/github';
import { validateAndGetConfig } from './src/config/index.js';
import { GitHubClient } from './src/github/api-client.js';
import { GeminiClient } from './src/gemini/api-client.js';
import { IssueAnalyzer } from './src/gemini/analyzer.js';
import { BranchManager } from './src/github/branch-manager.js';
import { WorkflowManager } from './src/workflow/manager.js';

async function run() {
  const config = validateAndGetConfig();
  const CENTRAL_REPO = 'alphaleadership/kanbanaction';

  try {
    if (config.debug) {
        console.log('Debug mode enabled');
        console.log('Context:', JSON.stringify(github.context, null, 2));
    }

    const githubClient = new GitHubClient(config.githubToken, config.githubRepo);
    const geminiClient = new GeminiClient(config.geminiApiKey, {
      primaryModel: config.geminiModel,
      fallbackModels: config.geminiFallbackModels,
      retries: config.geminiRetries
    });
    const analyzer = new IssueAnalyzer(geminiClient);
    const branchManager = new BranchManager(githubClient);
    const workflow = new WorkflowManager(githubClient, geminiClient, analyzer, branchManager);

    if (config.installWorkflows) {
      await workflow.installWorkflows();
    }

    const context = github.context;
    
    if (context.eventName === 'issues' && (context.payload.action === 'opened' || context.payload.action === 'labeled')) {
      const issueNumber = context.payload.issue.number;
      await workflow.processGitHubIssue(issueNumber);
    } else if (context.eventName === 'pull_request' && context.payload.action === 'closed' && context.payload.pull_request.merged) {
      const prNumber = context.payload.pull_request.number;
      await workflow.processPullRequestMerge(prNumber);
    } else if (context.eventName === 'workflow_dispatch' || context.eventName === 'schedule') {
      console.log(`Triggered by ${context.eventName}. Processing pending tasks...`);
      await workflow.processPendingTasks();
    } else {
      console.log(`Event ${context.eventName} with action ${context.payload.action} is not handled.`);
    }

  } catch (error) {
    core.setFailed(error.message);
    
    try {
      console.log(`Reporting error to central repository: ${CENTRAL_REPO}`);
      const centralClient = new GitHubClient(config.githubToken, CENTRAL_REPO);
      const errorTitle = `Error in ${github.context.payload.repository?.full_name || 'unknown repo'}: ${error.message.substring(0, 50)}...`;
      const errorBody = `
### Error Details
- **Repository:** ${github.context.payload.repository?.full_name || 'Unknown'}
- **Event:** ${github.context.eventName}
- **Action:** ${github.context.payload.action || 'N/A'}
- **Error Message:** ${error.message}

### Stack Trace
\`\`\`
${error.stack}
\`\`\`

### Context
<details>
<summary>GitHub Context</summary>

\`\`\`json
${JSON.stringify(github.context, null, 2)}
\`\`\`
</details>
      `;
      
      await centralClient.createIssue(errorTitle, errorBody, ['bug', 'automated-report']);
    } catch (reportError) {
      console.error('Failed to report error to central repository:', reportError.message);
    }
  }
}

run();
