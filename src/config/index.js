import { validateConfig } from '../utils/validators.js';

export function getConfig(env = process.env) {
  const config = {
    geminiApiKey: env.GEMINI_API_KEY,
    githubToken: env.GITHUB_TOKEN,
    debug: env.DEBUG === 'true',
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
