# Testing Strategy

## Test Pyramid Architecture

We follow the standard test pyramid, focusing on fast feedback and high coverage:

```text
       /\
      /  \     E2E Tests (Few)
     /____\    Integration Tests (Some) 
    /      \   Unit Tests (Many)
   /________\  
```

## Testing Framework Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 10000
  }
});
```

## Unit Testing Standards

### Core Logic Testing

All business logic in `src/core/` must have comprehensive unit tests:

```typescript
// src/core/__tests__/Pet.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pet, IPetState } from '../Pet';
import { InputValidator } from '../../utils/validation';

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

    it('should handle invalid input gracefully', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      
      // Act & Assert
      expect(() => pet.feed(-5)).toThrow('Invalid token count');
      expect(() => pet.feed(NaN)).toThrow('Invalid token count');
      expect(() => pet.feed(undefined as any)).toThrow('Invalid token count');
    });

    it('should apply time decay correctly', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      
      // Act
      pet.applyTimeDecay();
      const newState = pet.getState();
      
      // Assert
      expect(newState.energy).toBe(45); // 50 - 5
    });
  });

  describe('State Transitions', () => {
    it('should update expression based on energy level', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      
      // Test happy state
      pet.feed(35); // Energy becomes 85
      expect(pet.getState().expression).toBe('(^_^)');
      
      // Test hungry state  
      const hungryPet = new Pet({ ...initialState, energy: 35 }, mockDependencies);
      expect(hungryPet.getState().expression).toBe('(u_u)');
      
      // Test sick state
      const sickPet = new Pet({ ...initialState, energy: 5 }, mockDependencies);
      expect(sickPet.getState().expression).toBe('(x_x)');
    });

    it('should maintain state immutability', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      const stateBefore = pet.getState();
      
      // Act
      pet.feed(10);
      const stateAfter = pet.getState();
      
      // Assert
      expect(stateBefore).not.toBe(stateAfter); // Different objects
      expect(stateBefore.energy).toBe(50); // Original unchanged
      expect(stateAfter.energy).toBe(60); // New state updated
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

    it('should handle multiple observers', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      const observer1 = vi.fn();
      const observer2 = vi.fn();
      pet.subscribe(observer1);
      pet.subscribe(observer2);
      
      // Act
      pet.feed(10);
      
      // Assert
      expect(observer1).toHaveBeenCalledTimes(1);
      expect(observer2).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      const observer = vi.fn();
      pet.subscribe(observer);
      pet.unsubscribe(observer);
      
      // Act
      pet.feed(10);
      
      // Assert
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Arrange
      const pet = new Pet(initialState, mockDependencies);
      vi.spyOn(InputValidator, 'validateTokenCount').mockImplementation(() => {
        throw new Error('Invalid input');
      });
      
      // Act & Assert
      expect(() => pet.feed(10)).toThrow('Invalid input');
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });
  });
});
```

## Integration Testing

Test the interaction between components with mocked external dependencies:

```typescript
// src/__tests__/integration/PetIntegration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pet } from '../../core/Pet';
import { ClaudeCodeService } from '../../services/ClaudeCodeService';
import { StatusBar } from '../../ui/StatusBar';
import { SecureStorage } from '../../services/SecureStorage';

