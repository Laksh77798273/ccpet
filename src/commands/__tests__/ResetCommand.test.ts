import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetCommand } from '../ResetCommand';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fs module
vi.mock('fs');
vi.mock('path');
vi.mock('os');

describe('ResetCommand', () => {
  let resetCommand: ResetCommand;
  let consoleSpy: any;
  let mockProcessExit: any;
  let mockFs: any;
  let mockPath: any;
  let mockOs: any;

  beforeEach(() => {
    resetCommand = new ResetCommand();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);
    mockOs = vi.mocked(os);

    // Setup default mocks
    mockOs.homedir.mockReturnValue('/home/user');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockFs.existsSync.mockReturnValue(false);
    mockFs.unlinkSync.mockImplementation(() => {});
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

    // Should remove all files
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/animation-counter.json');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/session-tracker.json');

    // Should log removal messages
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed pet-state.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed animation-counter.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed session-tracker.json');

    // Should log completion message
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Removed 3 state file(s)');
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

    // Should only remove the existing file
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/home/user/.claude-pet/pet-state.json');
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);

    // Should log only one removal message
    expect(consoleSpy.log).toHaveBeenCalledWith('🗑️  Removed pet-state.json');
    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Pet reset complete! Removed 1 state file(s)');
  });

  it('should handle when no files exist', async () => {
    // All files don't exist (default mock behavior)
    mockFs.existsSync.mockReturnValue(false);

    try {
      await resetCommand.execute([]);
    } catch (error) {
      // Should not exit on success
    }

    // Should not remove any files
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();

    // Should log no files found message
    expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️  No pet state files found to reset');
  });

  it('should handle filesystem errors gracefully', async () => {
    // Mock file exists but unlinkSync throws error
    mockFs.existsSync.mockReturnValue(true);
    mockFs.unlinkSync.mockImplementation(() => {
      throw new Error('Permission denied');
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