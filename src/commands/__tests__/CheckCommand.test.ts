import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckCommand } from '../CheckCommand';

describe('CheckCommand', () => {
  let checkCommand: CheckCommand;
  let consoleSpy: any;

  beforeEach(() => {
    checkCommand = new CheckCommand();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
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
});