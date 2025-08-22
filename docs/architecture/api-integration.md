# CLI Integration

## CLI Execution Model

Our application is a standalone CLI script that integrates with Claude Code through its status line configuration system. The application reads Claude Code session data via stdin (including JSONL transcript paths) and processes real token consumption data to feed the pet. We implement filesystem-based persistence for pet state and command-line output for status display.

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
import { getTokenMetrics } from './utils/jsonl';
import { PET_CONFIG } from './core/config';

interface ClaudeCodeStatusInput {
  hook_event_name: string;
  session_id: string;
  transcript_path: string;
  cwd: string;
  model: {
    id: string;
    display_name: string;
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  version: string;
  output_style: {
    name: string;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
}

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

  public async processTokensAndGetStatusDisplay(claudeCodeInput: ClaudeCodeStatusInput): Promise<string> {
    try {
      // Always apply time decay first
      this.pet.applyTimeDecay();
      
      // Process tokens from JSONL transcript file
      const tokenMetrics = await getTokenMetrics(claudeCodeInput.transcript_path);
      
      if (tokenMetrics.totalTokens > 0) {
        // Convert tokens to energy and feed pet
        // Use a simple 1:10 ratio for token to energy conversion
        const energyToAdd = tokenMetrics.totalTokens * 0.1; // 10 tokens = 1 energy
        this.pet.addEnergy(energyToAdd);
      }
      
      // Get current state and format display
      const state = this.pet.getState();
      return this.formatter.formatPetDisplay(state);
    } catch (error) {
      console.error('Token processing failed:', error);
      // Apply time decay even on error
      this.pet.applyTimeDecay();
      // Fallback to current state without token processing
      const state = this.pet.getState();
      return this.formatter.formatPetDisplay(state);
    }
  }

  public getStatusDisplay(): string {
    // Apply time decay before getting display
    this.pet.applyTimeDecay();
    const state = this.pet.getState();
    return this.formatter.formatPetDisplay(state);
  }

  public saveState(): void {
    this.storage.saveState(this.pet.getState());
  }
}

// Function to read from stdin
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(input.trim());
    });
  });
}

// Main execution for CLI
async function main(): Promise<void> {
  try {
    // Read Claude Code JSON input from stdin
    const inputData = await readStdin();
    
    if (!inputData) {
      // No input provided - show basic status
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      statusLine.saveState();
      process.stdout.write(display);
      return;
    }
    
    let claudeCodeInput: ClaudeCodeStatusInput;
    try {
      claudeCodeInput = JSON.parse(inputData);
    } catch (error) {
      // Invalid JSON - show basic status
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      statusLine.saveState();
      process.stdout.write(display);
      return;
    }
    
    const statusLine = new ClaudeCodeStatusLine();
    const display = await statusLine.processTokensAndGetStatusDisplay(claudeCodeInput);
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

## JSONL Token Processing Utility

```typescript
import * as fs from 'fs';
import * as readline from 'readline';

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ClaudeCodeMessage {
  type: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

/**
 * Processes a JSONL transcript file to extract token metrics
 * Based on ccstatusline documentation for proper token processing
 */
export async function getTokenMetrics(transcriptPath: string): Promise<TokenMetrics> {
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (!fs.existsSync(transcriptPath)) {
      return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    }

    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim() === '') continue;
      
      try {
        const message: ClaudeCodeMessage = JSON.parse(line);
        
        // Extract token usage from Claude API responses
        if (message.usage) {
          inputTokens += message.usage.input_tokens || 0;
          outputTokens += message.usage.output_tokens || 0;
        }
      } catch (parseError) {
        // Skip malformed JSON lines
        continue;
      }
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  } catch (error) {
    console.error('Failed to process JSONL transcript:', error);
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }
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