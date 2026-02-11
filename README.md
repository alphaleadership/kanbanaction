# 🤖 Gemini Kanban Integration

Transformez vos GitHub Issues en tâches Kanban intelligentes grâce à la puissance de Google Gemini AI.

Cette GitHub Action automatise la gestion de votre tableau de bord Kanban (`.kaia`) en analysant vos issues, en suggérant des critères d'acceptation et en organisant vos tâches.

## 🚀 Fonctionnalités

- **Analyse IA :** Gemini analyse le titre et la description de vos issues pour déterminer leur type (bug, feature, etc.) et leur complexité.
- **Gestion de Bord automatique :** Mise à jour automatique du fichier `.kaia` (votre base de données Kanban).
- **Auto-Installation :** Capacité de l'action à installer ses propres workflows de maintenance.
- **Traitement par Lots :** Un workflow programmé affine les tâches en attente qui n'ont pas encore été traitées par l'IA.
- **Rapport d'Erreurs Centralisé :** Les erreurs d'exécution sont rapportées sur le dépôt principal de l'action pour un débogage facilité.

## 🛠️ Configuration Rapide

### 1. Obtenir une clé API Gemini
Créez une clé API sur le [Google AI Studio](https://aistudio.google.com/).

### 2. Ajouter les Secrets
Dans votre dépôt GitHub, allez dans **Settings > Secrets and variables > Actions** et ajoutez :
- `GEMINI_API_KEY` : Votre clé API Google Gemini.
- `GH_PAT` : (Requis pour l'auto-installation) Un Personal Access Token avec les scopes `repo` et `workflow`.

> [!IMPORTANT]
> Le `GITHUB_TOKEN` par défaut ne peut pas créer ou modifier des fichiers dans `.github/workflows/`. Pour utiliser `install-workflows: 'true'`, vous devez utiliser un **PAT**.

### 3. Installation Automatique
Créez un fichier `.github/workflows/setup-kanban.yml` pour initialiser les workflows nécessaires :

```yaml
name: Setup Gemini Kanban
on:
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Kanban Workflows
        uses: alphaleadership/kanbanaction@main
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GH_PAT }} # Utilisez un PAT ici
          install-workflows: 'true'
```

Exécutez ce workflow manuellement une fois. Il créera deux fichiers :
1. `.github/workflows/gemini-kanban.yml` : S'exécute à chaque nouvelle issue.
2. `.github/workflows/process-pending-tasks.yml` : S'exécute chaque nuit pour traiter les tâches manuelles du Kanban.

## 📖 Utilisation

- **Issues :** Créez une issue ou ajoutez un label. L'IA commentera l'issue avec une analyse complète et ajoutera la tâche au Kanban.
- **Tâches en attente :** Si vous ajoutez manuellement des tâches dans votre fichier `.kaia` sans passer par une issue, le workflow nocturne les enrichira automatiquement avec des critères d'acceptation.

## ⚙️ Paramètres Avancés

| Input | Description | Défaut |
|-------|-------------|---------|
| `gemini-api-key` | Votre clé API Gemini (**requise** sauf si `install-workflows: 'true'`) | N/A |
| `github-token` | Token GitHub pour modifier le repo (**requis**) | N/A |
| `install-workflows` | Si `true`, installe les workflows dans le repo | `false` |
| `gemini-model` | Modèle IA principal à utiliser | `gemini-2.5-flash` |
| `gemini-fallback-models` | Modèles de secours (séparés par des virgules) | N/A |

## 🛡️ Support
Les erreurs critiques rencontrées par l'action sont automatiquement signalées sur [alphaleadership/kanbanaction](https://github.com/alphaleadership/kanbanaction/issues).
