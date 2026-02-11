export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
