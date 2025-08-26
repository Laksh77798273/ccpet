import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock ConfigService instance for dependency injection
const mockConfigService = {
  getConfig: vi.fn(() => ({
    pet: {
      animationEnabled: true,
      decayRate: 0.0231,
      emojiEnabled: true
    },
    colors: {
      petExpression: '#FFFF00:bright:bold',
      energyBar: '#00FF00',
      energyValue: '#00FFFF',
      accumulatedTokens: '#778899',
      lifetimeTokens: '#FF00FF',
      sessionInput: '#00FF00',
      sessionOutput: '#FFFF00',
      sessionCached: '#F4A460',
      sessionTotal: '#FFFFFF',
      contextLength: '#00DDFF',
      contextPercentage: '#0099DD',
      contextPercentageUsable: '#90EE90',
      cost: '#FFD700'
    },
    display: {
      maxLines: 3,
      line2: {
        enabled: true,
        items: ['input', 'output', 'cached', 'total']
      },
      line3: {
        enabled: true,
        items: ['context-length', 'context-percentage', 'context-percentage-usable', 'cost']
      }
    }
  }))
} as any;

// Mock the colors utility to return mock ANSI codes
vi.mock('../../utils/colors', () => ({
  processColorConfig: vi.fn((colors) => {
    // Return processed colors with mock ANSI codes
    const processed = {};
    Object.keys(colors).forEach(key => {
      processed[key] = `\x1b[0m`; // Basic reset code for all colors
    });
    return processed;
  })
}));

import { Pet, IPetState } from '../../core/Pet';
import { StatusBarFormatter } from '../../ui/StatusBar';
import { PetStorage } from '../../services/PetStorage';
import { ClaudeCodeStatusLine } from '../../ccpet';
import { PET_CONFIG, AnimalType } from '../../core/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

// Mock the config module to ensure predictable pet names
vi.mock('../../core/config', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateRandomPetName: vi.fn()
  };
});


