import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('CLI', () => {
  let consoleSpy: any;
  let mockProcessExit: any;
  let originalArgv: string[];

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Save original argv
    originalArgv = process.argv;
    
    // Reset all mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
  });

  it('should show help when --help is provided', async () => {
    process.argv = ['node', 'cli.js', '--help'];

    // Mock the dependencies
    vi.doMock('../ccpet', () => ({
      main: vi.fn()
    }));
    
    vi.doMock('../commands/CheckCommand', () => ({
      CheckCommand: vi.fn(() => ({ name: 'check', description: 'Mock check', execute: vi.fn() }))
    }));
    
    vi.doMock('../commands/ConfigCommand', () => ({
      ConfigCommand: vi.fn(() => ({ name: 'config', description: 'Mock config', execute: vi.fn() }))
    }));
    
    vi.doMock('../commands/ResetCommand', () => ({
      ResetCommand: vi.fn(() => ({ name: 'reset', description: 'Mock reset', execute: vi.fn() }))
    }));

    const { main } = await import('../cli');
    
    try {
      await main();
    } catch (error) {
      // Should not exit
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('ccpet - Claude Code Pet CLI');
    expect(consoleSpy.log).toHaveBeenCalledWith('Usage: ccpet [command] [options]');
  });

  it('should show help when -h is provided', async () => {
    process.argv = ['node', 'cli.js', '-h'];

    // Mock the dependencies
    vi.doMock('../ccpet', () => ({ main: vi.fn() }));
    vi.doMock('../commands/CheckCommand', () => ({
      CheckCommand: vi.fn(() => ({ name: 'check', description: 'Mock check', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ConfigCommand', () => ({
      ConfigCommand: vi.fn(() => ({ name: 'config', description: 'Mock config', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ResetCommand', () => ({
      ResetCommand: vi.fn(() => ({ name: 'reset', description: 'Mock reset', execute: vi.fn() }))
    }));

    const { main } = await import('../cli');
    
    try {
      await main();
    } catch (error) {
      // Should not exit
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('ccpet - Claude Code Pet CLI');
  });

  it('should handle unknown commands', async () => {
    process.argv = ['node', 'cli.js', 'unknown'];

    // Mock the dependencies
    vi.doMock('../ccpet', () => ({ main: vi.fn() }));
    vi.doMock('../commands/CheckCommand', () => ({
      CheckCommand: vi.fn(() => ({ name: 'check', description: 'Mock check', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ConfigCommand', () => ({
      ConfigCommand: vi.fn(() => ({ name: 'config', description: 'Mock config', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ResetCommand', () => ({
      ResetCommand: vi.fn(() => ({ name: 'reset', description: 'Mock reset', execute: vi.fn() }))
    }));

    const { main } = await import('../cli');
    
    try {
      await main();
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('Unknown command: unknown');
        expect(consoleSpy.error).toHaveBeenCalledWith('Run "ccpet --help" for usage information.');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });

  it('should show version with --version flag', async () => {
    process.argv = ['node', 'cli.js', '--version'];

    // Mock the dependencies
    vi.doMock('../ccpet', () => ({ main: vi.fn() }));
    vi.doMock('../commands/CheckCommand', () => ({
      CheckCommand: vi.fn(() => ({ name: 'check', description: 'Mock check', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ConfigCommand', () => ({
      ConfigCommand: vi.fn(() => ({ name: 'config', description: 'Mock config', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ResetCommand', () => ({
      ResetCommand: vi.fn(() => ({ name: 'reset', description: 'Mock reset', execute: vi.fn() }))
    }));

    const { main } = await import('../cli');
    
    try {
      await main();
    } catch (error) {
      // Should not exit
    }

    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringMatching(/^ccpet v\d+\.\d+\.\d+$/));
  });

  it('should show version with -v flag', async () => {
    process.argv = ['node', 'cli.js', '-v'];

    // Mock the dependencies
    vi.doMock('../ccpet', () => ({ main: vi.fn() }));
    vi.doMock('../commands/CheckCommand', () => ({
      CheckCommand: vi.fn(() => ({ name: 'check', description: 'Mock check', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ConfigCommand', () => ({
      ConfigCommand: vi.fn(() => ({ name: 'config', description: 'Mock config', execute: vi.fn() }))
    }));
    vi.doMock('../commands/ResetCommand', () => ({
      ResetCommand: vi.fn(() => ({ name: 'reset', description: 'Mock reset', execute: vi.fn() }))
    }));

    const { main } = await import('../cli');
    
    try {
      await main();
    } catch (error) {
      // Should not exit
    }

    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringMatching(/^ccpet v\d+\.\d+\.\d+$/));
  });
});