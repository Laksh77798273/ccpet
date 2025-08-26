import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PetStorage } from '../services/PetStorage';

export class ResetCommand {
  name = 'reset';
  description = 'Reset pet to initial state';

  async execute(_args: string[]): Promise<void> {
    try {
      const petDir = path.join(os.homedir(), '.claude-pet');
      const stateFile = path.join(petDir, 'pet-state.json');
      const counterFile = path.join(petDir, 'animation-counter.json');
      const sessionFile = path.join(petDir, 'session-tracker.json');

      let filesRemoved = 0;
      const storage = new PetStorage();

      // Handle pet state file with graveyard preservation
      if (fs.existsSync(stateFile)) {
        try {
          const currentState = storage.loadState();
          if (currentState) {
            // Move to graveyard instead of deleting
            storage.moveToGraveyard(currentState);
            console.log(`🪦 Moved pet "${currentState.petName}" to graveyard`);
            filesRemoved++;
          } else {
            // If no valid state, just remove the file
            fs.unlinkSync(stateFile);
            console.log('🗑️  Removed invalid pet-state.json');
            filesRemoved++;
          }
        } catch (graveyardError) {
          // Fallback to deletion if graveyard fails
          console.warn('⚠️  Failed to move to graveyard, removing file:', graveyardError);
          fs.unlinkSync(stateFile);
          console.log('🗑️  Removed pet-state.json');
          filesRemoved++;
        }
      }

      // Remove animation counter file
      if (fs.existsSync(counterFile)) {
        fs.unlinkSync(counterFile);
        filesRemoved++;
        console.log('🗑️  Removed animation-counter.json');
      }

      // Remove session tracker file
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
        filesRemoved++;
        console.log('🗑️  Removed session-tracker.json');
      }

      if (filesRemoved === 0) {
        console.log('ℹ️  No pet state files found to reset');
      } else {
        console.log(`✅ Pet reset complete! Processed ${filesRemoved} file(s)`);
        console.log('🐣 Your pet will be reborn on next use');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to reset pet:', errorMessage);
      process.exit(1);
    }
  }
}