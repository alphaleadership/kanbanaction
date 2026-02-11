export function extractIssueData(issue) {
  if (!issue) return null;

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    labels: issue.labels.map(l => typeof l === 'string' ? l : l.name),
    author: issue.user.login,
    createdAt: issue.created_at
  };
}

export function detectIssueType(issueData) {
    const labels = issueData.labels.map(l => l.toLowerCase());
    if (labels.includes('bug')) return 'bug';
    if (labels.includes('feature') || labels.includes('enhancement')) return 'feature';
    if (labels.includes('question')) return 'question';
    return 'feature'; // Default
}

export function shouldProcessIssue(issueData, config) {
    // If we have a label filter, check it
    if (config.labelFilter && config.labelFilter.length > 0) {
        return issueData.labels.some(l => config.labelFilter.includes(l));
    }
    return true;
}
