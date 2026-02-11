# Technology Stack

## Runtime & Language
- **Node.js** with ES modules (`"type": "module"`)
- **JavaScript** (modern ES6+ syntax)
- Shebang for CLI execution: `#!/usr/bin/env node`

## Dependencies
- **commander**: CLI framework for command parsing and help generation
- **fs/promises**: Node.js built-in async file system operations
- **path**: Node.js built-in path utilities

## Build System
- No build step required - direct Node.js execution
- Package configured as CLI tool with `bin` entry point

## Common Commands

```bash
# Install dependencies
npm install

# Run the CLI tool locally
node kanban.js <command>

# Or if installed globally
kanban <command>

# View kanban board
kanban voir

# Create new task
kanban creer "Task title"
```

## Data Storage
- JSON file-based persistence (`.kaia` file)
- No external database required
- Data structure: kanban columns with task objects containing id, titre, description, criteres_acceptation