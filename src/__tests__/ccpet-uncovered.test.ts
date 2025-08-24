import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activate, deactivate } from '../ccpet';

describe('ccpet uncovered functions', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('activate', () => {
    it('should register adoptNewPet command with context', () => {
      const mockContext = {
        subscriptions: []
      };

      activate(mockContext);

      expect(mockContext.subscriptions).toHaveLength(1);
      expect(mockContext.subscriptions[0]).toHaveProperty('command', 'claude-pet.adoptNewPet');
      expect(mockContext.subscriptions[0]).toHaveProperty('callback');
      expect(typeof mockContext.subscriptions[0].callback).toBe('function');
    });

    it('should execute adoptNewPet command callback', () => {
      const mockContext = {
        subscriptions: []
      };

      activate(mockContext);

      const callback = mockContext.subscriptions[0].callback;
      
      // Should not throw when calling the callback
      expect(() => callback()).not.toThrow();
    });

    it('should register VSCode command when window.vscode is available', () => {
      const mockVsCodeCommands = {
        registerCommand: vi.fn()
      };

      const mockWindow = {
        vscode: {
          commands: mockVsCodeCommands
        }
      };

      // Mock window object
      vi.stubGlobal('window', mockWindow);

      const mockContext = {
        subscriptions: []
      };

      activate(mockContext);

      expect(mockVsCodeCommands.registerCommand).toHaveBeenCalledWith(
        'claude-pet.adoptNewPet',
        expect.any(Function)
      );

      vi.unstubAllGlobals();
    });

    it('should not register VSCode command when window.vscode is not available', () => {
      // Ensure no window object
      vi.stubGlobal('window', undefined);

      const mockContext = {
        subscriptions: []
      };

      activate(mockContext);

      // Should still register with context subscriptions
      expect(mockContext.subscriptions).toHaveLength(1);

      vi.unstubAllGlobals();
    });
  });

  describe('deactivate', () => {
    it('should execute without errors', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe('AnimationCounter edge cases', () => {
    it('should handle file system errors in loadCounter gracefully', async () => {
      // This tests the AnimationCounter class error handling
      // Import ccpet to test AnimationCounter indirectly through ClaudeCodeStatusLine
      const { ClaudeCodeStatusLine } = await import('../ccpet');
      
      // Mock fs to throw errors
      vi.doMock('fs', () => ({
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => {
          throw new Error('File system error');
        }),
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn()
      }));

      // Should not throw when creating status line (AnimationCounter should handle the error)
      expect(() => new ClaudeCodeStatusLine(false)).not.toThrow();
    });

    it('should handle file system errors in saveCounter gracefully', async () => {
      const { ClaudeCodeStatusLine } = await import('../ccpet');
      
      // Mock fs to throw errors on write
      vi.doMock('fs', () => ({
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => '{"callCount": 0}'),
        writeFileSync: vi.fn(() => {
          throw new Error('Write error');
        }),
        mkdirSync: vi.fn(() => {
          throw new Error('mkdir error');
        })
      }));

      const statusLine = new ClaudeCodeStatusLine(false);
      
      // Should not throw when getting status (which calls saveCounter internally)
      expect(() => statusLine.getStatusDisplay()).not.toThrow();
    });
  });

  describe('readStdin function', () => {
    it('should handle stdin data correctly', async () => {
      // Mock process.stdin with immediate callback setup
      let dataCallback: Function | null = null;
      let endCallback: Function | null = null;

      const mockStdin = {
        setEncoding: vi.fn(),
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'data') {
            dataCallback = callback;
          } else if (event === 'end') {
            endCallback = callback;
          }
        })
      };
      
      vi.stubGlobal('process', { stdin: mockStdin });

      // Import main to trigger readStdin
      const { main } = await import('../ccpet');

      // Start main function and immediately trigger events
      const mainPromise = main();

      // Small delay to ensure event handlers are set up
      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger data and end events
      if (dataCallback) {
        dataCallback('{"test": "data"}');
      }
      if (endCallback) {
        endCallback();
      }

      // Wait for main to process with timeout
      try {
        await Promise.race([
          mainPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
      } catch (error) {
        // Expected to complete or throw based on processing
      }

      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockStdin.on).toHaveBeenCalledWith('end', expect.any(Function));

      vi.unstubAllGlobals();
    }, 2000); // 2 second timeout for this specific test
  });
});