# Component Standards

## Component Template

All core logic components should follow this class-based template. This example shows the skeleton for our `Pet.ts` core logic component, including state definition, dependency injection, and public/private method separation:

```typescript
// src/core/Pet.ts

// 1. Define state interfaces
export interface IPetState {
  energy: number; // 0-100
  expression: string;
  lastFeedTime: Date;
  totalTokensConsumed: number;
}

// 2. Define injectable dependencies (e.g., config)
interface IPetDependencies {
  config: {
    ENERGY_DECAY_RATE: number;
    FEED_VALUE_PER_TOKEN: number;
    STATE_THRESHOLDS: {
      HUNGRY: number;
      SICK: number;
      HAPPY: number;
    };
  };
  logger: {
    info: (component: string, message: string, context?: any) => void;
    warn: (component: string, message: string, context?: any) => void;
    error: (component: string, message: string, context?: any) => void;
  };
}

// 3. Implement component class
export class Pet {
  private state: IPetState;
  private deps: IPetDependencies;
  private observers: Array<(state: IPetState) => void> = [];

  constructor(initialState: IPetState, dependencies: IPetDependencies) {
    this.state = initialState;
    this.deps = dependencies;
  }

  // 4. Public methods
  public feed(tokens: number): void { 
    const validatedTokens = this._validateTokens(tokens);
    this.state.energy = Math.min(100, this.state.energy + validatedTokens);
    this.state.lastFeedTime = new Date();
    this.state.totalTokensConsumed += validatedTokens;
    this._updateExpression();
    this._notify();
  }
  
  public applyTimeDecay(): void { 
    const currentTime = Date.now();
    const timeSinceLastFeed = currentTime - this.state.lastFeedTime.getTime();
    const hoursElapsed = timeSinceLastFeed / (1000 * 60 * 60);
    
    if (hoursElapsed >= 1) {
      this.state.energy = Math.max(0, this.state.energy - this.deps.config.ENERGY_DECAY_RATE);
      this._updateExpression();
      this._notify();
    }
  }
  
  public getState(): IPetState { 
    return { ...this.state }; 
  }

  public subscribe(observer: (state: IPetState) => void): void {
    this.observers.push(observer);
  }

  // 5. Private methods
  private _updateExpression(): void {
    if (this.state.energy >= this.deps.config.STATE_THRESHOLDS.HAPPY) {
      this.state.expression = '(^_^)';
    } else if (this.state.energy >= this.deps.config.STATE_THRESHOLDS.HUNGRY) {
      this.state.expression = '(o_o)';
    } else if (this.state.energy >= this.deps.config.STATE_THRESHOLDS.SICK) {
      this.state.expression = '(u_u)';
    } else {
      this.state.expression = '(x_x)';
    }
  }

  private _validateTokens(tokens: number): number {
    if (typeof tokens !== 'number' || tokens < 0) {
      throw new Error('Invalid token count: must be non-negative number');
    }
    return Math.floor(tokens);
  }

  private _notify(): void {
    const stateCopy = this.getState();
    this.observers.forEach(observer => observer(stateCopy));
  }
}
```

## Service Template

Services that interact with external APIs should follow this adapter pattern:

```typescript
// src/services/ClaudeCodeService.ts
import * as claude from 'claude-code-api';

export interface IClaudeCodeService {
  updateStatusBar(text: string): void;
  registerCommand(commandId: string, callback: () => void): void;
  onDidCountTokens(callback: (tokens: number) => void): () => void;
  getState(): Promise<string | undefined>;
  saveState(state: string): Promise<void>;
}

export class ClaudeCodeService implements IClaudeCodeService {
  private statusBarItem: claude.StatusBarItem;
  
  constructor() {
    this.statusBarItem = claude.window.createStatusBarItem(
      claude.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.show();
  }

  public updateStatusBar(text: string): void {
    this.statusBarItem.text = text;
  }

  public registerCommand(commandId: string, callback: () => void): void {
    claude.commands.registerCommand(commandId, callback);
  }

  public onDidCountTokens(callback: (tokens: number) => void): () => void {
    // Implementation for token counting events
    return claude.workspace.onDidChangeTextDocument((event) => {
      // Calculate tokens from document changes
      const tokens = this._calculateTokens(event);
      callback(tokens);
    });
  }

  public async getState(): Promise<string | undefined> {
    return claude.workspace.getConfiguration('statusPet').get('state');
  }

  public async saveState(state: string): Promise<void> {
    await claude.workspace.getConfiguration('statusPet').update('state', state);
  }

  private _calculateTokens(event: any): number {
    // Token calculation logic
    return event.contentChanges.reduce((total: number, change: any) => {
      return total + Math.ceil(change.text.length / 4); // Rough token estimate
    }, 0);
  }
}
```

## Component Testing Template

All components must have comprehensive tests:

```typescript
// src/core/__tests__/Pet.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pet, IPetState } from '../Pet';

describe('Pet Core Logic', () => {
  let initialState: IPetState;
  let mockDependencies: any;

  beforeEach(() => {
    initialState = {
      energy: 50,
      expression: '(o_o)',
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };

    mockDependencies = {
      config: {
        ENERGY_DECAY_RATE: 5,
        FEED_VALUE_PER_TOKEN: 1,
        STATE_THRESHOLDS: { HUNGRY: 40, SICK: 10, HAPPY: 80 }
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    };
  });

  describe('Energy Management', () => {
    it('should increase energy when fed valid tokens', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      
      // Act
      pet.feed(10);
      const newState = pet.getState();
      
      // Assert
      expect(newState.energy).toBe(60);
      expect(newState.totalTokensConsumed).toBe(10);
      expect(newState.lastFeedTime).toBeInstanceOf(Date);
    });

    it('should cap energy at 100', () => {
      // Arrange
      const highEnergyState = { ...initialState, energy: 95 };
      const pet = new Pet(highEnergyState, mockDependencies);
      
      // Act
      pet.feed(20);
      const newState = pet.getState();
      
      // Assert
      expect(newState.energy).toBe(100);
    });

    it('should handle negative token values gracefully', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      
      // Act & Assert
      expect(() => pet.feed(-5)).toThrow('Invalid token count');
    });
  });

  describe('Observer Pattern', () => {
    it('should notify observers when state changes', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      const mockObserver = vi.fn();
      pet.subscribe(mockObserver);
      
      // Act
      pet.feed(10);
      
      // Assert
      expect(mockObserver).toHaveBeenCalledTimes(1);
      expect(mockObserver).toHaveBeenCalledWith(
        expect.objectContaining({ energy: 60 })
      );
    });
  });
});
```

## Design Patterns

### Observer Pattern
Used for state change notifications between Pet (Subject) and StatusBar (Observer):

```typescript
// Subject (Pet.ts)
public subscribe(observer: (state: IPetState) => void): void {
  this.observers.push(observer);
}

private _notify(): void {
  this.observers.forEach(observer => observer(this.getState()));
}

// Observer (StatusBar.ts)
constructor(claudeService: IClaudeCodeService) {
  this.claudeService = claudeService;
  pet.subscribe((state) => this.updateDisplay(state));
}
```

### Adapter Pattern
Used to isolate Claude Code API specifics:

```typescript
// Adapter shields core logic from platform changes
export class ClaudeCodeService implements IClaudeCodeService {
  // Adapts Claude Code API to our internal interface
}
```

These patterns ensure loose coupling, testability, and maintainability across the codebase.