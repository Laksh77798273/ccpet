import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PetStorage } from '../PetStorage';
import { IPetState } from '../../core/Pet';
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
    energy: 75,
    expression: '(^_^)',
    lastFeedTime: new Date('2025-08-21T12:00:00.000Z'),
    totalTokensConsumed: 5,
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
      
      expect(result).toEqual(mockState);
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