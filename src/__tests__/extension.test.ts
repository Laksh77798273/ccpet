import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeStatusLine } from '../extension';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('ClaudeCodeStatusLine', () => {
  const mockHomedir = '/mock/home';
  const mockPetDir = '/mock/home/.claude-pet';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

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
    it('should initialize with new pet state when no saved state exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const statusLine = new ClaudeCodeStatusLine();
      
      expect(statusLine).toBeInstanceOf(ClaudeCodeStatusLine);
    });

    it('should load saved state when it exists', () => {
      const savedState = {
        energy: 50,
        expression: '(o_o)',
        lastFeedTime: '2025-08-21T10:00:00.000Z',
        totalTokensConsumed: 10
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      expect(fs.readFileSync).toHaveBeenCalledWith(mockStateFile, 'utf8');
      expect(statusLine).toBeInstanceOf(ClaudeCodeStatusLine);
    });

    it('should handle storage errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });
      
      expect(() => new ClaudeCodeStatusLine()).not.toThrow();
    });
  });

  describe('getStatusDisplay', () => {
    it('should return formatted pet display', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      
      expect(display).toBe('(^_^) ██████████');
    });

    it('should return display for saved state', () => {
      const savedState = {
        energy: 50,
        expression: '(o_o)',
        lastFeedTime: new Date().toISOString(), // Use current time to avoid time decay
        totalTokensConsumed: 10
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      
      expect(display).toBe('(o_o) █████░░░░░');
    });
  });

  describe('saveState', () => {
    it('should save current pet state', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const statusLine = new ClaudeCodeStatusLine();
      statusLine.saveState();
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockStateFile,
        expect.stringContaining('"energy": 100'),
        'utf8'
      );
    });

    it('should handle save errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error');
      });
      
      const statusLine = new ClaudeCodeStatusLine();
      
      expect(() => statusLine.saveState()).not.toThrow();
    });
  });
});