import fs from 'fs/promises';
import { delay } from '../utils/helpers.js';
import { extractIssueData, detectIssueType } from '../github/issue-processor.js';
import { createTask, addTaskToColumn, moveTask, getNextId } from '../kanban/task-manager.js';
import { readDb, writeDb } from '../kanban/file-operations.js';
import { DialogueManager } from '../gemini/dialogue-manager.js';
import { generateBranchName } from '../github/branch-manager.js';
import * as ConstantsModule from '../utils/constants.js';

const KANBAN_COLUMNS = ConstantsModule.KANBAN_COLUMNS;
const COLUMN_MAPPING = ConstantsModule.COLUMN_MAPPING;

export class WorkflowManager {
  static KANBAN_COLUMNS = KANBAN_COLUMNS;
  static COLUMN_MAPPING = COLUMN_MAPPING;

  constructor(githubClient, geminiClient, analyzer, branchManager) {
    this.githubClient = githubClient;
    this.geminiClient = geminiClient;
    this.analyzer = analyzer;
    this.branchManager = branchManager;
    this.dialogueManager = new DialogueManager();
  }

  async handleFileActions(actions, issueNumber, dialogue, branchName) {
    if (!actions || !actions.length) return null;

    let readResults = [];
    const processedActions = [];

    for (const action of actions) {
      console.log(`Executing file action: ${action.action} on ${action.path}...`);
      
      try {
        if (action.action === 'read') {
          const content = await fs.readFile(action.path, 'utf8');
          readResults.push({ path: action.path, content });
          processedActions.push({ ...action, status: 'success' });
        } else if (action.action === 'write') {
          await fs.writeFile(action.path, action.content, 'utf8');
          await this.githubClient.commitFile(action.path, action.content, `fix: automatic update via Gemini for #${issueNumber}\n\n${action.explanation}`, branchName);
          processedActions.push({ ...action, status: 'success' });
        } else if (action.action === 'patch') {
          let content = await fs.readFile(action.path, 'utf8');
          // Normalize line endings to LF for consistent matching
          const normalizedContent = content.replace(/\r\n/g, '\n');
          const normalizedOld = action.oldContent.replace(/\r\n/g, '\n');
          const normalizedNew = action.newContent.replace(/\r\n/g, '\n');

          if (normalizedContent.includes(normalizedOld)) {
            const updatedContent = normalizedContent.replace(normalizedOld, normalizedNew);
            await fs.writeFile(action.path, updatedContent, 'utf8');
            await this.githubClient.commitFile(action.path, updatedContent, `fix: patch applied via Gemini for #${issueNumber}\n\n${action.explanation}`, branchName);
            processedActions.push({ ...action, status: 'success' });
          } else {
            throw new Error(`Could not find the exact 'oldContent' in ${action.path}. Please provide an exact match including indentation.`);
          }
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.action} on ${action.path}:`, error.message);
        processedActions.push({ ...action, status: 'error', error: error.message });
      }
    }

    if (readResults.length > 0) {
      this.dialogueManager.addEntry(dialogue, 'system', readResults, { type: 'file_read_results' });
      await this.dialogueManager.saveDialogue(issueNumber, dialogue);
      
      console.log('Files read. Re-analyzing with new context...');
      // Re-run analysis with context added to dialogue
      // The analyzer will see the history in the dialogue if we pass it (to be implemented)
      return await this.analyzer.analyzeIssue({
          title: `Context Update #${issueNumber}`,
          body: `I have read the requested files: ${readResults.map(r => r.path).join(', ')}. Please refine your analysis.`,
          labels: []
      }, dialogue.history);
    }

