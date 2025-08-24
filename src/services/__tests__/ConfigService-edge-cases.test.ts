import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../ConfigService';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock filesystem modules
vi.mock('fs');
vi.mock('path');
vi.mock('os');

describe('ConfigService Edge Cases', () => {
  let configService: ConfigService;
  let mockFs: any;
  let mockPath: any;
  let mockOs: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);
    mockOs = vi.mocked(os);
    
    consoleSpy = {
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };

    // Setup default mocks
    mockOs.homedir.mockReturnValue('/home/user');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.readFileSync.mockReturnValue('{"colors": {}, "pet": {}}');
    mockFs.writeFileSync.mockImplementation(() => {});

    configService = new ConfigService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear cached config
    configService['cachedConfig'] = null;
  });

  describe('loadConfig error handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      mockFs.readFileSync.mockReturnValue('invalid json {');

      const config = configService.loadConfig();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to load config, using defaults:',
        expect.stringContaining('Unexpected')
      );
      
      // Should return default config
      expect(config).toEqual({
        colors: expect.any(Object),
        pet: expect.any(Object)
      });
    });

    it('should handle file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const config = configService.loadConfig();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to load config, using defaults:',
        'Permission denied'
      );
      
      // Should return default config
      expect(config).toEqual({
        colors: expect.any(Object),
        pet: expect.any(Object)
      });
    });

    it('should create config file when it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const config = configService.loadConfig();

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(config).toEqual({
        colors: expect.any(Object),
        pet: expect.any(Object)
      });
    });
  });

  describe('ensureConfigDir error handling', () => {
    it('should propagate directory creation errors', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Cannot create directory');
      });

      // Should throw when directory creation fails
      expect(() => configService['ensureConfigDir']()).toThrow('Cannot create directory');
    });

    it('should not create directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      configService['ensureConfigDir']();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('saveConfig error handling', () => {
    it('should propagate write errors', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const testConfig = {
        colors: { test: 'value' },
        pet: { test: true }
      };

      // Should throw when write fails
      expect(() => configService.saveConfig(testConfig)).toThrow('Write failed');
    });

    it('should propagate directory creation errors during save', () => {
      // Mock directory doesn't exist, so mkdirSync will be called
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('mkdir failed');
      });

      const testConfig = {
        colors: { test: 'value' },
        pet: { test: true }
      };

      // Should throw when directory creation fails
      expect(() => configService.saveConfig(testConfig)).toThrow('mkdir failed');
    });
  });

  describe('mergeWithDefaults', () => {
    it('should handle incomplete config objects', () => {
      const partialConfig = {
        colors: { petExpression: '#FF0000' }
        // Missing pet section
      };

      const merged = configService['mergeWithDefaults'](partialConfig);

      expect(merged.colors.petExpression).toBe('#FF0000');
      expect(merged.pet).toEqual(expect.any(Object));
      expect(merged.pet.animationEnabled).toBeDefined();
    });

    it('should handle empty config objects', () => {
      const emptyConfig = {};

      const merged = configService['mergeWithDefaults'](emptyConfig);

      expect(merged.colors).toEqual(expect.any(Object));
      expect(merged.pet).toEqual(expect.any(Object));
    });

    it('should handle null/undefined values', () => {
      const configWithNulls = {
        colors: {
          petExpression: null,
          energyBar: undefined
        },
        pet: {
          animationEnabled: null
        }
      };

      const merged = configService['mergeWithDefaults'](configWithNulls);

      // Null/undefined values should be preserved (not replaced with defaults)
      expect(merged.colors.petExpression).toBeNull();
      expect(merged.colors.energyBar).toBeUndefined();
      expect(merged.pet.animationEnabled).toBeNull();
    });
  });

  describe('configuration caching', () => {
    it('should return cached config on subsequent calls', () => {
      mockFs.readFileSync.mockReturnValue('{"colors": {"test": "cached"}, "pet": {}}');

      // First call
      const config1 = configService.loadConfig();
      
      // Change the mock return value
      mockFs.readFileSync.mockReturnValue('{"colors": {"test": "different"}, "pet": {}}');
      
      // Second call should return cached version
      const config2 = configService.loadConfig();

      expect(config1).toBe(config2); // Same object reference
      expect(config2.colors.test).toBe('cached');
    });

    it('should update cache when saveConfig is called', () => {
      const newConfig = {
        colors: { test: 'updated' },
        pet: { test: false }
      };

      configService.saveConfig(newConfig);
      const loadedConfig = configService.getConfig();

      expect(loadedConfig).toBe(newConfig); // Same object reference
    });
  });

  describe('path handling', () => {
    it('should propagate path joining errors', () => {
      mockPath.join.mockImplementation(() => {
        throw new Error('Path error');
      });

      // Should throw when path operations fail
      expect(() => new ConfigService()).toThrow('Path error');
    });

    it('should propagate homedir errors', () => {
      mockOs.homedir.mockImplementation(() => {
        throw new Error('Cannot get home directory');
      });

      // Should throw when homedir fails
      expect(() => new ConfigService()).toThrow('Cannot get home directory');
    });
  });

  describe('config validation', () => {
    it('should handle config with extra properties', () => {
      const configWithExtra = {
        colors: { petExpression: '#FF0000' },
        pet: { animationEnabled: true },
        extraSection: { shouldBeIgnored: true }
      };

      const merged = configService['mergeWithDefaults'](configWithExtra);

      // Extra properties should not interfere
      expect(merged.colors).toBeDefined();
      expect(merged.pet).toBeDefined();
      // Extra properties are not preserved in merged config
      expect(merged).not.toHaveProperty('extraSection');
    });

    it('should handle deeply nested properties', () => {
      const configWithDeep = {
        colors: {
          petExpression: '#FF0000',
          nested: {
            deep: {
              value: 'should not break'
            }
          }
        },
        pet: { animationEnabled: true }
      };

      const merged = configService['mergeWithDefaults'](configWithDeep);

      expect(merged.colors.petExpression).toBe('#FF0000');
      expect(merged.colors.nested).toEqual({ deep: { value: 'should not break' } });
    });
  });
});