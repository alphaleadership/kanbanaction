import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { getConfig, validateAndGetConfig } from '../../src/config/index.js';

describe('Property 5: Configuration Processing', () => {
  test('should correctly parse environment variables', () => {
    fc.assert(
      fc.property(
        fc.record({
            GEMINI_API_KEY: fc.string(),
            GITHUB_TOKEN: fc.string(),
            DEBUG: fc.boolean().map(b => b ? 'true' : 'false'),
            GITHUB_REPOSITORY: fc.option(fc.string()),
            GITHUB_REF: fc.option(fc.string())
        }),
        (env) => {
          const config = getConfig(env);
          
          return (
              config.geminiApiKey === env.GEMINI_API_KEY &&
              config.githubToken === env.GITHUB_TOKEN &&
              config.debug === (env.DEBUG === 'true')
          );
        }
      )
    );
  });

  test('should throw error when required keys are missing', () => {
      fc.assert(
          fc.property(
              fc.record({
                GEMINI_API_KEY: fc.option(fc.string(), { nil: true }),
                GITHUB_TOKEN: fc.option(fc.string(), { nil: true })
              }),
              (env) => {
                  // Only run if at least one is missing
                  if (!env.GEMINI_API_KEY || !env.GITHUB_TOKEN) {
                      try {
                          validateAndGetConfig(env);
                          return false; // Should have thrown
                      } catch (e) {
                          return true;
                      }
                  }
                  return true; // Both present, skip this check
              }
          )
      );
  });
});
