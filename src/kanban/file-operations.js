import fs from 'fs/promises';
import path from 'path';
import { DB_FILE_NAME } from '../utils/constants.js';
import { validateKanbanStructure } from '../utils/validators.js';

const DB_PATH = path.join(process.cwd(), DB_FILE_NAME);
const LOCK_FILE = `${DB_PATH}.lock`;

async function acquireLock(retries = 10, interval = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            await fs.writeFile(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
            return true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    throw new Error('Could not acquire lock on Kanban database');
}

async function releaseLock() {
    try {
        await fs.unlink(LOCK_FILE);
    } catch (e) {}
}

export async function readDb(filePath = DB_PATH) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    const validation = validateKanbanStructure(data);
    if (!validation.valid) {
        throw new Error(`Invalid Kanban structure: ${validation.error}`);
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
        return { idees: [], a_faire: [], en_cours: [], en_revision: [], termine: [] };
    }
    throw error;
  }
}

export async function writeDb(data, filePath = DB_PATH) {
    const validation = validateKanbanStructure(data);
    if (!validation.valid) {
        throw new Error(`Cannot write invalid data: ${validation.error}`);
    }

    await acquireLock();
    
    try {
        const tempPath = `${filePath}.tmp`;
        const backupPath = `${filePath}.bak`;
        
        try {
            await fs.copyFile(filePath, backupPath);
        } catch (e) {
            if (e.code !== 'ENOENT') {
                // Non-critical
            }
        }

        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempPath, filePath);
    } finally {
        await releaseLock();
    }
}
