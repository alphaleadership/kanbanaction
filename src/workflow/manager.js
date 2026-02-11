import { extractIssueData, detectIssueType } from '../github/issue-processor.js';
import { createTask, addTaskToColumn } from '../kanban/task-manager.js';
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
            moveTask(db, task.id, column);
        } else {
            task = createTask(issueData.title, issueData.body, analysis.acceptanceCriteria, { issueNumber });
            addTaskToColumn(db, task, column);
        }
        
        await writeDb(db);
        
        // Commit changes to repository
        console.log('Committing changes to repository...');
        const dbContent = JSON.stringify(db, null, 2);
        await this.githubClient.commitFile('.kaia', dbContent, `docs: update Kanban board - task ${task.id}`);
        
        // 4. GitHub Feedback
        console.log('Adding comment and labels to GitHub...');
        const commentBody = `
### Task Created: ${task.id}
**Complexity:** ${analysis.complexity}
**Type:** ${analysis.type}
**Suggested Column:** ${column}

#### Acceptance Criteria:
${analysis.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

${analysis.missingInformation.isMissing ? `\n> [!WARNING]\n> **Missing Information:**\n> ${analysis.missingInformation.details.join('\n> ')}` : ''}
    `;
        
        await this.githubClient.createComment(issueNumber, commentBody);
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
}