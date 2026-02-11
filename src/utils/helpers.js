import fs from 'fs/promises';
import path from 'path';

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}

export async function getProjectStructure(dir = '.', depth = 2, ignore = ['node_modules', '.git', '.kaia']) {
    let result = '';
    
    async function walk(currentDir, currentDepth) {
        if (currentDepth > depth) return;
        
        const files = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const file of files) {
            if (ignore.includes(file.name)) continue;
            
            const fullPath = path.join(currentDir, file.name);
            const indent = '  '.repeat(depth - currentDepth);
            
            if (file.isDirectory()) {
                result += `${indent}📁 ${file.name}/\n`;
                await walk(fullPath, currentDepth + 1);
            } else {
                result += `${indent}📄 ${file.name}\n`;
            }
        }
    }
    
    await walk(dir, 0);
    return result;
}
