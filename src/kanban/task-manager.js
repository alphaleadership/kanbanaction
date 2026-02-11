import { validateTask } from '../utils/validators.js';
import { KANBAN_COLUMNS } from '../utils/constants.js';

export function getNextId(db) {
  const allTasks = Object.values(db).flat();
  const maxId = allTasks.reduce((max, task) => Math.max(max, (typeof task.id === 'number' ? task.id : 0)), 0);
  return maxId + 1;
}

export function createTask(titre, description = '', criteres = [], metadata = {}) {
  return {
    id: null,
    titre,
    description,
    criteres_acceptation: Array.isArray(criteres) ? criteres : [],
    metadata: metadata || {}
  };
}

export function addTaskToColumn(db, task, column = KANBAN_COLUMNS.IDEES) {
  if (!db[column]) {
      throw new Error(`Invalid column: ${column}`);
  }
  
  if (task.id === null || task.id === undefined) {
      task.id = getNextId(db);
  }

  const validation = validateTask(task);
  if (!validation.valid) {
      throw new Error(`Invalid task: ${validation.error}`);
  }

  db[column].push(task);
  return db;
}

export function findTask(db, taskId) {
    for (const column of Object.keys(db)) {
        const task = db[column].find(t => t.id === taskId);
        if (task) {
            return { task, column };
        }
    }
    return null;
}

export function moveTask(db, taskId, targetColumn) {
    if (!db[targetColumn]) {
        throw new Error(`Invalid target column: ${targetColumn}`);
    }

    const result = findTask(db, taskId);
    if (!result) {
        throw new Error(`Task #${taskId} not found`);
    }

    const { task, column: sourceColumn } = result;

    if (sourceColumn === targetColumn) {
        return db; // Already there
    }

    // Remove from source
    db[sourceColumn] = db[sourceColumn].filter(t => t.id !== taskId);

    // Add to target
    db[targetColumn].push(task);

    return db;
}
