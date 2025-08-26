import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PetStorage } from '../PetStorage';
import { IPetState } from '../../core/Pet';
import { AnimalType, PET_NAMES } from '../../core/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('PetStorage Service', () => {
  const mockHomedir = '/mock/home';
  const mockPetDir = '/mock/home/.claude-pet';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

  const createMockPetState = (overrides: Partial<IPetState> = {}): IPetState => ({
    uuid: 'test-uuid-456',
    energy: 75,
    expression: '(^_^)',
    animalType: AnimalType.CAT,
    birthTime: new Date('2025-08-20T10:00:00.000Z'),
    lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
    totalTokensConsumed: 5,
    accumulatedTokens: 0,
    totalLifetimeTokens: 5,
    petName: 'TestPet',
    ...overrides
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

  describe('constructor', () => {
    it('should initialize with correct file paths', () => {
      new PetStorage();
      
      expect(os.homedir).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith(mockHomedir, '.claude-pet');
      expect(path.join).toHaveBeenCalledWith(mockPetDir, 'pet-state.json');
    });

    it('should create directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      new PetStorage();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockPetDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      new PetStorage();
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => new PetStorage()).not.toThrow();
    });
  });

  describe('loadState', () => {
    it('should return null if state file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const storage = new PetStorage();
      
      const result = storage.loadState();
      
      expect(result).toBeNull();
    });

    it('should load and parse state from file', () => {
      const mockState = createMockPetState();
      const mockJson = JSON.stringify(mockState);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(fs.readFileSync).toHaveBeenCalledWith(mockStateFile, 'utf8');
      expect(result).toEqual(mockState);
    });

    it('should convert lastFeedTime string back to Date object', () => {
      const mockState = {
        energy: 75,
        expression: '(^_^)',
        lastFeedTime: '2025-08-21T12:00:00.000Z',
        totalTokensConsumed: 5
      };
      const mockJson = JSON.stringify(mockState);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result?.lastFeedTime).toBeInstanceOf(Date);
      expect(result?.lastFeedTime?.toISOString()).toBe('2025-08-21T12:00:00.000Z');
    });

    it('should handle file read errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result).toBeNull();
    });

    it('should handle missing lastFeedTime gracefully', () => {
      const mockState = {
        energy: 75,
        expression: '(^_^)',
        totalTokensConsumed: 5
      };
      const mockJson = JSON.stringify(mockState);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      // Should add totalLifetimeTokens for backward compatibility
      expect(result).toEqual(expect.objectContaining({
        ...mockState,
        totalLifetimeTokens: 5,
        animalType: AnimalType.CAT, // Should add default animal type
        birthTime: expect.any(Date), // Should add birthTime for backward compatibility
        petName: expect.any(String) // Should add petName for backward compatibility
      }));
    });

    it('should add default animal type for backward compatibility', () => {
      const mockStateWithoutAnimalType = {
        energy: 75,
        expression: '(^_^)',
        lastFeedTime: '2025-08-21T12:00:00.000Z',
        totalTokensConsumed: 5,
        accumulatedTokens: 0,
        totalLifetimeTokens: 5
      };
      const mockJson = JSON.stringify(mockStateWithoutAnimalType);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result).toEqual(expect.objectContaining({
        ...mockStateWithoutAnimalType,
        lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
        animalType: AnimalType.CAT, // Should add default animal type
        birthTime: expect.any(Date), // Should add birthTime for backward compatibility
        petName: expect.any(String) // Should add petName for backward compatibility
      }));
    });

    it('should add birthTime for backward compatibility', () => {
      const mockStateWithoutBirthTime = {
        energy: 75,
        expression: '(^_^)',
        animalType: AnimalType.CAT,
        lastFeedTime: '2025-08-21T12:00:00.000Z',
        totalTokensConsumed: 5,
        accumulatedTokens: 0,
        totalLifetimeTokens: 5
      };
      const mockJson = JSON.stringify(mockStateWithoutBirthTime);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result).toEqual(expect.objectContaining({
        ...mockStateWithoutBirthTime,
        lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
        birthTime: new Date('2025-08-21T12:00:00.000Z'), // Should use lastFeedTime as fallback
        petName: expect.any(String) // Should add petName for backward compatibility
      }));
    });

    it('should validate and fix invalid animal types', () => {
      const mockStateWithInvalidAnimalType = {
        energy: 75,
        expression: '(^_^)',
        animalType: 'invalid_animal' as any,
        lastFeedTime: '2025-08-21T12:00:00.000Z',
        totalTokensConsumed: 5,
        accumulatedTokens: 0,
        totalLifetimeTokens: 5
      };
      const mockJson = JSON.stringify(mockStateWithInvalidAnimalType);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result).toEqual(expect.objectContaining({
        ...mockStateWithInvalidAnimalType,
        lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
        animalType: AnimalType.CAT, // Should fix invalid animal type to default
        birthTime: expect.any(Date), // Should add birthTime for backward compatibility
        petName: expect.any(String) // Should add petName for backward compatibility
      }));
    });

    it('should preserve valid animal types', () => {
      const mockState = createMockPetState({ animalType: AnimalType.FOX });
      const mockJson = JSON.stringify(mockState);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
      
      const storage = new PetStorage();
      const result = storage.loadState();
      
      expect(result?.animalType).toBe(AnimalType.FOX);
    });

    it('should handle all valid animal types correctly', () => {
      const allTypes = Object.values(AnimalType);
      
      allTypes.forEach(type => {
        const mockState = createMockPetState({ animalType: type });
        const mockJson = JSON.stringify(mockState);
        
        vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
        
        const storage = new PetStorage();
        const result = storage.loadState();
        
        expect(result?.animalType).toBe(type);
      });
    });

    describe('petName backward compatibility', () => {
      it('should add random petName for state without petName', () => {
        const mockStateWithoutPetName = {
          energy: 75,
          expression: '(^_^)',
          animalType: AnimalType.CAT,
          birthTime: '2025-08-20T10:00:00.000Z',
          lastFeedTime: '2025-08-21T12:00:00.000Z',
          totalTokensConsumed: 5,
          accumulatedTokens: 0,
          totalLifetimeTokens: 5
        };
        const mockJson = JSON.stringify(mockStateWithoutPetName);
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
        
        const storage = new PetStorage();
        const result = storage.loadState();
        
        expect(result).toEqual(expect.objectContaining({
          ...mockStateWithoutPetName,
          birthTime: new Date('2025-08-20T10:00:00.000Z'),
          lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
          petName: expect.any(String)
        }));
        expect(PET_NAMES).toContain(result?.petName);
      });

      it('should preserve existing petName when present', () => {
        const mockStateWithPetName = createMockPetState({ petName: 'ExistingPetName' });
        const mockJson = JSON.stringify(mockStateWithPetName);
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
        
        const storage = new PetStorage();
        const result = storage.loadState();
        
        expect(result?.petName).toBe('ExistingPetName');
      });

      it('should handle empty petName by generating new one', () => {
        const mockStateWithEmptyName = createMockPetState({ petName: '' });
        const mockJson = JSON.stringify(mockStateWithEmptyName);
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
        
        const storage = new PetStorage();
        const result = storage.loadState();
        
        // Empty string should be replaced with random name
        expect(result?.petName).not.toBe('');
        expect(result?.petName?.length).toBeGreaterThan(0);
      });

      it('should generate names from PET_NAMES array', () => {
        const mockStateWithoutPetName = {
          energy: 75,
          expression: '(^_^)',
          animalType: AnimalType.CAT,
          birthTime: '2025-08-20T10:00:00.000Z',
          lastFeedTime: '2025-08-21T12:00:00.000Z',
          totalTokensConsumed: 5,
          accumulatedTokens: 0,
          totalLifetimeTokens: 5
        };
        const mockJson = JSON.stringify(mockStateWithoutPetName);
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
        
        // Test multiple loads to verify names come from the array
        const results = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const storage = new PetStorage();
          const result = storage.loadState();
          if (result?.petName) {
            results.add(result.petName);
          }
        }
        
        // All generated names should be from PET_NAMES
        for (const name of results) {
          expect(PET_NAMES).toContain(name);
        }
      });
    });
  });

  describe('saveState', () => {
    it('should save state to file as JSON', () => {
      const mockState = createMockPetState();
      const storage = new PetStorage();
      
      storage.saveState(mockState);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockStateFile,
        JSON.stringify(mockState, null, 2),
        'utf8'
      );
    });

    it('should handle write errors gracefully', () => {
      const mockState = createMockPetState();
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error');
      });
      
      const storage = new PetStorage();
      
      expect(() => storage.saveState(mockState)).not.toThrow();
    });

    it('should format JSON with proper indentation', () => {
      const mockState = createMockPetState();
      const storage = new PetStorage();
      
      storage.saveState(mockState);
      
      const expectedJson = JSON.stringify(mockState, null, 2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockStateFile,
        expectedJson,
        'utf8'
      );
    });

    it('should save petName field correctly', () => {
      const mockState = createMockPetState({ petName: 'SavedPetName' });
      const storage = new PetStorage();
      
      storage.saveState(mockState);
      
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsedState = JSON.parse(savedJson);
      
      expect(parsedState.petName).toBe('SavedPetName');
    });
  });

  describe('moveToGraveyard', () => {
    const mockGraveyardDir = '/mock/home/.claude-pet/graveyard';
    const mockPetState = createMockPetState({ petName: 'Fluffy' });

    beforeEach(() => {
      vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
    });

    it('should move pet to graveyard directory', () => {
      let writeFileCalled = false;
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        writeFileCalled = true;
      });
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy') && !path.toString().includes('pet-state.json')) {
          return false; // Graveyard directory doesn't exist initially
        }
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json')) {
          return writeFileCalled; // Graveyard file exists after write
        }
        return true; // Other paths exist
      });
      
      const storage = new PetStorage();
      storage.moveToGraveyard(mockPetState);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.claude-pet/graveyard/Fluffy/pet-state.json',
        JSON.stringify(mockPetState, null, 2),
        'utf8'
      );
    });

    it('should handle same name conflicts with sequential numbering', () => {
      let existsCalls = 0;
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/mock/home/.claude-pet/graveyard/Fluffy') {
          return true; // First directory exists
        }
        if (path === '/mock/home/.claude-pet/graveyard/Fluffy-2') {
          return false; // Second directory doesn't exist
        }
        return true;
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(mockPetState);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.claude-pet/graveyard/Fluffy-2/pet-state.json',
        JSON.stringify(mockPetState, null, 2),
        'utf8'
      );
    });

    it('should sanitize unsafe pet names', () => {
      const unsafePetState = createMockPetState({ petName: '../evil/pet' });
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json')) {
          return true; // Graveyard file exists for verification
        }
        if (path.toString().includes('/graveyard/__evil_pet')) {
          return false; // Graveyard directory doesn't exist initially
        }
        return true; // Other paths exist
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(unsafePetState);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.claude-pet/graveyard/__evil_pet/pet-state.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should handle long pet names by truncating', () => {
      const longName = 'a'.repeat(150);
      const longNamePetState = createMockPetState({ petName: longName });
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json')) {
          return true; // Graveyard file exists for verification
        }
        if (path.toString().includes(`/graveyard/${'a'.repeat(100)}`)) {
          return false; // Graveyard directory doesn't exist initially
        }
        return true; // Other paths exist
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(longNamePetState);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        `/mock/home/.claude-pet/graveyard/${'a'.repeat(100)}/pet-state.json`,
        expect.any(String),
        'utf8'
      );
    });

    it('should create backup and restore on atomic operation failure', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy')) {
          return false; // Graveyard directory doesn't exist initially
        }
        return true; // Other paths exist, including state file
      });
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      const storage = new PetStorage();
      
      expect(() => storage.moveToGraveyard(mockPetState)).toThrow('Graveyard operation failed');
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        mockStateFile,
        expect.stringMatching(/\.backup\.\d+$/)
      );
    });

    it('should remove current state file after successful graveyard save', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy') && !path.toString().includes('pet-state.json')) {
          return false; // Graveyard directory doesn't exist initially
        }
        return true; // Other paths exist, including graveyard file after write
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(mockPetState);

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockStateFile);
    });

    it('should clean up backup file on successful operation', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy') && !path.toString().includes('pet-state.json')) {
          return false; // Graveyard directory doesn't exist initially
        }
        return true; // Other paths exist, including graveyard file after write
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(mockPetState);

      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/\.backup\.\d+$/));
    });

    it('should handle filesystem permission errors gracefully', () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const storage = new PetStorage();
      
      expect(() => storage.moveToGraveyard(mockPetState)).toThrow('Graveyard operation failed');
    });

    it('should verify graveyard file creation', () => {
      let writeFileCalled = false;
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        writeFileCalled = true;
      });
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy') && !path.toString().includes('pet-state.json')) {
          return false; // Graveyard directory doesn't exist initially
        }
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json') && writeFileCalled) {
          return true; // Graveyard file exists after write
        }
        return true; // Other paths exist
      });

      const storage = new PetStorage();
      storage.moveToGraveyard(mockPetState);

      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('graveyard/Fluffy/pet-state.json')
      );
    });

    it('should throw error if graveyard file verification fails', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.toString().includes('/graveyard/Fluffy') && !path.toString().includes('pet-state.json')) {
          return false; // Graveyard directory doesn't exist initially
        }
        if (path.toString().includes('graveyard') && path.toString().includes('pet-state.json')) {
          return false; // Simulate verification failure - graveyard file doesn't exist after write
        }
        return true; // Other paths exist
      });

      const storage = new PetStorage();
      
      expect(() => storage.moveToGraveyard(mockPetState)).toThrow('Failed to verify graveyard file creation');
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory with recursive option', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      new PetStorage();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockPetDir, { recursive: true });
    });

    it('should not create directory if it exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      new PetStorage();
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});