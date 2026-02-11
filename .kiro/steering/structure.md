# Project Structure

## Root Files
- `kanban.js` - Main CLI application entry point
- `package.json` - Node.js project configuration and dependencies
- `package-lock.json` - Dependency lock file
- `.kaia` - JSON data file containing kanban board state

## Folders
- `node_modules/` - NPM dependencies (auto-generated)
- `.kiro/` - Kiro AI assistant configuration and steering rules

## Code Organization

### Main Application (`kanban.js`)
- Single-file CLI application
- Functions organized by purpose:
  - `readDb()` - Database read operations
  - `writeDb()` - Database write operations
  - Command definitions using commander.js

### Data Structure (`.kaia`)
```json
{
  "idees": [],
  "a_faire": [],
  "en_cours": [],
  "en_revision": [],
  "termine": []
}
```

## Conventions
- French language used for column names and user-facing text
- Task objects contain: `id`, `titre`, `description`, `criteres_acceptation`
- Sequential ID assignment (find max ID + 1)
- Error handling with process.exit(1) for critical failures
- Async/await pattern for file operations