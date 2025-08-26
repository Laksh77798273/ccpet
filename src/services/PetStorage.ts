import { IPetState } from '../core/Pet';
import { AnimalType, PET_CONFIG, generateRandomPetName } from '../core/config';
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
      
      // Handle backward compatibility - add petName if missing or empty
      if (parsed.petName === undefined || parsed.petName === '') {
        // Generate a random name for existing pets without names or with empty names
        parsed.petName = generateRandomPetName();
        console.log(`Adding petName for existing pet: ${parsed.petName}`);
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

  public moveToGraveyard(currentState: IPetState): void {
    try {
      // Ensure graveyard directory exists
      const graveyardDir = this._getGraveyardDir();
      this.ensureDirectoryExists(graveyardDir);

      // Create pet-specific directory with conflict resolution
      const petGraveyardDir = this._createPetGraveyardDir(currentState.petName, graveyardDir);
      
      // Create graveyard state file path
      const graveyardStatePath = path.join(petGraveyardDir, 'pet-state.json');

      // Atomic operation: save to graveyard then clear current state
      this._atomicMoveToGraveyard(currentState, graveyardStatePath);

    } catch (error) {
      console.error('Failed to move pet to graveyard:', error);
      throw new Error(`Graveyard operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private _getGraveyardDir(): string {
    const homeDir = os.homedir();
    const petDir = path.join(homeDir, '.claude-pet');
    return path.join(petDir, 'graveyard');
  }

  private _createPetGraveyardDir(petName: string, graveyardDir: string): string {
    // Sanitize pet name for safe directory naming
    const safePetName = this._sanitizePetName(petName);
    let petGraveyardDir = path.join(graveyardDir, safePetName);
    let counter = 1;

    // Handle naming conflicts with sequential numbering (with safety limit)
    while (fs.existsSync(petGraveyardDir) && counter < 1000) {
      counter++;
      petGraveyardDir = path.join(graveyardDir, `${safePetName}-${counter}`);
    }

    // If we hit the limit, throw an error
    if (counter >= 1000) {
      throw new Error(`Too many pets with similar names. Cannot create unique graveyard directory for ${petName}`);
    }

    // Create the pet-specific graveyard directory
    this.ensureDirectoryExists(petGraveyardDir);
    return petGraveyardDir;
  }

  private _sanitizePetName(petName: string): string {
    // Remove path traversal characters and unsafe file system characters
    return petName
      .replace(/[\/\\:*?"<>|]/g, '_') // Replace unsafe characters with underscore
      .replace(/\.\./g, '_') // Replace path traversal attempts
      .trim() // Remove leading/trailing whitespace
      .substring(0, 100); // Limit length to prevent filesystem issues
  }

  private _atomicMoveToGraveyard(currentState: IPetState, graveyardStatePath: string): void {
    let backupPath: string | null = null;
    
    try {
      // Step 1: Create backup of current state if it exists
      if (fs.existsSync(this.stateFilePath)) {
        backupPath = `${this.stateFilePath}.backup.${Date.now()}`;
        fs.copyFileSync(this.stateFilePath, backupPath);
      }

      // Step 2: Save current state to graveyard
      const graveyardData = JSON.stringify(currentState, null, 2);
      fs.writeFileSync(graveyardStatePath, graveyardData, 'utf8');

      // Step 3: Verify graveyard file was written correctly
      if (!fs.existsSync(graveyardStatePath)) {
        throw new Error('Failed to verify graveyard file creation');
      }

      // Step 4: Remove current state file (pet has been moved to graveyard)
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
      }

      // Step 5: Clean up backup file on success
      if (backupPath && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

    } catch (error) {
      // Rollback mechanism: restore from backup if it exists
      this._recoverFromStorageFailure(backupPath, error);
      throw error;
    }
  }

  private _recoverFromStorageFailure(backupPath: string | null, originalError: unknown): void {
    try {
      if (backupPath && fs.existsSync(backupPath)) {
        // Restore original state file from backup
        fs.copyFileSync(backupPath, this.stateFilePath);
        fs.unlinkSync(backupPath);
        console.log('Successfully recovered pet state from backup after storage failure');
      }
    } catch (recoveryError) {
      console.error('Failed to recover from storage failure:', recoveryError);
      console.error('Original error:', originalError);
    }
  }
}