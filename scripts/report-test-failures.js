import fs from 'fs';
import { Octokit } from '@octokit/rest';

async function reportFailures() {
  const resultsPath = 'test-results.json';
  if (!fs.existsSync(resultsPath)) {
    console.log('No test results found.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  if (results.numFailedTests === 0) {
    console.log('No failed tests to report.');
    return;
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

  for (const testFile of results.testResults) {
    for (const assertion of testFile.assertionResults) {
      if (assertion.status === 'failed') {
        const title = `Test Failure: ${assertion.fullName}`;
        const body = `
### Test Failure Details
- **File:** ${testFile.name}
- **Test:** ${assertion.fullName}
- **Status:** ${assertion.status}

### Error Message
```
${assertion.failureMessages.join('
')}
```

---
*Reported by automated test workflow*
`;
        console.log(`Creating issue for: ${assertion.fullName}`);
        try {
          await octokit.issues.create({
            owner,
            repo,
            title,
            body,
            labels: ['bug', 'test-failure']
          });
        } catch (error) {
          console.error(`Failed to create issue for ${assertion.fullName}:`, error.message);
        }
      }
    }
  }
}

reportFailures().catch(err => {
  console.error(err);
  process.exit(1);
});
