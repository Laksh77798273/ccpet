# Project Structure

## Directory Layout

```plaintext
status-pet-extension/
├── .vscode/               # VS Code settings (for extension debugging)
├── dist/                  # Compiled extension output directory
├── src/                   # Source code directory
│   ├── core/              # Core business logic
│   │   ├── Pet.ts         # Pet state and energy bar core class/module
│   │   ├── config.ts      # Application configuration constants
│   │   └── __tests__/
│   │       └── Pet.test.ts
│   ├── services/          # Services for external API interaction
│   │   └── ClaudeCodeService.ts
│   ├── ui/                # UI related code
│   │   ├── StatusBar.ts   # Encapsulates all status bar API interactions
│   │   └── __tests__/
│   │       └── StatusBar.test.ts
│   ├── utils/             # Common utility functions
│   │   └── time.ts        # Time processing functions
│   ├── accessibility/     # Accessibility support
│   │   ├── screenReader.ts
│   │   ├── keyboardSupport.ts
│   │   └── contrastSupport.ts
│   ├── performance/       # Performance optimization
│   │   ├── memoryManager.ts
│   │   ├── cacheManager.ts
│   │   └── cpuOptimization.ts
│   ├── security/          # Security controls
│   │   ├── validation.ts
│   │   └── SecureStorage.ts
│   └── extension.ts       # Extension main entry file
├── .gitignore
├── .prettierrc.json       # Prettier configuration file
├── esbuild.config.js      # esbuild configuration file
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration file
└── vitest.config.ts       # Vitest configuration file
```

## Core Architecture Layers

### Business Logic Layer (`src/core/`)

- **Pet.ts**: Central state management for pet energy, expressions, and lifecycle
- **config.ts**: Application-wide configuration constants and thresholds

### Service Layer (`src/services/`)

- **ClaudeCodeService.ts**: Adapter for Claude Code Extension API interactions
- Implements the Adapter pattern to isolate platform-specific code

### UI Layer (`src/ui/`)

- **StatusBar.ts**: Observer that updates UI based on pet state changes
- Implements the Observer pattern for reactive UI updates

### Utility Layers

- **utils/**: Common functionality (time calculations, etc.)
- **accessibility/**: Screen reader support, keyboard navigation
- **performance/**: Memory management, caching, CPU optimization
- **security/**: Input validation, secure storage, encryption

## Data Flow Architecture

```text
Business Logic (Pet.ts) 
    ↓ (Observer Pattern)
UI Layer (StatusBar.ts) 
    ↓ (Adapter Pattern)
Platform Service (ClaudeCodeService.ts) 
    ↓
Claude Code Extension API
```

This separation ensures:

- **Testability**: Each layer can be tested independently
- **Maintainability**: Changes in one layer don't affect others
- **Platform Independence**: Core logic is isolated from Claude Code specifics
