import { extractIssueData, detectIssueType } from '../github/issue-processor.js';
import { createTask, addTaskToColumn, moveTask } from '../kanban/task-manager.js';
import { readDb, writeDb } from '../kanban/file-operations.js';
import { COLUMN_MAPPING } from '../utils/constants.js';

export class WorkflowManager {
  constructor(githubClient, geminiClient, analyzer, branchManager) {
    this.githubClient = githubClient;
    this.geminiClient = geminiClient;
    this.analyzer = analyzer;
    this.branchManager = branchManager;
  }

  async processGitHubIssue(issueNumber) {
    console.log(`Processing issue #${issueNumber}...`);
    
    try {
        // 1. Fetch issue
        const rawIssue = await this.githubClient.getIssue(issueNumber);
        const issueData = extractIssueData(rawIssue);
        
        // 2. AI Analysis
        console.log('Analyzing issue with Gemini...');
        const analysis = await this.analyzer.analyzeIssue(issueData);
        
        // 3. Update Kanban
        console.log('Updating Kanban board...');
        const db = await readDb();
        const column = analysis.suggestedColumn || COLUMN_MAPPING[analysis.type] || 'idees';
        
        // Check if task already exists for this issue
        let task;
        const existingTaskEntry = Object.values(db).flat().find(t => t.metadata && t.metadata.issueNumber === issueNumber);
        
        if (existingTaskEntry) {
            console.log(`Task already exists for issue #${issueNumber}. Moving to ${column}...`);
            task = existingTaskEntry;
            task.icon = analysis.icon || task.icon;
            task.color = analysis.color || task.color;
            moveTask(db, task.id, column);
        } else {
            task = createTask(issueData.title, issueData.body, analysis.acceptanceCriteria, { issueNumber }, analysis.icon, analysis.color);
            addTaskToColumn(db, task, column);
        }
                
        await writeDb(db);
        
        // Commit changes to repository
        console.log('Committing changes to repository...');
        const dbContent = JSON.stringify(db, null, 2);
        await this.githubClient.commitFile('.kaia', dbContent, `docs: update Kanban board - task ${task.id}`);
        
        // 4. GitHub Feedback
        console.log('Adding comment and labels to GitHub...');
        const missingDetails = analysis?.missingInformation?.details || [];
        const isMissingInformation = Boolean(analysis?.missingInformation?.isMissing && missingDetails.length > 0);
        const clarification = isMissingInformation
          ? await this.analyzer.generateClarificationDiscussion(issueData, missingDetails)
          : null;

        const clarificationSummary = clarification?.summary
          ? `\n${clarification.summary}`
          : '';
        const clarificationQuestions = clarification?.questions?.length
          ? `\n\n**Questions pour avancer :**\n${clarification.questions.map(q => `- ${q}`).join('\n')}`
          : '';
        const clarificationInputs = clarification?.requestedInputs?.length
          ? `\n\n**Éléments à fournir à Gemini :**\n${clarification.requestedInputs.map(i => `- ${i}`).join('\n')}`
          : '';

        const commentBody = `
### ${analysis.icon || '📝'} Task Created: ${task.id}
**Complexity:** ${analysis.complexity}
**Type:** ${analysis.type}
**Color:** \`${analysis.color}\`
**Suggested Column:** ${column}

#### Acceptance Criteria:
${analysis.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

${isMissingInformation ? `\n> [!WARNING]\n> **Missing Information:**\n> ${missingDetails.join('\n> ')}` : ''}
${isMissingInformation ? `\n\n### 💬 Discussion avec Gemini${clarificationSummary}${clarificationQuestions}${clarificationInputs}` : ''}
    `;
        
        
        try {
            if (this.githubClient.debug) {
                console.log('Attempting to create comment on GitHub issue...');
            }
            await this.githubClient.createComment(issueNumber, commentBody);
            if (this.githubClient.debug) {
                console.log('Successfully created comment on GitHub issue.');
            }
        } catch (commentError) {
            console.error(`Error creating comment on issue #${issueNumber}:`, commentError.message);
            if (this.githubClient.debug) {
                console.error('Comment Error Stack:', commentError.stack);
            }
        }

        try {
            if (this.githubClient.debug) {
                console.log('Attempting to add labels to GitHub issue...');
            }
            await this.githubClient.addLabels(issueNumber, [analysis.type, `complexity:${analysis.complexity}`]);
            if (this.githubClient.debug) {
                console.log('Successfully added labels to GitHub issue.');
            }
        } catch (labelError) {
            console.error(`Error adding labels to issue #${issueNumber}:`, labelError.message);
            if (this.githubClient.debug) {
                console.error('Label Error Stack:', labelError.stack);
            }
        }
        
        await this.githubClient.addLabels(issueNumber, [analysis.type, `complexity:${analysis.complexity}`]);

        // 5. Branch Creation (if en_cours)
        if (column === 'en_cours') {
            console.log('Creating working branch...');
            await this.branchManager.createBranchForTask(task.id, task.titre);
        }

        console.log(`Issue #${issueNumber} processed successfully. Task ID: ${task.id}`);
        return task;
    } catch (error) {
        console.error(`Error processing issue #${issueNumber}:`, error.message);
        try {
            await this.githubClient.createComment(issueNumber, `❌ **Error processing issue:** ${error.message}\n\nPlease check the action logs for more details.`);
        } catch (e) {
            console.error('Failed to post error comment to GitHub:', e.message);
        }
        throw error;
    }
  }

  async processPendingTasks() {
    console.log('Scanning Kanban for pending tasks...');
    const db = await readDb();
    const columnsToProcess = [KANBAN_COLUMNS.IDEES, KANBAN_COLUMNS.A_FAIRE];
    let processedCount = 0;

    for (const column of columnsToProcess) {
      const tasks = db[column] || [];
      for (const task of tasks) {
        // Skip if already has an issue or was recently analyzed
        if (task.metadata && task.metadata.issueNumber) continue;
        
        console.log(`Processing pending task #${task.id}: ${task.titre}...`);
        
        // Use AI to refine task
        const analysis = await this.analyzer.analyzeIssue({
          title: task.titre,
          body: task.description || ''
        });

        // Update task with AI findings
        task.description = task.description || '';
        task.criteres_acceptation = analysis.acceptanceCriteria;
        task.icon = analysis.icon || task.icon;
        task.color = analysis.color || task.color;
        task.metadata = {
          ...task.metadata,
          type: analysis.type,
          complexity: analysis.complexity,
          lastAnalyzed: new Date().toISOString()
        };

        processedCount++;
      }
    }

    if (processedCount > 0) {
      await writeDb(db);
      const dbContent = JSON.stringify(db, null, 2);
      await this.githubClient.commitFile('.kaia', dbContent, `docs: refine ${processedCount} pending tasks via Gemini`);
      console.log(`Refined ${processedCount} tasks.`);
    } else {
      console.log('No pending tasks to process.');
    }
  }

  async installWorkflows() {
    const actionRepo = process.env.GITHUB_ACTION_REPOSITORY || 'alphaleadership/kanbanaction';
    const actionVersion = actionRepo === 'alphaleadership/kanbanaction' ? 'main' : 'v1';

    const sharedSteps = `
      - uses: actions/checkout@v4
      - name: Checkout action source
        uses: actions/checkout@v4
        with:
          repository: ${actionRepo}
          ref: ${actionVersion}
          path: .kanban-action
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install action dependencies
        run: npm ci
        working-directory: .kanban-action
      - name: Run Gemini Kanban Action
        run: node action.js
        working-directory: .kanban-action
        env:
          INPUT_GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          INPUT_GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: \${{ github.repository }}
          GITHUB_REF: \${{ github.ref }}
          GITHUB_EVENT_NAME: \${{ github.event_name }}
          GITHUB_EVENT_PATH: \${{ github.event_path }}
          GITHUB_ACTION_REPOSITORY: ${actionRepo}
`;

    const workflows = [
      {
        path: '.github/workflows/gemini-kanban.yml',
        content: `name: Gemini Kanban Integration
on:
  issues:
    types: [opened, labeled]
  pull_request:
    types: [closed]
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  process-issue:
    runs-on: ubuntu-latest
    steps:${sharedSteps}
`
      },
      {
        path: '.github/workflows/process-pending-tasks.yml',
        content: `name: Process Pending Tasks
on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  process-tasks:
    runs-on: ubuntu-latest
    steps:${sharedSteps}
`
      }
    ];

    console.log(`Installing/Updating workflows using action: ${actionRepo}@${actionVersion}...`);

    for (const wf of workflows) {
      try {
        await this.githubClient.commitFile(wf.path, wf.content, `ci: install/update ${wf.path}`);
        console.log(`Successfully installed ${wf.path}`);
      } catch (error) {
        let message = error.message;
        if (error.status === 403 || error.status === 404) {
          message += " (Hint: The default GITHUB_TOKEN cannot modify workflow files. Ensure you are using a Personal Access Token (PAT) with 'workflow' scope.)";
        }
        console.error(`Failed to install ${wf.path}:`, message);
      }
    }
  }

  async processPullRequestMerge(prNumber) {
    console.log(`Processing merged PR #${prNumber}...`);

    try {
      // 1. Fetch PR data to find linked issues
      const pr = await this.githubClient.octokit.pulls.get({
        owner: this.githubClient.owner,
        repo: this.githubClient.repo,
        pull_number: prNumber
      });

      const body = pr.data.body || '';
      // Simple regex to find "closes #123" or "fixes #123"
      const issueMatches = body.match(/(?:closes|fixes|resolves)\s+#(\d+)/gi);

      if (!issueMatches) {
        console.log('No linked issues found in PR description.');
        return;
      }

      const db = await readDb();
      let updated = false;

      for (const match of issueMatches) {
        const issueNumber = parseInt(match.match(/\d+/)[0]);
        console.log(`Found linked issue #${issueNumber}. Moving task to 'termine'...`);

        const existingTaskEntry = Object.values(db).flat().find(t => t.metadata && t.metadata.issueNumber === issueNumber);

        if (existingTaskEntry) {
          moveTask(db, existingTaskEntry.id, 'termine');
          updated = true;
          console.log(`Task #${existingTaskEntry.id} moved to 'termine'.`);
        } else {
          console.log(`No Kanban task found for issue #${issueNumber}.`);
        }
      }

      if (updated) {
        await writeDb(db);
        const dbContent = JSON.stringify(db, null, 2);
        await this.githubClient.commitFile('.kaia', dbContent, `docs: complete tasks from merged PR #${prNumber}`);
      }
    } catch (error) {
      console.error(`Error processing merged PR #${prNumber}:`, error.message);
      throw error;
    }
  }
}