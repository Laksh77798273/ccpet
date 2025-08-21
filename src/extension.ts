import { Pet, IPetState } from './core/Pet';
import { StatusBarFormatter } from './ui/StatusBar';
import { PetStorage } from './services/PetStorage';
import { PET_CONFIG } from './core/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

export { ClaudeCodeStatusLine };