# Frontend Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `~5.x.x` | Main development language | Provides type safety and modern syntax, improving code quality and maintainability. |
| **Runtime** | Node.js | `~20.x.x` | Development and build environment | LTS (Long Term Support) version for running build tools and scripts. |
| **"Framework"** | Claude Code Extension API | `(latest)` | Core for IDE interaction | Foundation of the project, all features (like status bar updates) are based on this API. |
| **State Management** | Native TypeScript classes/objects | `N/A` | Manage application local state | Zero performance overhead, fully satisfies MVP's simple state management needs, no external libraries needed. |
| **Build Tool** | esbuild | `~0.2x.x` | Bundle and compile TypeScript | Ultra-fast build performance, zero-config out-of-the-box, perfect for small extension projects. |
| **Testing Framework** | Vitest | `~1.x.x` | Unit and integration testing | Modern, fast test runner with good esbuild compatibility and clean API. |
| **Code Formatter** | Prettier | `~3.x.x` | Ensure consistent code style | Automated code formatting, improves code readability and team collaboration efficiency. |

## Dependency Management

All dependencies must use exact version numbers to avoid incompatibility risks from automatic updates:

```json
{
  "name": "status-pet-extension",
  "version": "1.0.0",
  "dependencies": {
    "claude-code-api": "1.2.3",
    "@types/node": "20.10.5"
  },
  "devDependencies": {
    "@types/vscode": "1.85.0",
    "esbuild": "0.20.2",
    "vitest": "1.2.1",
    "prettier": "3.1.1",
    "typescript": "5.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```