    return null;
  }

  async processGitHubIssue(issueNumber) {
    console.log(`Processing issue #${issueNumber}...`);
    
    try {
        // 1. Fetch issue
        const rawIssue = await this.githubClient.getIssue(issueNumber);
        const issueData = extractIssueData(rawIssue);

        // Determine Task ID and Create Branch early
        const db = await readDb();
        const existingTaskEntry = Object.values(db).flat().find(t => t.metadata && t.metadata.issueNumber === issueNumber);
        const taskId = existingTaskEntry ? existingTaskEntry.id : getNextId(db);
        
        console.log(`Creating/Ensuring branch for task #${taskId}...`);
        const branchName = await this.branchManager.createBranchForTask(taskId, issueData.title);
        console.log(`Using branch: ${branchName}`);

        // Load dialogue context
        let dialogue = await this.dialogueManager.loadDialogue(issueNumber);
        this.dialogueManager.addEntry(dialogue, 'user', issueData, { event: 'issue_opened/labeled' });
        
        // 2. AI Analysis (with Loop for file actions)
        let analysis;
        let iterations = 0;
        const maxIterations = 3;

        while (iterations < maxIterations) {
            console.log(`Analyzing issue with Gemini (Iteration ${iterations + 1})...`);
            analysis = await this.analyzer.analyzeIssue(issueData, dialogue.history);
            
            // Save analysis to dialogue
            this.dialogueManager.addEntry(dialogue, 'assistant', analysis, { type: 'analysis', iteration: iterations });
            
            if (analysis.fileActions && analysis.fileActions.length > 0) {
                const nextAnalysis = await this.handleFileActions(analysis.fileActions, issueNumber, dialogue, branchName);
                if (nextAnalysis) {
                    iterations++;
                    console.log('Waiting 2 seconds before next iteration...');
                    await delay(2000);
                    continue; 
                }
            }
            break;
        }
        
        await this.dialogueManager.saveDialogue(issueNumber, dialogue);

        // Commit dialogue file to repo on the dedicated branch
        try {
            const dialoguePath = this.dialogueManager.getRelativePath(issueNumber);
            const dialogueContent = JSON.stringify(dialogue, null, 2);
            await this.githubClient.commitFile(dialoguePath, dialogueContent, `docs: update dialogue context for #${issueNumber}`, branchName);
        } catch (e) {
            console.warn('Failed to commit dialogue file:', e.message);
        }

        // 3. Update Kanban
        console.log('Updating Kanban board...');
        const column = analysis.suggestedColumn || WorkflowManager.COLUMN_MAPPING[analysis.type] || 'idees';
        
        let task;
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
        
        // Commit changes to repository on the dedicated branch
        console.log('Committing changes to repository...');
        const dbContent = JSON.stringify(db, null, 2);
        await this.githubClient.commitFile('.kaia', dbContent, `docs: update Kanban board - task ${task.id}`, branchName);
        
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

        // 5. PR Creation (if en_cours or file actions performed)
        if (column === 'en_cours' || (analysis.fileActions && analysis.fileActions.length > 0)) {
            console.log('Creating Pull Request...');
            try {
                await this.branchManager.createPRForTask(task.id, task.titre, branchName);
            } catch (prError) {
                console.error('Failed to create PR:', prError.message);
            }
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
    const columnsToProcess = [WorkflowManager.KANBAN_COLUMNS.IDEES, WorkflowManager.KANBAN_COLUMNS.A_FAIRE];
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
        // Add a small delay between tasks to avoid 429
        await delay(1000);
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
          INPUT_GITHUB_TOKEN: \${{ secrets.GH_PAT }}
          GITHUB_TOKEN: \${{ secrets.GH_PAT }}
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
      },
      {
        path: '.github/workflows/test-and-report.yml',
        content: `name: Run Tests and Report Failures
on:
  workflow_dispatch:
    inputs:
      type:
        description: 'Type of workflow run'
        required: true
        default: 'manual'
        type: choice
        options:
          - manual
          - scheduled
          - CI
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  issues: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
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
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Log Workflow Type
        run: echo "Running workflow of type \${{ github.event.inputs.type || 'CI' }}"
      - name: Run Tests
        run: npm test -- --json --outputFile=test-results.json || true
      - name: Report Failures
        if: always()
        env:
          GITHUB_TOKEN: \${{ secrets.GH_PAT }}
          GITHUB_REPOSITORY: \${{ github.repository }}
        run: node .kanban-action/scripts/report-test-failures.js
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