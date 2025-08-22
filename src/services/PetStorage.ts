import { IPetState } from '../core/Pet';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
      
      // Convert lastDecayTime back to Date object if it exists
      if (parsed.lastDecayTime) {
        parsed.lastDecayTime = new Date(parsed.lastDecayTime);
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