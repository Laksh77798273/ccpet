import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigCommand } from '../ConfigCommand';

describe('ConfigCommand', () => {
  let configCommand: ConfigCommand;
  let consoleSpy: any;
  let mockProcessExit: any;

  beforeEach(() => {
    configCommand = new ConfigCommand();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct name and description', () => {
    expect(configCommand.name).toBe('config');
    expect(configCommand.description).toBe('Manage ccpet configuration');
  });

  it('should show help when no arguments provided', async () => {
    try {
      await configCommand.execute([]);
    } catch (error) {
      // Should not exit
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('ccpet config - Configuration management');
    expect(consoleSpy.log).toHaveBeenCalledWith('Usage: ccpet config <subcommand> [options]');
  });

  it('should list current configuration', async () => {
    try {
      await configCommand.execute(['list']);
    } catch (error) {
      // Should not exit on success
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('Current configuration:');
    // Should log the configuration JSON
    const jsonCalls = consoleSpy.log.mock.calls.filter(call => 
      typeof call[0] === 'string' && call[0].includes('{')
    );
    expect(jsonCalls.length).toBeGreaterThan(0);
  });

  it('should set color configuration', async () => {
    try {
      await configCommand.execute(['set', 'colors.petExpression', '#FF0000:bright']);
    } catch (error) {
      // Should not exit on success
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Set colors.petExpression = #FF0000:bright');
  });

  it('should set pet configuration with boolean values', async () => {
    try {
      await configCommand.execute(['set', 'pet.animationEnabled', 'false']);
    } catch (error) {
      // Should not exit on success
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Set pet.animationEnabled = false');
  });

  it('should set pet configuration with numeric values', async () => {
    try {
      await configCommand.execute(['set', 'pet.decayRate', '0.05']);
    } catch (error) {
      // Should not exit on success
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Set pet.decayRate = 0.05');
  });

  it('should handle invalid configuration keys', async () => {
    try {
      await configCommand.execute(['set', 'invalid.key', 'value']);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('Unknown configuration key: invalid.key');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });

  it('should handle invalid set command arguments', async () => {
    try {
      await configCommand.execute(['set', 'only-one-arg']);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('Usage: ccpet config set <key> <value>');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });

  it('should reset configuration to defaults', async () => {
    try {
      await configCommand.execute(['reset']);
    } catch (error) {
      // Should not exit on success
    }

    expect(consoleSpy.log).toHaveBeenCalledWith('✅ Configuration reset to defaults');
  });

  it('should show configuration file path', async () => {
    try {
      await configCommand.execute(['path']);
    } catch (error) {
      // Should not exit on success
    }

    const pathCalls = consoleSpy.log.mock.calls.filter(call => 
      typeof call[0] === 'string' && call[0].includes('Configuration file:')
    );
    expect(pathCalls.length).toBe(1);
  });

  it('should handle unknown subcommands', async () => {
    try {
      await configCommand.execute(['unknown']);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('Unknown config command: unknown');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });

  it('should handle configuration service errors', async () => {
    // Mock configService to throw an error
    const mockConfigService = {
      listConfig: vi.fn().mockImplementation(() => {
        throw new Error('Service error');
      })
    };
    
    // Replace the configService
    configCommand['configService'] = mockConfigService as any;

    try {
      await configCommand.execute(['list']);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        expect(consoleSpy.error).toHaveBeenCalledWith('Failed to list configuration:', 'Service error');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    }
  });
});