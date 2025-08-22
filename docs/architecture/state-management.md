# State Management

## "Store" Structure

Our core state logic is centralized in the `src/core/Pet.ts` class. This file serves as our single "state store".

## State Management Pattern & Template

We implement the classic **Observer Pattern**. The `Pet.ts` class acts as the "Subject" (Observable), responsible for maintaining state. The `StatusBar.ts` class acts as the "Observer", subscribing to state changes and updating the UI.

```typescript
// src/core/Pet.ts

export interface IPetState {
  energy: number;           // 0-100
  expression: string;       // Current ASCII expression
  lastFeedTime: Date;       // When the pet was last fed
  totalTokensConsumed: number; // Lifetime token consumption
}

type TStateObserver = (newState: IPetState) => void;

export class Pet {
  private state: IPetState;
  private observers: TStateObserver[] = [];

  public subscribe(observer: TStateObserver): void {
    this.observers.push(observer);
  }

  public unsubscribe(observer: TStateObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  private _notify(): void {
    const stateCopy = this.getState();
    this.observers.forEach(observer => observer(stateCopy));
  }

  // All state-changing public methods call _notify() at the end
  public feed(tokens: number): void {
    // ... energy logic ...
    this._notify();
  }

  public applyTimeDecay(): void {
    // ... decay logic ...
    this._notify();
  }

  public adoptNewPet(): void {
    // Reset to initial state
    this.state = {
      energy: 100,
      expression: '(^_^)',
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };
    this._notify();
  }
}
```

## State Immutability

The state object is kept private and immutable from external access:

```typescript
export class Pet {
  private state: IPetState; // Private - cannot be accessed directly

  // Only way to access state - returns a copy
  public getState(): IPetState {
    return {
      energy: this.state.energy,
      expression: this.state.expression,
      lastFeedTime: new Date(this.state.lastFeedTime.getTime()),
      totalTokensConsumed: this.state.totalTokensConsumed
    };
  }

  // State can only be modified through public methods
  public feed(tokens: number): void {
    // Validation and business logic
    const validatedTokens = InputValidator.validateTokenCount(tokens);
    
    // State mutation (internal only)
    this.state.energy = Math.min(100, this.state.energy + validatedTokens);
    this.state.lastFeedTime = new Date();
    this.state.totalTokensConsumed += validatedTokens;
    
    // Update dependent state
    this._updateExpression();
    
    // Notify observers
    this._notify();
  }
}
```

## Observer Registration

UI components subscribe to state changes:

```typescript
// src/ui/StatusBar.ts
import { Pet, IPetState } from '../core/Pet';
import { IClaudeCodeService } from '../services/ClaudeCodeService';

export class StatusBar {
  private claudeService: IClaudeCodeService;
  private pet: Pet;

  constructor(pet: Pet, claudeService: IClaudeCodeService) {
    this.pet = pet;
    this.claudeService = claudeService;
    
    // Subscribe to pet state changes
    this.pet.subscribe(this.handleStateChange.bind(this));
  }

  private handleStateChange(newState: IPetState): void {
    const displayText = this.formatPetDisplay(newState);
    this.claudeService.updateStatusBar(displayText);
  }

  private formatPetDisplay(state: IPetState): string {
    const energyBar = this.generateEnergyBar(state.energy);
    return `${state.expression} ${energyBar}`;
  }

  private generateEnergyBar(energy: number): string {
    const totalBars = 10;
    const filledBars = Math.floor((energy / 100) * totalBars);
    return '●'.repeat(filledBars) + '○'.repeat(totalBars - filledBars);
  }

  public dispose(): void {
    // Clean up subscription to prevent memory leaks
    this.pet.unsubscribe(this.handleStateChange.bind(this));
  }
}
```

## State Persistence

State is automatically persisted to local storage:

```typescript
export class PetStateManager {
  private pet: Pet;
  private storage: ISecureStorage;

  constructor(pet: Pet, storage: ISecureStorage) {
    this.pet = pet;
    this.storage = storage;
    
    // Subscribe to state changes for automatic persistence
    this.pet.subscribe(this.persistState.bind(this));
  }

  private async persistState(state: IPetState): Promise<void> {
    try {
      await this.storage.saveEncryptedState(state);
    } catch (error) {
      Logger.getInstance().error('state-manager', 'Failed to persist state', { error });
    }
  }

  public async loadState(): Promise<IPetState | null> {
    try {
      return await this.storage.loadEncryptedState();
    } catch (error) {
      Logger.getInstance().error('state-manager', 'Failed to load state', { error });
      return null;
    }
  }
}
```

## State Validation

All state changes are validated:

```typescript
export class Pet {
  private _validateStateTransition(newState: Partial<IPetState>): IPetState {
    const currentState = this.getState();
    
    return {
      energy: this._validateEnergy(newState.energy ?? currentState.energy),
      expression: this._validateExpression(newState.expression ?? currentState.expression),
      lastFeedTime: newState.lastFeedTime ?? currentState.lastFeedTime,
      totalTokensConsumed: this._validateTokens(newState.totalTokensConsumed ?? currentState.totalTokensConsumed)
    };
  }

  private _validateEnergy(energy: number): number {
    return Math.max(0, Math.min(100, Math.floor(energy)));
  }

  private _validateExpression(expression: string): string {
    const validExpressions = ['(^_^)', '(o_o)', '(u_u)', '(x_x)', '(RIP)'];
    return validExpressions.includes(expression) ? expression : '(o_o)';
  }

  private _validateTokens(tokens: number): number {
    return Math.max(0, Math.floor(tokens));
  }
}
```

## Testing State Management

```typescript
// src/core/__tests__/StateManagement.test.ts
describe('State Management', () => {
  describe('Observer Pattern', () => {
    it('should notify all observers when state changes', () => {
      const pet = new Pet(initialState, mockDeps);
      const observer1 = vi.fn();
      const observer2 = vi.fn();
      
      pet.subscribe(observer1);
      pet.subscribe(observer2);
      
      pet.feed(10);
      
      expect(observer1).toHaveBeenCalledWith(expect.objectContaining({ energy: 60 }));
      expect(observer2).toHaveBeenCalledWith(expect.objectContaining({ energy: 60 }));
    });

    it('should allow unsubscribing from state changes', () => {
      const pet = new Pet(initialState, mockDeps);
      const observer = vi.fn();
      
      pet.subscribe(observer);
      pet.unsubscribe(observer);
      pet.feed(10);
      
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe('State Immutability', () => {
    it('should return state copies, not references', () => {
      const pet = new Pet(initialState, mockDeps);
      const state1 = pet.getState();
      const state2 = pet.getState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2);  // Same values
    });

    it('should not allow external state mutation', () => {
      const pet = new Pet(initialState, mockDeps);
      const state = pet.getState();
      
      state.energy = 0; // Try to mutate
      
      const freshState = pet.getState();
      expect(freshState.energy).toBe(50); // Original value unchanged
    });
  });
});
```

This state management approach ensures:

- **Single Source of Truth**: All state lives in Pet.ts
- **Reactive Updates**: UI automatically reflects state changes  
- **Immutability**: External code cannot corrupt internal state
- **Testability**: Observer pattern is easily mockable
- **Performance**: Minimal overhead for state change notifications
