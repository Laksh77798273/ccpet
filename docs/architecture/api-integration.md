# CLI Integration

## CLI Execution Model

Our application is a standalone CLI script that integrates with Claude Code through its status line configuration system. Instead of using extension APIs, we implement filesystem-based persistence and command-line output.

## Storage Service Template

```typescript
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

## CLI Main Class Template

```typescript
import { Pet, IPetState } from './core/Pet';
import { StatusBarFormatter } from './ui/StatusBar';
import { PetStorage } from './services/PetStorage';
import { PET_CONFIG } from './core/config';

export class ClaudeCodeStatusLine {
  private pet: Pet;
  private formatter: StatusBarFormatter;
  private storage: PetStorage;

  constructor() {
    this.storage = new PetStorage();
    this.formatter = new StatusBarFormatter();
    
    // Load or create initial pet state
    const savedState = this.storage.loadState();
    const initialState: IPetState = savedState || {
      energy: PET_CONFIG.INITIAL_ENERGY,
      expression: PET_CONFIG.HAPPY_EXPRESSION,
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };

    this.pet = new Pet(initialState, { config: PET_CONFIG });
    
    // Apply time decay since last session
    if (savedState) {
      this.pet.applyTimeDecay();
    }
  }

  public getStatusDisplay(): string {
    const state = this.pet.getState();
    return this.formatter.formatPetDisplay(state);
  }

  public saveState(): void {
    this.storage.saveState(this.pet.getState());
  }
}

// Main execution for CLI
function main(): void {
  try {
    const statusLine = new ClaudeCodeStatusLine();
    const display = statusLine.getStatusDisplay();
    statusLine.saveState();
    
    // Output the status line display
    process.stdout.write(display);
  } catch (error) {
    // Fallback display on error
    process.stdout.write('(?) ERROR');
    process.stderr.write(`Pet status error: ${error}\n`);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}
```

## Claude Code Configuration

The CLI script is configured in Claude Code through the status line settings:

### Configuration File: `~/.claude/settings.json`

```json
{
  "statusLine": {
    "type": "command", 
    "command": "/path/to/ccpet/dist/extension.js",
    "padding": 0
  }
}
```

### Alternative Interactive Configuration

```bash
claude-code
> /statusline
# Follow prompts to configure status bar pet display
```

## Testing Strategy

### Mock Filesystem Operations

```typescript
import { vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('PetStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock os.homedir
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
    
    // Mock path.join
    vi.mocked(path.join)
      .mockImplementation((...args) => args.join('/'));
    
    // Mock fs methods
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  it('should save and load pet state', () => {
    const storage = new PetStorage();
    const mockState = { energy: 75, expression: '(^_^)' };
    
    storage.saveState(mockState);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
```

## Error Handling

### Graceful Degradation

```typescript
// Always provide fallback display on errors
function main(): void {
  try {
    const statusLine = new ClaudeCodeStatusLine();
    const display = statusLine.getStatusDisplay();
    statusLine.saveState();
    process.stdout.write(display);
  } catch (error) {
    // Fallback to error display - never crash Claude Code
    process.stdout.write('(?) ERROR');
    process.stderr.write(`Pet status error: ${error}\n`);
    process.exit(1);
  }
}
```

### Storage Error Recovery

```typescript
public loadState(): IPetState | null {
  try {
    // ... load logic
  } catch (error) {
    console.error('Failed to load pet state:', error);
    return null; // Return null to trigger initial state creation
  }
}
```

## Performance Considerations

- **Fast Execution**: CLI script must complete in <100ms to avoid status line lag
- **Minimal Dependencies**: No external libraries beyond Node.js built-ins
- **Efficient File I/O**: Single file read/write per execution
- **Memory Efficient**: No persistent processes or memory leaks

## Deployment

The CLI script is built as a single executable file:

```bash
npm run build    # Produces dist/extension.js
chmod +x dist/extension.js
```

Users configure the path to this script in their Claude Code settings.