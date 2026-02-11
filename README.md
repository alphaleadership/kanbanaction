# KanbanGemini

Système Kanban intégré avec GitHub et Gemini AI.

## Configuration GitHub Action

Pour activer l'intégration Gemini :

1.  Ajoutez le secret `GEMINI_API_KEY` dans les paramètres de votre dépôt GitHub (Settings > Secrets and variables > Actions).
2.  L'action se déclenchera automatiquement lors de la création d'une issue ou l'ajout d'un label.

## Architecture

Le projet suit l'architecture définie dans `.kiro/specs`.
L'action principale est définie dans `action.yml` et exécutée via le workflow `.github/workflows/gemini-kanban.yml`.
