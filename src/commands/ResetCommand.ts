import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ResetCommand {
  name = 'reset';
  description = 'Reset pet to initial state';

  async execute(args: string[]): Promise<void> {
    try {
      const petDir = path.join(os.homedir(), '.claude-pet');
      const stateFile = path.join(petDir, 'pet-state.json');
      const counterFile = path.join(petDir, 'animation-counter.json');
      const sessionFile = path.join(petDir, 'session-tracker.json');

      let filesRemoved = 0;

      // Remove pet state file
      if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
        filesRemoved++;
        console.log('🗑️  Removed pet-state.json');
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
        console.log(`✅ Pet reset complete! Removed ${filesRemoved} state file(s)`);
        console.log('🐣 Your pet will be reborn on next use');
      }

    } catch (error) {
      console.error('❌ Failed to reset pet:', error.message);
      process.exit(1);
    }
  }
}