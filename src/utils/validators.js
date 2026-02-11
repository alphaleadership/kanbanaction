import { KANBAN_COLUMNS } from './constants.js';

export function validateTask(task) {
  if (!task) return { valid: false, error: 'Task is null or undefined' };
  if (typeof task.id !== 'number') return { valid: false, error: 'Task ID must be a number' };
  if (!task.titre || typeof task.titre !== 'string') return { valid: false, error: 'Task title is required and must be a string' };
  
  if (task.description && typeof task.description !== 'string') return { valid: false, error: 'Description must be a string' };
  if (task.criteres_acceptation && !Array.isArray(task.criteres_acceptation)) return { valid: false, error: 'Acceptance criteria must be an array' };
  
  return { valid: true };
}

export function validateConfig(config) {
    if (!config) return { valid: false, error: 'Config is null' };
    return { valid: true };
}

export function validateKanbanStructure(data) {
    if (!data) return { valid: false, error: 'Data is null' };
    const columns = Object.values(KANBAN_COLUMNS);
    for (const col of columns) {
        if (!Array.isArray(data[col])) {
            return { valid: false, error: `Missing or invalid column: ${col}` };
        }
    }
    return { valid: true };
}
