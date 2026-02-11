import * as core from '@actions/core';

export function getConfig(env = process.env) {
  const config = {
    geminiApiKey: core.getInput('gemini-api-key') || env.GEMINI_API_KEY,
    githubToken: core.getInput('github-token') || env.GITHUB_TOKEN,
    debug: core.getInput('debug') === 'true' || env.DEBUG === 'true',
    githubRepo: env.GITHUB_REPOSITORY,
    githubRef: env.GITHUB_REF
  };

  return config;
}

export function validateAndGetConfig(env = process.env) {
    const config = getConfig(env);
    
    const errors = [];
    if (!config.geminiApiKey) errors.push("GEMINI_API_KEY is missing");
    if (!config.githubToken) errors.push("GITHUB_TOKEN is missing");

    if (errors.length > 0) {
        throw new Error(`Configuration Error: ${errors.join(', ')}`);
    }
    return config;
}
