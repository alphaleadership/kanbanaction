import * as core from '@actions/core';
import * as github from '@actions/github';
import { validateAndGetConfig } from './src/config/index.js';
import { GitHubClient } from './src/github/api-client.js';
import { GeminiClient } from './src/gemini/api-client.js';
import { IssueAnalyzer } from './src/gemini/analyzer.js';
import { BranchManager } from './src/github/branch-manager.js';
import { WorkflowManager } from './src/workflow/manager.js';

async function run() {
  try {
    const config = validateAndGetConfig();
    
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

    const context = github.context;
    
    if (context.eventName === 'issues' && (context.payload.action === 'opened' || context.payload.action === 'labeled')) {
      const issueNumber = context.payload.issue.number;
      await workflow.processGitHubIssue(issueNumber);
    } else if (context.eventName === 'workflow_dispatch') {
      console.log('Manual trigger detected. Processing last 5 issues...');
      // Implementation for manual trigger could go here
    } else {
      console.log(`Event ${context.eventName} with action ${context.payload.action} is not handled.`);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
