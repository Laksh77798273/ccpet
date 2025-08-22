# CLI Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `~5.x.x` | Main development language | Provides type safety and modern syntax, improving code quality and maintainability. |
| **Runtime** | Node.js | `~20.x.x` | CLI execution environment | LTS (Long Term Support) version for running CLI script and build tools. |
| **"Framework"** | Claude Code CLI Status Line API | `(latest)` | Core for status line integration | Foundation of the project, CLI script outputs status for Claude Code status line display. |
| **State Management** | Native TypeScript classes/objects | `N/A` | Manage application local state | Zero performance overhead, fully satisfies MVP's simple state management needs, no external libraries needed. |
| **Persistence** | Node.js built-in modules (fs/os/path) | `N/A` | Filesystem state storage | Built-in modules for saving pet state to `~/.claude-pet/pet-state.json`. |
| **Build Tool** | esbuild | `~0.2x.x` | Bundle and compile TypeScript | Ultra-fast build performance, zero-config out-of-the-box, perfect for small CLI projects. |
| **Testing Framework** | Vitest | `~3.x.x` | Unit and integration testing | Modern, fast test runner with good esbuild compatibility and clean API. |
| **Code Formatter** | Prettier | `~3.x.x` | Ensure consistent code style | Automated code formatting, improves code readability and team collaboration efficiency. |

## Dependency Management

All dependencies must use exact version numbers to avoid incompatibility risks from automatic updates:

```json
{
  "name": "claude-code-status-pet",
  "version": "1.0.0",
  "description": "A Claude Code status line script that displays a virtual pet",
  "main": "dist/extension.js",
  "bin": {
    "claude-pet": "dist/extension.js"
  },
  "devDependencies": {
    "@types/node": "20.10.5",
    "@vitest/coverage-v8": "^3.2.4",
    "esbuild": "0.20.2",
    "prettier": "3.1.1",
    "typescript": "5.3.3",
    "vitest": "^3.2.4"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  },
  "keywords": ["claude-code", "status-line", "pet", "cli"]
}
```

## CLI-Specific Dependencies

### Runtime Dependencies
- **None**: The CLI script uses only Node.js built-in modules for maximum portability and minimal installation requirements.

### Development Dependencies
- **@types/node**: TypeScript type definitions for Node.js built-in modules
- **esbuild**: Fast bundler that compiles TypeScript to a single executable JS file
- **vitest**: Testing framework with built-in TypeScript support
- **@vitest/coverage-v8**: Code coverage reporting for tests
- **prettier**: Code formatting for consistent style
- **typescript**: TypeScript compiler for type checking

## Build Configuration

### esbuild Configuration
```javascript
// esbuild.config.js
const buildOptions = {
  entryPoints: ['src/ccpet.ts'],
  bundle: true,
  outfile: 'dist/ccpet.js',
  external: [], // No external dependencies
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node' // Makes output executable
  }
};
```
