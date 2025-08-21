# API Integration

## API Client Configuration

Our "API client" is the `src/services/ClaudeCodeService.ts` module, which serves as an **Adapter** between our application and the Claude Code API.

## Service Template

```typescript
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
  private disposables: claude.Disposable[] = [];

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
    const disposable = claude.commands.registerCommand(commandId, callback);
    this.disposables.push(disposable);
  }

  public onDidCountTokens(callback: (tokens: number) => void): () => void {
    const disposable = claude.workspace.onDidChangeTextDocument((event) => {
      const tokens = this._calculateTokensFromEvent(event);
      if (tokens > 0) {
        callback(tokens);
      }
    });
    
    this.disposables.push(disposable);
    
    return () => disposable.dispose();
  }

  public async getState(): Promise<string | undefined> {
    return await claude.workspace.getConfiguration('statusPet').get('persistedState');
  }

  public async saveState(state: string): Promise<void> {
    await claude.workspace.getConfiguration('statusPet').update('persistedState', state, true);
  }

  public dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  private _calculateTokensFromEvent(event: claude.TextDocumentChangeEvent): number {
    return event.contentChanges.reduce((total, change) => {
      // Rough token estimation: ~4 characters per token
      const textLength = change.text.length;
      const tokenCount = Math.ceil(textLength / 4);
      return total + tokenCount;
    }, 0);
  }
}
```

## Error Handling for API Integration

The service implements comprehensive error handling and retry logic:

```typescript
export class ClaudeCodeService implements IClaudeCodeService {
  private circuitBreaker = new CircuitBreaker();
  
  public updateStatusBar(text: string): void {
    try {
      this.circuitBreaker.execute(async () => {
        this.statusBarItem.text = text;
      });
    } catch (error) {
      Logger.getInstance().error('claude-service', 'Failed to update status bar', { error });
      // Fail silently - don't crash the extension
    }
  }

  public async saveState(state: string): Promise<void> {
    return withRetry(async () => {
      await claude.workspace.getConfiguration('statusPet').update('persistedState', state, true);
    }, 3, 1000);
  }

  private async _calculateTokensFromEvent(event: claude.TextDocumentChangeEvent): Promise<number> {
    try {
      return event.contentChanges.reduce((total, change) => {
        const textLength = change.text.length;
        const tokenCount = Math.ceil(textLength / 4);
        return total + tokenCount;
      }, 0);
    } catch (error) {
      Logger.getInstance().warn('claude-service', 'Token calculation failed', { error });
      return 0; // Return safe default
    }
  }
}
```

## Extension Integration

The service integrates with the main extension lifecycle:

```typescript
// src/extension.ts
import * as claude from 'claude-code-api';
import { Pet, IPetState } from './core/Pet';
import { ClaudeCodeService } from './services/ClaudeCodeService';
import { StatusBar } from './ui/StatusBar';

export function activate(context: claude.ExtensionContext) {
  // Initialize services
  const claudeService = new ClaudeCodeService();
  
  // Load or create pet state
  const initialState = await loadPersistedState(claudeService) || {
    energy: 100,
    expression: '(^_^)',
    lastFeedTime: new Date(),
    totalTokensConsumed: 0
  };
  
  const pet = new Pet(initialState, {
    config: require('./core/config').config,
    logger: Logger.getInstance()
  });
  
  // Initialize UI
  const statusBar = new StatusBar(pet, claudeService);
  
  // Set up token feeding
  const tokenDisposable = claudeService.onDidCountTokens((tokens) => {
    pet.feed(tokens);
  });
  
  // Register commands
  claudeService.registerCommand('statusPet.adoptNew', () => {
    pet.adoptNewPet();
  });
  
  claudeService.registerCommand('statusPet.showStatus', () => {
    const state = pet.getState();
    claude.window.showInformationMessage(
      `Pet Energy: ${state.energy}%, Expression: ${state.expression}`
    );
  });
  
  // Register for cleanup
  context.subscriptions.push(
    claudeService,
    statusBar,
    tokenDisposable
  );
  
  // Set up periodic decay
  const decayInterval = setInterval(() => {
    pet.applyTimeDecay();
  }, 60 * 60 * 1000); // Every hour
  
  context.subscriptions.push({
    dispose: () => clearInterval(decayInterval)
  });
}

export function deactivate() {
  // Cleanup is handled automatically by subscriptions
}

async function loadPersistedState(service: ClaudeCodeService): Promise<IPetState | null> {
  try {
    const stateString = await service.getState();
    if (stateString) {
      return InputValidator.sanitizeStateData(JSON.parse(stateString));
    }
  } catch (error) {
    Logger.getInstance().warn('extension', 'Failed to load persisted state', { error });
  }
  return null;
}
```

## API Testing Strategy

Mock the Claude Code API for testing:

```typescript
// src/__tests__/mocks/claudeCodeMock.ts
export const mockClaudeCodeAPI = {
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
      get: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined)
    })
  }
};

// src/services/__tests__/ClaudeCodeService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeCodeService } from '../ClaudeCodeService';

// Mock the Claude Code API
vi.mock('claude-code-api', () => mockClaudeCodeAPI);

describe('ClaudeCodeService', () => {
  let service: ClaudeCodeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClaudeCodeService();
  });

  describe('Status Bar Integration', () => {
    it('should create and show status bar item', () => {
      expect(mockClaudeCodeAPI.window.createStatusBarItem).toHaveBeenCalledWith(
        expect.any(Number), // alignment
        100 // priority
      );
    });

    it('should update status bar text', () => {
      const mockStatusBarItem = mockClaudeCodeAPI.window.createStatusBarItem();
      
      service.updateStatusBar('Test Pet (^_^) ████████░░');
      
      expect(mockStatusBarItem.text).toBe('Test Pet (^_^) ████████░░');
    });
  });

  describe('Command Registration', () => {
    it('should register commands with Claude Code', () => {
      const mockCallback = vi.fn();
      
      service.registerCommand('test.command', mockCallback);
      
      expect(mockClaudeCodeAPI.commands.registerCommand).toHaveBeenCalledWith(
        'test.command',
        mockCallback
      );
    });
  });

  describe('Token Counting', () => {
    it('should calculate tokens from document changes', () => {
      const mockCallback = vi.fn();
      const mockEvent = {
        contentChanges: [
          { text: 'Hello world' }, // ~3 tokens
          { text: 'This is a test' }  // ~4 tokens
        ]
      };
      
      service.onDidCountTokens(mockCallback);
      
      // Simulate document change
      const registeredCallback = mockClaudeCodeAPI.workspace.onDidChangeTextDocument.mock.calls[0][0];
      registeredCallback(mockEvent);
      
      expect(mockCallback).toHaveBeenCalledWith(7); // Total tokens
    });
  });
});
```

## Configuration Integration

The service reads extension configuration:

```typescript
// package.json contribution
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "Status Pet Configuration",
      "properties": {
        "statusPet.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable the status bar pet"
        },
        "statusPet.updateInterval": {
          "type": "number",
          "default": 100,
          "description": "Status bar update interval in milliseconds"
        },
        "statusPet.persistedState": {
          "type": "string",
          "description": "Persisted pet state (internal use)"
        }
      }
    }
  }
}
```

This API integration approach ensures:
- **Clean Abstraction**: Core logic is isolated from Claude Code specifics
- **Error Resilience**: API failures don't crash the extension
- **Testability**: Easy to mock for unit tests
- **Resource Cleanup**: Proper disposal prevents memory leaks