import { KANBAN_COLUMNS } from '../utils/constants.js';

export class IssueAnalyzer {
  constructor(client) {
    this.client = client;
  }

  async analyzeIssue(issueData) {
    const maxBodyLength = 4000;
    const trimmedBody = (issueData.body || '').slice(0, maxBodyLength);
    const bodyWasTrimmed = (issueData.body || '').length > maxBodyLength;
    const preferredModel = (issueData.body || '').length > 8000 ? 'gemini-2.5-pro' : undefined;

    const prompt = `
      Analyze the following GitHub issue and provide a structured JSON response.
      
      Issue Title: ${issueData.title}
      Issue Body: ${trimmedBody}
      ${bodyWasTrimmed ? 'Note: The body was truncated for performance. Prioritize key technical points.' : ''}
      Labels: ${issueData.labels.join(', ')}
      
      Requirements:
      1. Assess technical complexity (low, medium, high).
      2. Classify the issue (bug, feature, question).
      3. Suggest a Kanban column (${Object.values(KANBAN_COLUMNS).join(', ')}).
      4. Generate at least 3 testable acceptance criteria.
      5. Identify if any information is missing (true/false) and list what's missing.
      6. Choose a representative emoji icon for the task.
      7. Choose a representative hex color code for the task (e.g. #FF5733).
      
      Return JSON format:
      {
        "complexity": "low|medium|high",
        "type": "bug|feature|question",
        "suggestedColumn": "...",
        "acceptanceCriteria": ["...", "...", "..."],
        "icon": "...",
        "color": "#...",
        "missingInformation": {
          "isMissing": false,
          "details": []
        }
      }
    `;

    const analysis = await this.client.generateJson(prompt, undefined, { preferredModel });
    return analysis;
  }

  async generateClarificationDiscussion(issueData, missingDetails = []) {
    if (!missingDetails.length) {
      return {
        summary: 'No blocking information is missing.',
        questions: [],
        requestedInputs: []
      };
    }

    const prompt = `
      You are preparing a follow-up discussion comment for a GitHub issue.

      Issue title: ${issueData.title}
      Issue body: ${(issueData.body || '').slice(0, 2000)}
      Missing details identified by a previous analysis: ${missingDetails.join('; ')}

      Produce a JSON response in French with:
      - summary: one short sentence explaining why additional info is needed.
      - questions: an array of 2 to 5 concrete clarification questions.
      - requestedInputs: an array of concrete elements the user can provide (logs, reproduction steps, screenshots, design constraints, etc.).

      Return JSON format:
      {
        "summary": "...",
        "questions": ["..."],
        "requestedInputs": ["..."]
      }
    `;

    return this.client.generateJson(prompt);
  }
}
