import { Pet, IPetState } from './core/Pet';
import { StatusBarFormatter } from './ui/StatusBar';
import { PetStorage } from './services/PetStorage';
import { getTokenMetrics } from './utils/jsonl';
import { PET_CONFIG } from './core/config';

class ClaudeCodeStatusLine {
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
        // Use a simple 1:1 ratio for token to energy conversion
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

export { ClaudeCodeStatusLine };