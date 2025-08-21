# Coding Standards

## Critical Coding Rules

1. **Strict Separation of Concerns**: `Pet.ts` (core logic) **MUST NEVER** directly call any Claude Code API. All IDE interactions **MUST** go through `ClaudeCodeService.ts` (platform service).

2. **State Immutability**: Core state must be private, external access only through `getState()` method returning **copies**.

3. **Configuration Centralization**: All magic numbers **MUST** be defined in `src/core/config.ts`.

4. **Follow Code Standards**: All new code must strictly follow the templates and naming conventions defined in the Component Standards section.

5. **Test Coverage**: All new or modified business logic in `src/core/` directory must have corresponding unit tests.

## Component Template

All core logic components should follow this class-based template:

```typescript
// src/core/Pet.ts

// 1. Define state interfaces
export interface IPetState {
  energy: number; // 0-100
  expression: string;
  // ... other state properties
}

// 2. Define injectable dependencies (e.g., config)
interface IPetDependencies {
  config: { /* ... */ };
}

// 3. Implement component class
export class Pet {
  private state: IPetState;
  private deps: IPetDependencies;

  constructor(initialState: IPetState, dependencies: IPetDependencies) {
    this.state = initialState;
    this.deps = dependencies;
  }

  // 4. Public methods
  public feed(tokens: number): void { /* ... */ }
  public applyTimeDecay(): void { /* ... */ }
  public getState(): IPetState { return { ...this.state }; }

  // 5. Private methods
  private _updateExpression(): void { /* ... */ }
}
```

## Naming Conventions

- **Files**: Files exporting a class use PascalCase, e.g., `Pet.ts`
- **Classes**: Use PascalCase, e.g., `Pet`, `StatusBar`
- **Interfaces**: Use PascalCase with `I` prefix, e.g., `IPetState`
- **Type Aliases**: Use PascalCase with `T` prefix, e.g., `type TPetExpression = string;`
- **Public methods/properties**: Use camelCase, e.g., `getState`
- **Private methods/properties**: Use camelCase with `_` prefix, e.g., `_updateExpression`

## Error Handling Standards

All components must implement comprehensive error handling:

```typescript
export class ComponentWithErrorHandling {
  public performOperation(): void {
    try {
      // Operation logic
    } catch (error) {
      Logger.getInstance().error('component-name', 'Operation failed', { error });
      // Attempt recovery or graceful degradation
    }
  }
}
```

## Testing Standards

- **Unit Tests**: Must cover all core logic in `src/core/` with >80% coverage
- **Integration Tests**: Must mock Claude Code API interactions
- **Test Structure**: Follow "Arrange-Act-Assert" pattern

```typescript
// src/core/__tests__/Pet.test.ts
import { describe, it, expect } from 'vitest';
import { Pet, IPetState } from '../Pet';

describe('Pet Core Logic', () => {
  it('should increase energy when fed', () => {
    // Arrange
    const initialState: IPetState = { energy: 50, expression: '(o_o)' };
    const pet = new Pet(initialState, { /* ... mock config ... */ });
    
    // Act
    pet.feed(1);
    const newState = pet.getState();
    
    // Assert
    expect(newState.energy).toBe(60);
  });
});
```

## Performance Standards

- Use debouncing for UI updates to avoid excessive rendering
- Implement memory cleanup for long-running processes
- Cache expensive computations where appropriate

```typescript
// Example: Debounced state updates
private _debouncedStateUpdate = CPUOptimization.debounce(
  this._notifyObservers.bind(this),
  100 // 100ms debounce
);
```

## Security Standards

- All external input must be validated using `InputValidator`
- Sensitive data must be encrypted before storage
- Never log sensitive information

```typescript
// Example: Input validation
public feed(tokens: number): void {
  const validatedTokens = InputValidator.validateTokenCount(tokens);
  // ... rest of logic
}
```

## Quick Reference

- **Run tests**: `npm test`
- **Build extension**: `npm run build`
- **Core pattern**: Business Logic Layer (`Pet.ts`) updates state → Observer pattern notifies UI Layer (`StatusBar.ts`) → UI Layer calls Platform Service (`ClaudeCodeService.ts`) → Platform Service updates status bar
