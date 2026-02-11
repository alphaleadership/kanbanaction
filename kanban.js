#!/usr/bin/env node

import { Command } from 'commander';
import { readDb, writeDb } from './src/kanban/file-operations.js';
import { createTask, addTaskToColumn, moveTask, findTask } from './src/kanban/task-manager.js';
import { KANBAN_COLUMNS } from './src/utils/constants.js';

const program = new Command();

program
  .name('kanban')
  .description("Un outil CLI pour gérer un tableau Kanban pour une IA de code.")
  .version('1.0.0');

// Commande pour voir le tableau
program
  .command('voir')
  .description('Affiche le tableau Kanban complet.')
  .action(async () => {
    try {
      const db = await readDb();
      
      console.log('--- KANBAN ---');
      for (const [colonne, taches] of Object.entries(db)) {
          console.log(`\n[ ${colonne.toUpperCase()} ]`);
          if (taches.length === 0) {
              console.log('  (vide)');
          } else {
              taches.forEach(tache => {
                  console.log(`  - #${tache.id}: ${tache.titre}`);
              });
          }
      }
      console.log('\n--------------');
    } catch (error) {
      console.error("Erreur :", error.message);
      process.exit(1);
    }
  });

// Commande pour créer une tâche
program
  .command('creer <titre>')
  .description("Crée une nouvelle tâche dans la colonne 'idées'.")
  .action(async (titre) => {
    try {
      const db = await readDb();
      const task = createTask(titre);
      addTaskToColumn(db, task, KANBAN_COLUMNS.IDEES);
      await writeDb(db);
      console.log(`Tâche #${task.id} "${titre}" créée dans la colonne 'idées'.`);
    } catch (error) {
      console.error("Erreur :", error.message);
      process.exit(1);
    }
  });

// Commande pour bouger une tâche
program
  .command('bouger <id> <colonne>')
  .description('Déplace une tâche vers une nouvelle colonne.')
  .action(async (id, colonne) => {
    try {
      const db = await readDb();
      const taskId = parseInt(id);
      
      if (isNaN(taskId)) {
          throw new Error("L'ID de la tâche doit être un nombre.");
      }

      // Valider la colonne cible
      const targetCol = colonne.toLowerCase();
      if (!Object.values(KANBAN_COLUMNS).includes(targetCol)) {
          throw new Error(`Colonne invalide : ${colonne}. Colonnes disponibles : ${Object.values(KANBAN_COLUMNS).join(', ')}`);
      }

      moveTask(db, taskId, targetCol);
      await writeDb(db);
      console.log(`Tâche #${taskId} déplacée vers '${targetCol}'.`);
    } catch (error) {
      console.error("Erreur :", error.message);
      process.exit(1);
    }
  });

// Commande pour finir une tâche
program
  .command('finir <id>')
  .description("Marque une tâche comme terminée.")
  .action(async (id) => {
    try {
      const db = await readDb();
      const taskId = parseInt(id);
      
      if (isNaN(taskId)) {
          throw new Error("L'ID de la tâche doit être un nombre.");
      }

      moveTask(db, taskId, KANBAN_COLUMNS.TERMINE);
      await writeDb(db);
      console.log(`Tâche #${taskId} marquée comme terminée.`);
    } catch (error) {
      console.error("Erreur :", error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);