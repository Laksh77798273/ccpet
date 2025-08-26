import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetCommand } from '../ResetCommand';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PetStorage } from '../../services/PetStorage';
import { IPetState } from '../../core/IPetState';

// Mock fs module
vi.mock('fs');
vi.mock('path');
vi.mock('os');
vi.mock('../../services/PetStorage');

describe('ResetCommand', () => {
  let resetCommand: ResetCommand;
  let consoleSpy: any;
  let mockProcessExit: any;
  let mockFs: any;
  let mockPath: any;
  let mockOs: any;
  let mockPetStorage: any;

  const mockPetState: IPetState = {
    energy: 100,
    expression: "(^_^)",
    animalType: "cat",
    birthTime: new Date('2023-01-01'),
    lastFeedTime: new Date('2023-01-01'),
    totalTokensConsumed: 1000,
    accumulatedTokens: 1000,
    lastDecayTime: new Date('2023-01-01'),
    petName: "Fluffy"
  };

  beforeEach(() => {
    resetCommand = new ResetCommand();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);
    mockOs = vi.mocked(os);
    mockPetStorage = vi.mocked(PetStorage);

    // Setup default mocks
    mockOs.homedir.mockReturnValue('/home/user');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockFs.existsSync.mockReturnValue(false);
    mockFs.unlinkSync.mockImplementation(() => {});

    // Setup PetStorage mock
    mockPetStorage.prototype.loadState = vi.fn().mockReturnValue(mockPetState);
    mockPetStorage.prototype.moveToGraveyard = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct name and description', () => {
    expect(resetCommand.name).toBe('reset');
    expect(resetCommand.description).toBe('Reset pet to initial state');
  });

  it('should reset all pet state files when they exist', async () => {
    // Mock all files exist
    mockFs.existsSync.mockReturnValue(true);

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should check for all three files
    expect(mockFs.existsSync).toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');
    expect(mockFs.existsSync).toHaveBeenCalledWith('/home/user/.claude-pet/animation-counter.json');
    expect(mockFs.existsSync).toHaveBeenCalledWith('/home/user/.claude-pet/session-tracker.json');

    // Should call PetStorage methods for pet-state.json
    expect(mockPetStorage.prototype.loadState).toHaveBeenCalled();
    expect(mockPetStorage.prototype.moveToGraveyard).toHaveBeenCalledWith(mockPetState);

    // Should remove other files directly
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/animation-counter.json');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/session-tracker.json');

    // Should log graveyard and removal messages
    expect(consoleSpy.log).toHaveBeenCalledWith('🪦 Moved pet "Fluffy" to graveyard');
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed animation-counter.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed session-tracker.json');

    // Should log completion message
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Processed 3 file(s)');
    expect(consoleSpy.log).toHaveBeenCalledWith('🐣 Your pet will be reborn on next use');
  });

  it('should handle when some files exist', async () => {
    // Mock only pet-state.json exists
    mockFs.existsSync.mockImplementation((filepath) => {
      return filepath.includes('pet-state.json');
    });

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should call PetStorage methods for pet-state.json
    expect(mockPetStorage.prototype.loadState).toHaveBeenCalled();
    expect(mockPetStorage.prototype.moveToGraveyard).toHaveBeenCalledWith(mockPetState);

    // Should not call unlinkSync for pet-state.json since it's handled by graveyard
    expect(mockFs.unlinkSync).not.toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');

    // Should log graveyard message
    expect(consoleSpy.log).toHaveBeenCalledWith('🪦 Moved pet "Fluffy" to graveyard');
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Processed 1 file(s)');
  });

  it('should handle invalid pet state file', async () => {
    // Mock pet-state.json exists but loadState returns null
    mockFs.existsSync.mockImplementation((filepath) => {
      return filepath.includes('pet-state.json');
    });
    mockPetStorage.prototype.loadState = vi.fn().mockReturnValue(null);

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should try to load state but fallback to direct deletion
    expect(mockPetStorage.prototype.loadState).toHaveBeenCalled();
    expect(mockPetStorage.prototype.moveToGraveyard).not.toHaveBeenCalled();
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');

    // Should log invalid file removal message
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed invalid pet-state.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Processed 1 file(s)');
  });

  it('should handle graveyard save failure', async () => {
    // Mock pet-state.json exists but graveyard save fails
    mockFs.existsSync.mockImplementation((filepath) => {
      return filepath.includes('pet-state.json');
    });
    mockPetStorage.prototype.moveToGraveyard = vi.fn().mockImplementation(() => {
      throw new Error('Graveyard save failed');
    });

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should try graveyard but fallback to direct deletion
    expect(mockPetStorage.prototype.moveToGraveyard).toHaveBeenCalledWith(mockPetState);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');

    // Should log warning and fallback message
    expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Failed to move to graveyard, removing file:', expect.any(Error));
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed pet-state.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Processed 1 file(s)');
  });

  it('should handle when no files exist', async () => {
    // All files don't exist (default mock behavior)
    mockFs.existsSync.mockReturnValue(false);

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should not remove any files or call graveyard
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    expect(mockPetStorage.prototype.moveToGraveyard).not.toHaveBeenCalled();

    // Should log no files found message
    expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️  No pet state files found to reset');
  });

  it('should handle filesystem errors gracefully', async () => {
    // Mock file exists but unlinkSync throws error for non-pet files
    mockFs.existsSync.mockReturnValue(true);
    mockFs.unlinkSync.mockImplementation((filepath) => {
      if (filepath.includes('animation-counter.json')) {
        throw new Error('Permission denied');
      }
    });

    try {
      await resetCommand.execute([]);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('❌ Failed to reset pet:', 'Permission denied');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });

  it('should handle path errors gracefully', async () => {
    // Mock path.join to throw error
    mockPath.join.mockImplementation(() => {
      throw new Error('Path error');
    });

    try {
      await resetCommand.execute([]);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('❌ Failed to reset pet:', 'Path error');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });
});