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

## Storage Service Template

Services that handle persistence should follow this filesystem-based pattern:

```typescript
// src/services/PetStorage.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IPetState } from '../core/Pet';

export class PetStorage {
  private stateFilePath: string;

  constructor() {
    // Store pet state in user's home directory under .claude-pet
    const homeDir = os.homedir();
    const petDir = path.join(homeDir, '.claude-pet');
    this.stateFilePath = path.join(petDir, 'pet-state.json');
    
    // Ensure directory exists
    this.ensureDirectoryExists(petDir);
  }

  public loadState(): IPetState | null {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return null;
      }

      const data = fs.readFileSync(this.stateFilePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert lastFeedTime back to Date object
      if (parsed.lastFeedTime) {
        parsed.lastFeedTime = new Date(parsed.lastFeedTime);
      }
      
      return parsed as IPetState;
    } catch (error) {
      console.error('Failed to load pet state:', error);
      return null;
    }
  }

  public saveState(state: IPetState): void {
    try {
      const data = JSON.stringify(state, null, 2);
      fs.writeFileSync(this.stateFilePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save pet state:', error);
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create pet storage directory:', error);
    }
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

// src/services/__tests__/PetStorage.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PetStorage } from '../PetStorage';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('PetStorage Service', () => {
  const mockHomedir = '/mock/home';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue(mockHomedir);
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  it('should save state to filesystem', () => {
    const storage = new PetStorage();
    const mockState = { energy: 75, expression: '(^_^)' };
    
    storage.saveState(mockState);
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockStateFile,
      JSON.stringify(mockState, null, 2),
      'utf8'
    );
  });

  it('should load state from filesystem', () => {
    const mockState = { energy: 50, expression: '(o_o)' };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockState));
    
    const storage = new PetStorage();
    const result = storage.loadState();
    
    expect(result).toEqual(mockState);
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

// Observer (StatusBarFormatter.ts)
constructor() {
  // No external dependencies needed for CLI formatter
}

// Usage in CLI main class
const formatter = new StatusBarFormatter();
pet.subscribe((state) => {
  const display = formatter.formatPetDisplay(state);
  process.stdout.write(display);
});
```

### Adapter Pattern
Used to isolate external dependencies and platform specifics:

```typescript
// PetStorage adapts filesystem operations to our internal interface
export class PetStorage {
  // Adapts Node.js filesystem API to our state management needs
  public loadState(): IPetState | null { /* ... */ }
  public saveState(state: IPetState): void { /* ... */ }
}

// StatusBarFormatter adapts pet state to CLI output format
export class StatusBarFormatter {
  // Adapts internal pet state to CLI display format
  public formatPetDisplay(state: IPetState): string { /* ... */ }
}
```

These patterns ensure loose coupling, testability, and maintainability across the codebase.