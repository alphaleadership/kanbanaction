# KanbanGemini

Système Kanban intégré avec GitHub et Gemini AI.

## Configuration GitHub Action

Pour activer l'intégration Gemini :

1.  Ajoutez le secret `GEMINI_API_KEY` dans les paramètres de votre dépôt GitHub (Settings > Secrets and variables > Actions).
2.  L'action se déclenchera automatiquement lors de la création d'une issue ou l'ajout d'un label.

### Réglages recommandés (performance + choix des modèles)

Vous pouvez aussi configurer ces variables/inputs optionnels pour améliorer la latence et la robustesse :

- `GEMINI_MODEL` : modèle principal (défaut : `gemini-2.5-flash`).
- `GEMINI_FALLBACK_MODELS` : modèles de secours séparés par des virgules.
- `GEMINI_RETRIES` : nombre de tentatives en cas d'erreur API.

Exemple :

```txt
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-pro
GEMINI_RETRIES=2
```

## Architecture

Le projet suit l'architecture définie dans `.kiro/specs`.
L'action principale est définie dans `action.yml` et exécutée via le workflow `.github/workflows/gemini-kanban.yml`.