describe('Pet Integration Tests', () => {
  let pet: Pet;
  let claudeService: ClaudeCodeService;
  let statusBar: StatusBar;
  let storage: SecureStorage;

  beforeEach(async () => {
    // Create mocked Claude Code API
    const mockClaudeAPI = {
      statusBarItem: {
        text: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn()
      },
      commands: {
        registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() })
      },
      workspace: {
        getState: vi.fn().mockResolvedValue(null),
        setState: vi.fn().mockResolvedValue(undefined)
      }
    };

    // Initialize service layer
    claudeService = new ClaudeCodeService(mockClaudeAPI);
    storage = new SecureStorage();
    statusBar = new StatusBar(claudeService);
    
    // Initialize pet instance
    const initialState = {
      energy: 50,
      expression: '(o_o)',
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };
    
    pet = new Pet(initialState, {
      config: require('../../core/config').config,
      logger: require('../../utils/logger').Logger.getInstance()
    });

    // Connect observer
    pet.subscribe((state) => {
      statusBar.updatePetDisplay(state);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Pet Lifecycle', () => {
    it('should complete full feeding cycle', async () => {
      // Arrange
      const tokensToFeed = 15;
      
      // Act
      pet.feed(tokensToFeed);
      
      // Assert
      const state = pet.getState();
      expect(state.energy).toBe(65);
      expect(state.totalTokensConsumed).toBe(15);
      
      // Verify UI was updated
      expect(claudeService.updateStatusBar).toHaveBeenCalled();
    });

    it('should persist and restore state correctly', async () => {
      // Arrange
      pet.feed(20);
      const stateBeforeSave = pet.getState();
      
      // Act - Save state
      await storage.saveEncryptedState(stateBeforeSave);
      
      // Act - Restore state
      const restoredState = await storage.loadEncryptedState();
      
      // Assert
      expect(restoredState).toEqual(stateBeforeSave);
    });

    it('should handle API failures gracefully', async () => {
      // Arrange
      vi.spyOn(claudeService, 'updateStatusBar').mockRejectedValue(new Error('API Unavailable'));
      
      // Act
      pet.feed(10);
      
      // Assert - Pet state should still update despite API failure
      expect(pet.getState().energy).toBe(60);
    });
  });

  describe('Timer-based Decay Integration', () => {
    it('should apply decay at scheduled intervals', async () => {
      // Arrange
      const initialEnergy = pet.getState().energy;
      
      // Act - Simulate time passage
      vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      pet.applyTimeDecay();
      
      // Assert
      expect(pet.getState().energy).toBeLessThan(initialEnergy);
    });
  });
});
```

## E2E Testing Strategy

Test the complete user workflow in a simulated Claude Code environment:

```typescript
// src/__tests__/e2e/StatusPetE2E.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Status Pet E2E Tests', () => {
  let extensionContext: any;

  beforeAll(async () => {
    // Initialize complete extension environment
    extensionContext = await initializeExtensionForTesting();
  });

  afterAll(async () => {
    await extensionContext.dispose();
  });

  it('should display pet in status bar after installation', async () => {
    // Verify extension activates and shows pet in status bar
    const statusBarText = await getStatusBarText();
    expect(statusBarText).toContain('(^_^)'); // Happy expression
    expect(statusBarText).toContain('●'); // Energy bar
  });

  it('should update pet when user codes', async () => {
    // Simulate user coding activity
    await simulateTokenConsumption(20);
    
    // Wait for UI update
    await waitForStatusBarUpdate();
    
    // Verify pet state changed
    const statusBarText = await getStatusBarText();
    expect(statusBarText).toContain('(^_^)'); // Still happy
    // Energy bar should be fuller
  });

  it('should show decay over time', async () => {
    // Fast-forward time without activity
    await simulateTimePassage(2 * 60 * 60 * 1000); // 2 hours
    
    // Verify pet became hungry
    const statusBarText = await getStatusBarText();
    expect(statusBarText).toContain('(u_u)'); // Hungry expression
  });

  it('should allow pet revival through command', async () => {
    // Let pet die
    await forceEnergyToZero();
    
    // Execute revival command
    await executeCommand('statusPet.adoptNew');
    
    // Verify pet revived
    const statusBarText = await getStatusBarText();
    expect(statusBarText).toContain('(^_^)'); // Happy again
  });
});

// E2E test helper functions
async function initializeExtensionForTesting(): Promise<any> {
  // Implementation for extension initialization
}

async function getStatusBarText(): Promise<string> {
  // Get status bar text from extension
}

async function simulateTokenConsumption(tokens: number): Promise<void> {
  // Simulate token consumption events
}

async function waitForStatusBarUpdate(): Promise<void> {
  // Wait for asynchronous status bar updates
}

async function simulateTimePassage(ms: number): Promise<void> {
  // Fast-forward time for decay testing
}

async function forceEnergyToZero(): Promise<void> {
  // Force pet into death state for revival testing
}

async function executeCommand(commandId: string): Promise<void> {
  // Execute Claude Code command
}
```

## Test Setup and Mocking

Global test configuration:

```typescript
// src/__tests__/setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Mock Claude Code API
  vi.mock('claude-code-api', () => ({
    window: {
      createStatusBarItem: vi.fn().mockReturnValue({
        text: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn()
      }),
      showInformationMessage: vi.fn()
    },
    commands: {
      registerCommand: vi.fn().mockReturnValue({
        dispose: vi.fn()
      })
    },
    workspace: {
      onDidChangeTextDocument: vi.fn().mockReturnValue({
        dispose: vi.fn()
      }),
      getConfiguration: vi.fn().mockReturnValue({
        get: vi.fn(),
        update: vi.fn()
      })
    },
    StatusBarAlignment: {
      Left: 1,
      Right: 2
    }
  }));

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Mock timers for consistent testing
  vi.useFakeTimers();
});

afterAll(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// Test utilities
export const TestUtils = {
  createMockPetState: (overrides = {}) => ({
    energy: 50,
    expression: '(o_o)',
    lastFeedTime: new Date(),
    totalTokensConsumed: 0,
    ...overrides
  }),

  createMockDependencies: () => ({
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
  })
};
```

## Testing npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest src/**/*.test.ts",
    "test:integration": "vitest src/__tests__/integration/",
    "test:e2e": "vitest src/__tests__/e2e/",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest --run --coverage --reporter=junit"
  }
}
```

This testing strategy ensures:

- **Fast Feedback**: Unit tests run quickly for rapid development
- **Comprehensive Coverage**: All critical paths are tested
- **Realistic Scenarios**: Integration and E2E tests verify real workflows  
- **Maintainability**: Clear test structure and helper utilities
