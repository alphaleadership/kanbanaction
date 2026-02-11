import { test, expect, describe } from '@jest/globals';
import fc from 'fast-check';
import { parseTodoMd, mapTodoToKanban, deduplicateTasks } from '../../src/todo/parser.js';

describe('Todo Parser Properties', () => {
  test('Property 13: Todo.md Parsing Completeness', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1 }).map(s => s.replace(/\n/g, ' ')),
            completed: fc.boolean(),
            description: fc.string().map(s => s.replace(/\n/g, ' '))
          })
        ),
        (tasks) => {
          const markdown = tasks.map(t => 
            `- [${t.completed ? 'x' : ' '}] ${t.title}${t.description ? '\n  ' + t.description : ''}`
          ).join('\n');
          
          const parsed = parseTodoMd(markdown);
          
          return parsed.length === tasks.length && 
                 parsed.every((p, i) => {
                    const expectedTitle = tasks[i].title.trim();
                    return p.title === expectedTitle && 
                           p.completed === tasks[i].completed;
                 });
        }
      )
    );
  });

  test('Property 15: Todo Description Preservation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), fc.string({ minLength: 1 }),
        (title, description) => {
          const markdown = `- [ ] ${title}\n  ${description}`;
          const parsed = parseTodoMd(markdown);
          return parsed.length === 1 && parsed[0].description.includes(description.trim());
        }
      )
    );
  });

  test('Property 14: Todo Status Mapping', () => {
    fc.assert(
        fc.property(
            fc.array(fc.record({
                title: fc.string(),
                completed: fc.boolean(),
                description: fc.string()
            })),
            (todoTasks) => {
                const mapped = mapTodoToKanban(todoTasks);
                return mapped.every((m, i) => {
                    const expectedStatus = todoTasks[i].completed ? 'termine' : 'a_faire';
                    return m.status === expectedStatus;
                });
            }
        )
    );
  });

  test('Property 16: Task Deduplication', () => {
      fc.assert(
          fc.property(
              fc.array(fc.record({ titre: fc.string() })),
              fc.array(fc.record({ titre: fc.string() })),
              (existing, newTasks) => {
                  const deduplicated = deduplicateTasks(existing, newTasks);
                  const existingTitles = new Set(existing.map(t => t.titre.toLowerCase()));
                  
                  return deduplicated.every(t => !existingTitles.has(t.titre.toLowerCase()));
              }
          )
      );
  });
});
