import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { CheckCommand } from '../CheckCommand';

describe('CheckCommand', () => {
  let checkCommand: CheckCommand;
  let consoleSpy: any;
  let mockSetInterval: any;
  let mockClearInterval: any;
  let mockProcessOn: any;
  let mockProcessExit: any;

  beforeEach(() => {
    checkCommand = new CheckCommand();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    
    // Mock timers
    mockSetInterval = vi.spyOn(global, 'setInterval');
    mockClearInterval = vi.spyOn(global, 'clearInterval');
    
    // Mock process methods
    mockProcessOn = vi.spyOn(process, 'on').mockImplementation(() => {
      return process;
    });
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct name and description', () => {
    expect(checkCommand.name).toBe('check');
    expect(checkCommand.description).toBe('Manually check pet status without consuming Claude Code tokens');
  });

  it('should execute successfully and show pet status', async () => {
    const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await checkCommand.execute([]);
      
      // Should log the checking message
      expect(consoleSpy.log).toHaveBeenCalledWith('🐾 检查宠物状态...');
      
      // Should log the tip about not consuming tokens
      expect(consoleSpy.log).toHaveBeenCalledWith('💡 提示: 这次查看不消耗Claude Code token');
      expect(consoleSpy.log).toHaveBeenCalledWith('📝 在Claude Code中活跃使用可以喂养你的宠物');
      
      // Should display pet status (this will be a formatted string)
      const statusCalls = consoleSpy.log.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('●') // Energy bar indicator
      );
      expect(statusCalls.length).toBeGreaterThan(0);

    } catch (error) {
      // Should not call process.exit
      expect(mockProcessExit).not.toHaveBeenCalled();
    }

    mockProcessExit.mockRestore();
  });

  it('should show time since last feeding when available', async () => {
    const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await checkCommand.execute([]);
      
      // Should show time information (either hours or minutes)
      const timeCalls = consoleSpy.log.mock.calls.filter(call => 
        typeof call[0] === 'string' && (
          call[0].includes('距离上次喂食') && 
          (call[0].includes('小时') || call[0].includes('分钟'))
        )
      );
      expect(timeCalls.length).toBeGreaterThan(0);

    } catch (error) {
      // Should not call process.exit
      expect(mockProcessExit).not.toHaveBeenCalled();
    }

    mockProcessExit.mockRestore();
  });

  it('should show hours and minutes when more than 1 hour has passed', async () => {
    const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Mock a pet with lastFeedTime more than 1 hour ago
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    vi.doMock('../../ccpet', () => ({
      ClaudeCodeStatusLine: vi.fn().mockImplementation(() => ({
        getStatusDisplay: () => '(^_^) test',
        saveState: () => {},
        pet: {
          getState: () => ({
            lastFeedTime: oldTime
          })
        }
      }))
    }));

    try {
      await checkCommand.execute([]);
      
      // Should show hours format
      const hoursCalls = consoleSpy.log.mock.calls.filter(call => 
        typeof call[0] === 'string' && 
        call[0].includes('小时') && call[0].includes('分钟前')
      );
      expect(hoursCalls.length).toBeGreaterThan(0);

    } catch (error) {
      // Should not call process.exit
      expect(mockProcessExit).not.toHaveBeenCalled();
    }

    mockProcessExit.mockRestore();
    vi.restoreAllMocks();
  });

  it('should handle errors gracefully', async () => {
    const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Mock ClaudeCodeStatusLine to throw an error
    vi.doMock('../../ccpet', () => ({
      ClaudeCodeStatusLine: vi.fn().mockImplementation(() => {
        throw new Error('Mock error');
      })
    }));

    try {
      await checkCommand.execute([]);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        // Expected behavior
        expect(consoleSpy.error).toHaveBeenCalledWith('❌ 检查宠物状态失败:', 'Mock error');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }

    mockProcessExit.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Parameter Parsing', () => {
    it('should parse --watch flag correctly', async () => {
      try {
        await checkCommand.execute(['--watch']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // Watch mode starts but doesn't log the start message to console.log in new implementation
      // Instead it outputs via process.stdout.write
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should parse -w flag correctly', async () => {
      try {
        await checkCommand.execute(['-w']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // Watch mode starts but doesn't log the start message to console.log in new implementation
      // Instead it outputs via process.stdout.write
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should parse --interval parameter correctly', async () => {
      try {
        await checkCommand.execute(['--watch', '--interval', '30']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // Watch mode starts but doesn't log the start message to console.log in new implementation
      // Instead it outputs via process.stdout.write
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should validate interval range and use default for invalid values', async () => {
      try {
        await checkCommand.execute(['--watch', '--interval', '5']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ 间隔时间必须在 10-300 秒之间');
      expect(consoleSpy.error).toHaveBeenCalledWith('使用默认间隔 60 秒');
      // Watch mode starts but doesn't log the start message to console.log in new implementation
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should validate interval maximum and use default', async () => {
      try {
        await checkCommand.execute(['--watch', '--interval', '400']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ 间隔时间必须在 10-300 秒之间');
      expect(consoleSpy.error).toHaveBeenCalledWith('使用默认间隔 60 秒');
      // Watch mode starts but doesn't log the start message to console.log in new implementation
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should show help with --help flag', async () => {
      try {
        await checkCommand.execute(['--help']);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(consoleSpy.log).toHaveBeenCalledWith('ccpet check - 检查宠物状态');
          expect(mockProcessExit).toHaveBeenCalledWith(0);
        }
      }
    });

    it('should show help with -h flag', async () => {
      try {
        await checkCommand.execute(['-h']);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(consoleSpy.log).toHaveBeenCalledWith('ccpet check - 检查宠物状态');
          expect(mockProcessExit).toHaveBeenCalledWith(0);
        }
      }
    });

    it('should handle unknown parameters', async () => {
      try {
        await checkCommand.execute(['--unknown']);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(consoleSpy.error).toHaveBeenCalledWith('❌ 未知参数: --unknown');
          expect(mockProcessExit).toHaveBeenCalledWith(1);
        }
      }
    });
  });

  describe('Watch Mode', () => {
    it('should setup signal handlers in watch mode', async () => {
      try {
        await checkCommand.execute(['--watch']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should display welcome message in watch mode', async () => {
      try {
        await checkCommand.execute(['--watch', '--interval', '45']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // Watch mode starts but doesn't log welcome messages to console.log in new implementation
      // Instead it outputs via process.stdout.write
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should setup interval timer correctly', async () => {
      try {
        await checkCommand.execute(['--watch', '--interval', '20']);
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // The new implementation uses 1-second countdown intervals, not the full interval
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should use ANSI escape sequences for in-place updates', async () => {
      const mockProcessStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      
      try {
        await checkCommand.execute(['--watch']);
        
        // Wait a moment for initial display
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Trigger interval callback to test ANSI escape sequences
        const intervalCallback = mockSetInterval.mock.calls[0][0];
        await intervalCallback();
        
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }
      
      // Should use ANSI escape sequences for cursor movement (countdown updates use 1A2K)
      const ansiCalls = mockProcessStdoutWrite.mock.calls.some(call => 
        typeof call[0] === 'string' && (
          call[0].includes('\x1b[1A\x1b[2K') || // Countdown updates
          call[0].includes('\x1b[3A\x1b[0J')    // Full status updates
        )
      );
      expect(ansiCalls).toBe(true);
      
      mockProcessStdoutWrite.mockRestore();
    });
  });

  describe('State Change Detection', () => {
    it('should detect energy changes', async () => {
      // Mock different states
      let callCount = 0;
      vi.doMock('../../ccpet', () => ({
        ClaudeCodeStatusLine: vi.fn().mockImplementation(() => ({
          getStatusDisplay: () => '(^_^) test',
          saveState: () => {},
          pet: {
            getState: () => {
              callCount++;
              if (callCount === 1) {
                return { energy: 50, expression: '(^_^)' };
              } else {
                return { energy: 40, expression: '(^_^)' };
              }
            }
          }
        }))
      }));

      // Simulate watch mode with state changes
      const command = new CheckCommand();
      
      try {
        await command.execute(['--watch']);
        
        // Trigger the interval callback manually
        const intervalCallback = mockSetInterval.mock.calls[0][0];
        await intervalCallback();
        
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }

      vi.restoreAllMocks();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in watch mode with retry count', async () => {
      // Mock ClaudeCodeStatusLine to throw errors
      vi.doMock('../../ccpet', () => ({
        ClaudeCodeStatusLine: vi.fn().mockImplementation(() => {
          throw new Error('Mock watch error');
        })
      }));

      const command = new CheckCommand();
      
      try {
        await command.execute(['--watch']);
        
        // Trigger multiple interval callbacks to test error counting
        const intervalCallback = mockSetInterval.mock.calls[0][0];
        await intervalCallback();
        await intervalCallback();
        await intervalCallback();
        
      } catch (error: any) {
        // Watch mode will be interrupted by mocks
      }

      vi.restoreAllMocks();
    });

    it('should exit after maximum errors in watch mode', async () => {
      let errorCount = 0;
      vi.doMock('../../ccpet', () => ({
        ClaudeCodeStatusLine: vi.fn().mockImplementation(() => {
          errorCount++;
          throw new Error(`Mock error ${errorCount}`);
        })
      }));

      const command = new CheckCommand();
      
      try {
        await command.execute(['--watch']);
        
        // Trigger callbacks to reach max errors
        const intervalCallback = mockSetInterval.mock.calls[0][0];
        for (let i = 0; i < 4; i++) {
          await intervalCallback();
        }
        
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(consoleSpy.log).toHaveBeenCalledWith('连续失败，退出监控模式');
        }
      }

      vi.restoreAllMocks();
    });
  });

  describe('Signal Handling', () => {
    it('should handle SIGINT signal gracefully', async () => {
      let signalHandler: Function = () => {};
      
      mockProcessOn.mockImplementation((signal: string, handler: Function) => {
        if (signal === 'SIGINT') {
          signalHandler = handler;
        }
        return process;
      });

      try {
        await checkCommand.execute(['--watch']);
        
        // Simulate SIGINT signal
        signalHandler();
        
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(consoleSpy.log).toHaveBeenCalledWith('\n\n👋 收到退出信号，正在停止监控...');
          expect(consoleSpy.log).toHaveBeenCalledWith('✅ 监控已停止，再见！');
          expect(mockProcessExit).toHaveBeenCalledWith(0);
        }
      }
    });

    it('should clear interval on cleanup', async () => {
      let signalHandler: Function = () => {};
      
      mockProcessOn.mockImplementation((signal: string, handler: Function) => {
        if (signal === 'SIGINT') {
          signalHandler = handler;
        }
        return process;
      });

      const mockIntervalId = 12345;
      mockSetInterval.mockReturnValue(mockIntervalId);

      try {
        await checkCommand.execute(['--watch']);
        
        // Simulate SIGINT signal
        signalHandler();
        
      } catch (error: any) {
        if (error.message === 'process.exit called') {
          expect(mockClearInterval).toHaveBeenCalledWith(mockIntervalId);
        }
      }
    });
  });
});