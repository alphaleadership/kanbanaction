import { describe, expect, test } from '@jest/globals';
import fs from 'fs';

describe('action metadata', () => {
  test('uses composite runner that installs dependencies before execution', () => {
    const actionYml = fs.readFileSync('action.yml', 'utf8');

    expect(actionYml).toContain("using: 'composite'");
    expect(actionYml).toContain('Setup Node.js');
    expect(actionYml).toContain('Install action dependencies');
    expect(actionYml).toContain('run: npm ci');
    expect(actionYml).toContain('working-directory: ${{ github.action_path }}');
    expect(actionYml).toContain('INPUT_GEMINI_API_KEY');
    expect(actionYml).toContain('INPUT_GITHUB_TOKEN');
  });
});
