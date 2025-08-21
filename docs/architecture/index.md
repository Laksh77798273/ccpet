# Status Pet Frontend Architecture

## Version: 1.0

This is the main architecture documentation for the Status Pet extension for Claude Code IDE.

## Core Architecture Documents

### Essential Files (Always Loaded)

- [Coding Standards](./coding-standards.md) - Development guidelines and code conventions
- [Tech Stack](./tech-stack.md) - Technology selections and versions
- [Source Tree](./source-tree.md) - Project structure and file organization

### Architecture Components

- [Component Standards](./component-standards.md) - Component design patterns and templates
- [State Management](./state-management.md) - Observer pattern implementation
- [API Integration](./api-integration.md) - Claude Code Extension API interface
- [Testing Strategy](./testing-strategy.md) - Unit, integration, and E2E testing approach

### Quality & Operations

- [Error Handling](./error-handling.md) - Resilience and recovery strategies
- [Security](./security.md) - Data protection and security controls
- [Performance](./performance.md) - Memory optimization and scaling considerations
- [Accessibility](./accessibility.md) - Screen reader and keyboard support

### Development & Deployment

- [Environment Configuration](./environment-configuration.md) - Development and production settings
- [Dependency Management](./dependency-management.md) - Version control and security scanning
- [CI/CD Pipeline](./ci-cd.md) - Automated testing and deployment

## Architecture Overview

This is a **Greenfield Claude Code IDE extension** built with:

- **Language**: TypeScript (~5.x.x) for type safety
- **Runtime**: Node.js (~20.x.x) LTS
- **Framework**: Claude Code Extension API (latest)
- **Build Tool**: esbuild (~0.2x.x) for fast compilation
- **Testing**: Vitest (~1.x.x) for modern testing

## Key Design Principles

1. **Separation of Concerns**: Core logic isolated from IDE-specific code
2. **Observer Pattern**: Reactive UI updates based on state changes
3. **Zero External Dependencies**: Lightweight, self-contained extension
4. **Privacy First**: All data processing happens locally
5. **Performance Focused**: Minimal memory and CPU usage

## Data Flow

```text
Pet State (Core Logic) → Status Bar (UI) → Claude Code API (Platform)
```

The architecture ensures the pet responds to coding activity (token consumption) while maintaining a clean separation between business logic and platform integration.
