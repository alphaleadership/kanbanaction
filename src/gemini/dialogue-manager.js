import path from 'path';
import fs from 'fs/promises';

const DIALOGUE_DIR = '.gemini/issues';

export class DialogueManager {
  constructor() {
    this.baseDir = path.join(process.cwd(), DIALOGUE_DIR);
  }

  getFilePath(issueNumber) {
    return path.join(this.baseDir, `${issueNumber}.json`);
  }

  getRelativePath(issueNumber) {
    return path.join(DIALOGUE_DIR, `${issueNumber}.json`).replace(/\\/g, '/');
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async loadDialogue(issueNumber) {
    const filePath = this.getFilePath(issueNumber);
    try {
      await this.ensureDirectory();
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          issueNumber,
          created: new Date().toISOString(),
          history: []
        };
      }
      throw error;
    }
  }

  async saveDialogue(issueNumber, dialogueData) {
    await this.ensureDirectory();
    const filePath = this.getFilePath(issueNumber);
    dialogueData.updated = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(dialogueData, null, 2));
    return filePath; // Return path for git committing
  }

  addEntry(dialogue, role, content, metadata = {}) {
    dialogue.history.push({
      timestamp: new Date().toISOString(),
      role, // 'user' (action/github), 'assistant' (gemini), 'system'
      content,
      metadata
    });
    return dialogue;
  }
}