describe('Pet Integration Tests', () => {
  const mockHomedir = '/mock/home';
  const mockPetDir = '/mock/home/.claude-pet';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

  const createInitialState = (): IPetState => ({
    uuid: 'test-integration-uuid',
    energy: PET_CONFIG.INITIAL_ENERGY,
    expression: PET_CONFIG.HAPPY_EXPRESSION,
    animalType: AnimalType.CAT, // 使用默认猫类型进行测试
    lastFeedTime: new Date(),
    totalTokensConsumed: 0,
    accumulatedTokens: 0,
    totalLifetimeTokens: 0
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock os.homedir
    vi.mocked(os.homedir).mockReturnValue(mockHomedir);
    
    // Mock path.join
    vi.mocked(path.join)
      .mockImplementation((...args) => args.join('/'));
    
    // Mock fs methods
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to create ClaudeCodeStatusLine with mocked dependencies
  const createStatusLine = (testMode: boolean = true) => {
    return new ClaudeCodeStatusLine(testMode, mockConfigService);
  };

  describe('Pet and StatusBarFormatter Integration', () => {
    it('should format pet display correctly when pet is fed', () => {
      const formatter = new StatusBarFormatter(true);
      const pet = new Pet(createInitialState(), { config: PET_CONFIG });

      pet.feed(1000000); // 1M tokens to trigger energy change
      const state = pet.getState();
      const animatedExpression = pet.getAnimatedExpression(false, 0, true); // Get emoji expression
      const display = formatter.formatPetDisplay(state, animatedExpression);

      expect(display).toMatch(/[🐱🐶🐰🐼🦊]\(\^_\^\) ●●●●●●●●●● 100\.00 \(0\) 💖1\.00M/);
    });

    it('should reflect energy changes in display format', () => {
      const formatter = new StatusBarFormatter(true);
      const initialState = { ...createInitialState(), energy: 50, expression: '(o_o)' };
      const pet = new Pet(initialState, { config: PET_CONFIG });
      
      pet.feed(500000); // Not enough for energy change, just accumulate
      const state1 = pet.getState();
      const animatedExpression1 = pet.getAnimatedExpression(false, 0, true); // Get emoji expression
      const display1 = formatter.formatPetDisplay(state1, animatedExpression1);
      expect(display1).toMatch(/[🐱🐶🐰🐼🦊]\(o_o\) ●●●●●○○○○○ 50\.00 \(500\.0K\) 💖500\.0K/); // 50% energy, 500K accumulated

      pet.feed(500000); // Now we have 1M total, triggers energy change
      const state2 = pet.getState();
      const animatedExpression2 = pet.getAnimatedExpression(false, 0, true); // Get emoji expression
      const display2 = formatter.formatPetDisplay(state2, animatedExpression2);
      expect(display2).toMatch(/[🐱🐶🐰🐼🦊]\(o_o\) ●●●●●○○○○○ 51\.00 \(0\) 💖1\.00M/); // 51% energy, 0 accumulated (converted to energy)
    });

    it('should handle pet state transitions correctly', () => {
      const formatter = new StatusBarFormatter(true);
      // 使用更长时间来达到sick状态：约60小时(2.5天)
      const sixtyHoursAgo = new Date(Date.now() - (60 * 60 * 60 * 1000));
      const initialState = { ...createInitialState(), energy: 85, lastFeedTime: sixtyHoursAgo };
      const pet = new Pet(initialState, { config: PET_CONFIG });

      pet.applyTimeDecay();
      const state = pet.getState();
      const animatedExpression = pet.getAnimatedExpression(false, 0, true); // Get emoji expression
      const display = formatter.formatPetDisplay(state, animatedExpression);

      // 60小时 * 60分钟 * 0.0231 ≈ 83.33点衰减
      // 85 - 83.33 ≈ 1.67，应该是dead状态
      expect(display).toMatch(/[🐱🐶🐰🐼🦊]\(x_x\) /);
    });
  });

  describe('Full CLI Lifecycle', () => {
    it('should simulate complete pet lifecycle with persistence', () => {
      // First session - new pet
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const statusLine1 = createStatusLine();
      const display1 = statusLine1.getStatusDisplay();
      statusLine1.saveState();
      
      expect(display1).toMatch(/[🐱🐶🐰🐼🦊]\(.*\) ●●●●●●●●●● 100\.00 \(0\) 💖0/); // Random animal type, accept any valid emoji
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Second session - load saved state
      const savedState = {
        energy: 75,
        expression: '(^_^)',
        animalType: AnimalType.CAT,
        lastFeedTime: new Date().toISOString(),
        totalTokensConsumed: 5,
        accumulatedTokens: 0,
        totalLifetimeTokens: 5
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      
      const statusLine2 = createStatusLine();
      const display2 = statusLine2.getStatusDisplay();
      
      expect(display2).toBe('🐱(o_o) ●●●●●●●●○○ 75.00 (0) 💖5'); // 75% energy (rounded to 8 bars)
    });

    it('should handle error conditions throughout CLI lifecycle', () => {
      // Simulate storage errors
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => {
        const statusLine = createStatusLine();
        const display = statusLine.getStatusDisplay();
        statusLine.saveState();
        expect(display).toMatch(/[🐱🐶🐰🐼🦊]\(.*\) ●●●●●●●●●● 100\.00 \(0\) 💖0/); // Random animal type, accept any valid emoji
      }).not.toThrow();
    });

    it('should maintain pet state consistency across components', () => {
      const storage = new PetStorage();
      const formatter = new StatusBarFormatter(true);
      const pet = new Pet(createInitialState(), { config: PET_CONFIG });
      
      // Feed pet and check consistency
      pet.feed(3);
      const state = pet.getState();
      
      // Format display with emoji expression
      const animatedExpression = pet.getAnimatedExpression(false, 0, true); // Get emoji expression
      const display = formatter.formatPetDisplay(state, animatedExpression);
      
      // Mock that state exists and return the actual state data when read
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(state));
      
      // Save and load state
      storage.saveState(state);
      const loadedState = storage.loadState();
      
      expect(loadedState).toEqual(expect.objectContaining(state));
      expect(display).toMatch(/[🐱🐶🐰🐼🦊]\(\^_\^\) ●●●●●●●●●● 100\.00 \(3\) 💖3/);
    });
  });

  describe('Pet Graveyard Integration', () => {
    beforeEach(() => {
      vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
    });

    it('should complete full death-to-graveyard-to-new-pet lifecycle', async () => {
      // Mock generateRandomPetName to return a different name
      const { generateRandomPetName } = vi.mocked(await import('../../core/config'));
      generateRandomPetName.mockReturnValue('Buddy');
      
      // Mock existsSync for graveyard operations
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('pet-state.json')) {
          return true; // Graveyard file verification should pass
        }
        return false; // Graveyard directory doesn't exist initially
      });

      const storage = new PetStorage();
      const deadPetState: IPetState = {
        uuid: 'test-dead-pet-uuid',
        energy: 0,
        expression: '(x_x)',
        animalType: AnimalType.CAT,
        birthTime: new Date('2024-01-01'),
        lastFeedTime: new Date('2024-01-01'),
        totalTokensConsumed: 5000000,
        accumulatedTokens: 0,
        totalLifetimeTokens: 5000000,
        petName: 'Fluffy'
      };

      const pet = new Pet(deadPetState, { config: PET_CONFIG });

      // Step 1: Verify pet is dead
      expect(pet.isDead()).toBe(true);

      // Step 2: Reset with graveyard callback
      let graveyardState: IPetState | null = null;
      pet.resetToInitialState((state) => {
        graveyardState = state;
        storage.moveToGraveyard(state);
      });

      // Step 3: Verify graveyard callback was called
      expect(graveyardState).toEqual(expect.objectContaining({
        energy: 0,
        petName: 'Fluffy',
        totalLifetimeTokens: 5000000
      }));

      // Step 4: Verify graveyard file operations
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.claude-pet/graveyard/Fluffy/pet-state.json',
        expect.stringContaining('"petName": "Fluffy"'),
        'utf8'
      );

      // Step 5: Verify new pet state
      const newState = pet.getState();
      expect(newState.energy).toBe(PET_CONFIG.INITIAL_ENERGY);
      expect(newState.totalLifetimeTokens).toBe(0);
      expect(newState.petName).not.toBe('Fluffy');
      expect(pet.isDead()).toBe(false);
    });

    it('should handle concurrent pet deaths with unique graveyard directories', () => {
      const storage = new PetStorage();
      let existsCallCount = 0;
      
      // Mock same-name conflict resolution
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Mittens')) {
          existsCallCount++;
          if (existsCallCount === 1) return true; // First check returns true (directory exists)
          if (existsCallCount === 2) return false; // Second check returns false (can create numbered directory)
        }
        if (path.toString().includes('pet-state.json')) {
          return true; // Graveyard file verification should pass
        }
        return false; // Default to false for other paths
      });

      const deadPet1: IPetState = {
        ...createInitialState(),
        energy: 0,
        petName: 'Mittens',
        totalLifetimeTokens: 1000000
      };

      storage.moveToGraveyard(deadPet1);

      // Verify second pet gets numbered directory
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('graveyard/Mittens-2/pet-state.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should maintain data integrity during graveyard operations with filesystem errors', () => {
      // Mock existsSync for backup creation and verification
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('backup')) return false; // No backup exists initially
        if (path.toString().includes('pet-state.json')) return true; // State file exists for backup creation
        return false;
      });

      const storage = new PetStorage();
      const deadPetState: IPetState = {
        ...createInitialState(),
        energy: 0,
        petName: 'ErrorPet',
        totalLifetimeTokens: 2000000
      };

      // Simulate write failure to trigger rollback
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error('Disk full');
      });

      expect(() => storage.moveToGraveyard(deadPetState)).toThrow('Graveyard operation failed');
      
      // Verify backup and recovery were attempted
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        mockStateFile,
        expect.stringMatching(/\.backup\.\d+$/)
      );
    });

    it('should handle complete CLI adoption workflow with graveyard preservation', () => {
      // Setup: Dead pet in CLI
      const deadPetState = {
        energy: 0,
        expression: '(x_x)',
        animalType: AnimalType.DOG,
        birthTime: '2024-01-01T00:00:00.000Z',
        lastFeedTime: '2024-01-01T00:00:00.000Z',
        totalTokensConsumed: 3000000,
        accumulatedTokens: 0,
        totalLifetimeTokens: 3000000,
        petName: 'Rex'
      };

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json')) {
          return true; // Graveyard file verification should pass
        }
        if (path.toString().includes('pet-state.json')) {
          return true; // State file exists
        }
        return false; // Graveyard directory doesn't exist initially
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(deadPetState));

      const statusLine = createStatusLine();
      
      // Verify pet is dead
      expect(statusLine.isPetDead()).toBe(true);

      // Adopt new pet
      statusLine.adoptNewPet();

      // Verify graveyard operations
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.claude-pet/graveyard/Rex/pet-state.json',
        expect.stringContaining('"petName": "Rex"'),
        'utf8'
      );

      // Verify current state file was removed and new one created
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockStateFile);
      
      // Verify new pet state was saved
      const saveStateCalls = vi.mocked(fs.writeFileSync).mock.calls.filter(
        call => call[0] === mockStateFile
      );
      expect(saveStateCalls.length).toBeGreaterThan(0);
    });

    it('should preserve complete pet history in graveyard format', () => {
      // Mock existsSync for graveyard operations
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('pet-state.json')) {
          return true; // Graveyard file verification should pass
        }
        return false; // Graveyard directory doesn't exist initially
      });

      const storage = new PetStorage();
      const richPetHistory: IPetState = {
        uuid: 'test-rich-pet-uuid',
        energy: 0,
        expression: '(x_x)',
        animalType: AnimalType.PANDA,
        birthTime: new Date('2024-01-01'),
        lastFeedTime: new Date('2024-06-01'),
        totalTokensConsumed: 10000000,
        accumulatedTokens: 500000,
        totalLifetimeTokens: 10000000,
        lastDecayTime: new Date('2024-05-31'),
        sessionTotalInputTokens: 5000,
        sessionTotalOutputTokens: 3000,
        sessionTotalCachedTokens: 1000,
        contextLength: 50000,
        contextPercentage: 25.0,
        contextPercentageUsable: 31.25,
        sessionTotalCostUsd: 2.45,
        petName: 'Bamboo'
      };

      storage.moveToGraveyard(richPetHistory);

      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsedHistory = JSON.parse(savedJson);

      // Verify all state fields are preserved
      expect(parsedHistory).toEqual(expect.objectContaining({
        petName: 'Bamboo',
        animalType: AnimalType.PANDA,
        totalLifetimeTokens: 10000000,
        sessionTotalCostUsd: 2.45,
        contextPercentage: 25.0
      }));
    });
  });
});