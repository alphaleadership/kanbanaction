import { KANBAN_COLUMNS, COLUMN_MAPPING } from '../utils/constants.js';

export class IssueAnalyzer {
  constructor(client) {
    this.client = client;
  }

  async analyzeIssue(issueData) {
    const prompt = `
      Analyze the following GitHub issue and provide a structured JSON response.
      
      Issue Title: ${issueData.title}
      Issue Body: ${issueData.body}
      Labels: ${issueData.labels.join(', ')}
      
      Requirements:
      1. Assess technical complexity (low, medium, high).
      2. Classify the issue (bug, feature, question).
      3. Suggest a Kanban column (${Object.values(KANBAN_COLUMNS).join(', ')}).
      4. Generate at least 3 testable acceptance criteria.
      5. Identify if any information is missing (true/false) and list what's missing.
      
      Return JSON format:
      {
        "complexity": "low|medium|high",
        "type": "bug|feature|question",
        "suggestedColumn": "...",
        "acceptanceCriteria": ["...", "...", "..."],
        "missingInformation": {
          "isMissing": false,
          "details": []
        }
      }
    `;

    const analysis = await this.client.generateJson(prompt);
    return analysis;
  }
}
