export function parseTodoMd(content) {
  const lines = content.split('\n');
  const tasks = [];
  let currentTask = null;

  for (const line of lines) {
    const checkboxMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)/);
    
    if (checkboxMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      currentTask = {
        title: checkboxMatch[2].trim(),
        completed: checkboxMatch[1].toLowerCase() === 'x',
        description: ''
      };
    } else if (currentTask && line.trim() !== '') {
      // It's a description or sub-item for the current task
      currentTask.description += (currentTask.description ? '\n' : '') + line.trim();
    }
  }

  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}

export function mapTodoToKanban(todoTasks) {
    return todoTasks.map(task => ({
        titre: task.title,
        description: task.description,
        status: task.completed ? 'termine' : 'a_faire'
    }));
}

export function deduplicateTasks(existingTasks, newTasks) {
    const existingTitles = new Set(existingTasks.map(t => t.titre.toLowerCase()));
    return newTasks.filter(t => !existingTitles.has(t.titre.toLowerCase()));
}