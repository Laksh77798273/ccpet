import { Pet, IPetState } from './core/Pet';
import { StatusBarFormatter } from './ui/StatusBar';
import { PetStorage } from './services/PetStorage';
import { getTokenMetrics } from './utils/jsonl';
import { PET_CONFIG } from './core/config';

class ClaudeCodeStatusLine {
  private pet: Pet;
  private formatter: StatusBarFormatter;
  private storage: PetStorage;

  constructor(testMode: boolean = false) {
    this.storage = new PetStorage();
    this.formatter = new StatusBarFormatter(testMode);
    
    // Load or create initial pet state
    const savedState = this.storage.loadState();
    const initialState: IPetState = savedState || {
      energy: PET_CONFIG.INITIAL_ENERGY,
      expression: PET_CONFIG.HAPPY_EXPRESSION,
      lastFeedTime: new Date(),
      totalTokensConsumed: 0,
      accumulatedTokens: 0,
      totalLifetimeTokens: 0
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
        // Feed pet with actual tokens (using new accumulation system)
        this.pet.feed(tokenMetrics.totalTokens);
      }
      
      // Get current state and update with session token info
      const state = this.pet.getState();
      state.sessionTotalInputTokens = tokenMetrics.sessionTotalInputTokens;
      state.sessionTotalOutputTokens = tokenMetrics.sessionTotalOutputTokens;
      state.sessionTotalCachedTokens = tokenMetrics.sessionTotalCachedTokens;
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

  public adoptNewPet(): void {
    if (this.pet.isDead()) {
      this.pet.resetToInitialState();
      this.saveState();
      
      // Show success notification if VSCode API is available
      if (typeof window !== 'undefined' && window.vscode?.postMessage) {
        window.vscode.postMessage({
          command: 'showInformationMessage',
          text: 'Successfully adopted a new pet! Your pet is now happy and full of energy.'
        });
      }
    }
  }

  public isPetDead(): boolean {
    return this.pet.isDead();
  }
}

// Claude Code Status Hook Interface
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
    // console.log('Input data:', inputData);
    
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
      // console.log('Claude Code input:', claudeCodeInput)
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

// VSCode Extension Activation (if running in VSCode environment)
export function activate(context: any) {
  const statusLine = new ClaudeCodeStatusLine();

  // Register the adoptNewPet command
  context.subscriptions.push(
    {
      command: 'claude-pet.adoptNewPet',
      callback: () => {
        statusLine.adoptNewPet();
      }
    }
  );

  // Register command with VSCode if vscode API is available
  if (typeof window !== 'undefined' && window.vscode?.commands) {
    window.vscode.commands.registerCommand('claude-pet.adoptNewPet', () => {
      statusLine.adoptNewPet();
    });
  }
}

// VSCode Extension Deactivation
export function deactivate() {
  // Clean up if needed
}

// Run if this is the main module (CLI mode)
if (require.main === module) {
  main();
}

export { ClaudeCodeStatusLine };