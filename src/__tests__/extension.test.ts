import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeStatusLine } from '../extension';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

// Mock JSONL processing utility
vi.mock('../utils/jsonl', () => ({
  getTokenMetrics: vi.fn(() => Promise.resolve({
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150
  }))
}));

describe('ClaudeCodeStatusLine', () => {
  const mockHomedir = '/mock/home';
  const mockPetDir = '/mock/home/.claude-pet';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

  const mockClaudeCodeInput = {
    hook_event_name: 'user-prompt-submit',
    session_id: 'test-session',
    transcript_path: '/mock/transcript.jsonl',
    cwd: '/mock/cwd',
    model: {
      id: 'claude-3-5-sonnet-20241022',
      display_name: 'Claude 3.5 Sonnet'
    },
    workspace: {
      current_dir: '/mock/current',
      project_dir: '/mock/project'
    },
    version: '1.0.0',
    output_style: {
      name: 'default'
    },
    cost: {
      total_cost_usd: 0.01,
      total_duration_ms: 1000,
      total_api_duration_ms: 800,
      total_lines_added: 10,
      total_lines_removed: 5
    }
  };

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
      // Use future time to avoid any time decay
      const futureTime = new Date(Date.now() + 60000); // 1 minute later
      const savedState = {
        energy: 50,
        expression: '(o_o)',
        lastFeedTime: futureTime.toISOString(),
        totalTokensConsumed: 10
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      
      expect(display).toBe('(o_o) █████░░░░░');
    });
  });

  describe('processTokensAndGetStatusDisplay', () => {
    it('should process tokens from Claude Code input and increase pet energy', async () => {
      // Arrange - Start with low energy pet
      const initialState = {
        energy: 30,
        expression: '(o_o)',
        lastFeedTime: new Date().toISOString(),
        totalTokensConsumed: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      // Act - Process tokens (150 total tokens * 0.1 = 15 energy)
      const display = await statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput);
      
      // Assert - Energy should increase from 30 to 45 (30 + 15)
      expect(display).toBe('(o_o) █████░░░░░'); // 45% energy (rounded to 5 bars)
    });

    it('should handle token processing errors gracefully', async () => {
      const { getTokenMetrics } = await import('../utils/jsonl');
      vi.mocked(getTokenMetrics).mockRejectedValueOnce(new Error('JSONL processing error'));
      
      // Use future time to avoid time decay
      const futureTime = new Date(Date.now() + 60000); // 1 minute later
      const initialState = {
        energy: 100,
        expression: '(^_^)',
        lastFeedTime: futureTime.toISOString(),
        totalTokensConsumed: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      // Act & Assert - Should not throw and return current state
      await expect(statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput))
        .resolves.toBe('(^_^) ██████████');
    });

    it('should not feed pet when no tokens are detected', async () => {
      const { getTokenMetrics } = await import('../utils/jsonl');
      vi.mocked(getTokenMetrics).mockResolvedValueOnce({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      });

      const initialState = {
        energy: 50,
        expression: '(o_o)',
        lastFeedTime: new Date().toISOString(),
        totalTokensConsumed: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      // Act
      const display = await statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput);
      
      // Assert - No energy change
      expect(display).toBe('(o_o) █████░░░░░'); // Still 50% energy
    });

    it('should cap energy at 100 when adding tokens', async () => {
      const { getTokenMetrics } = await import('../utils/jsonl');
      vi.mocked(getTokenMetrics).mockResolvedValueOnce({
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000 // This would add 200 energy
      });

      const initialState = {
        energy: 95,
        expression: '(^_^)',
        lastFeedTime: new Date().toISOString(),
        totalTokensConsumed: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      // Act
      const display = await statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput);
      
      // Assert - Energy should be capped at 100
      expect(display).toBe('(^_^) ██████████'); // 100% energy
    });
  });

  describe('saveState', () => {
    it('should save pet state', () => {
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

  describe('JSONL integration', () => {
    it('should call getTokenMetrics with correct transcript path', async () => {
      const { getTokenMetrics } = await import('../utils/jsonl');
      
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const statusLine = new ClaudeCodeStatusLine();
      
      await statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput);
      
      expect(getTokenMetrics).toHaveBeenCalledWith('/mock/transcript.jsonl');
    });

    it('should convert tokens to energy using correct ratio', async () => {
      const { getTokenMetrics } = await import('../utils/jsonl');
      vi.mocked(getTokenMetrics).mockResolvedValueOnce({
        inputTokens: 50,
        outputTokens: 50,
        totalTokens: 100 // Should add 10 energy (100 * 0.1)
      });

      // Use future time to avoid time decay
      const futureTime = new Date(Date.now() + 60000); // 1 minute later
      const initialState = {
        energy: 40,
        expression: '(o_o)',
        lastFeedTime: futureTime.toISOString(),
        totalTokensConsumed: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialState));
      
      const statusLine = new ClaudeCodeStatusLine();
      
      // Act
      const display = await statusLine.processTokensAndGetStatusDisplay(mockClaudeCodeInput);
      
      // Assert - Energy should increase from 40 to 50 (40 + 10)
      expect(display).toBe('(o_o) █████░░░░░'); // 50% energy
    });
  });
});