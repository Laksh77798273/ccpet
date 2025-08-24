import { IPetState } from '../core/Pet';
import { AnimalType, PET_CONFIG } from '../core/config';
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
      
      // Convert birthTime back to Date object if it exists
      if (parsed.birthTime) {
        parsed.birthTime = new Date(parsed.birthTime);
      }
      
      // Handle backward compatibility - add totalLifetimeTokens if missing
      if (parsed.totalLifetimeTokens === undefined) {
        parsed.totalLifetimeTokens = parsed.totalTokensConsumed || 0;
      }
      
      // Handle backward compatibility - add animalType if missing
      if (parsed.animalType === undefined) {
        // 为现有用户分配默认动物类型
        parsed.animalType = PET_CONFIG.ANIMAL.DEFAULT_TYPE;
        console.log(`Migrating existing pet to default animal type: ${parsed.animalType}`);
      }
      
      // 验证动物类型是否有效
      if (!Object.values(AnimalType).includes(parsed.animalType)) {
        console.warn(`Invalid animal type found: ${parsed.animalType}, using default`);
        parsed.animalType = PET_CONFIG.ANIMAL.DEFAULT_TYPE;
      }
      
      // Handle backward compatibility - add birthTime if missing
      if (parsed.birthTime === undefined) {
        // For existing pets without birthTime, use lastFeedTime as fallback
        // This provides a reasonable estimate of when the pet was "born"
        parsed.birthTime = parsed.lastFeedTime || new Date();
        console.log(`Adding birthTime for existing pet: ${parsed.birthTime.toISOString()}`);
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