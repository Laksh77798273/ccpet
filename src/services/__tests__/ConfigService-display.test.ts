import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService, UserConfig } from '../ConfigService';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem operations
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('ConfigService Display Configuration', () => {
  let configService: ConfigService;

  beforeEach(() => {
    // Setup mocks
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
    vi.mocked(path.join).mockImplementation((...paths) => paths.join('/'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    
    configService = new ConfigService();
    // Clear any cached config to ensure fresh state for each test
    (configService as any).cachedConfig = null;
  });

  it('should set maxLines with validation', () => {
    configService.setDisplayConfig('maxLines', '3');
    
    const config = configService.getConfig();
    
    expect(config.display.maxLines).toBe(3);
  });

  it('should clamp maxLines between 1 and 3', () => {
    // Test upper bound
    configService.setDisplayConfig('maxLines', '5');
    
    const config = configService.getConfig();
    
    expect(config.display.maxLines).toBe(3);

    // Test lower bound  
    configService.setDisplayConfig('maxLines', '0');
    
    const config2 = configService.getConfig();
    
    expect(config2.display.maxLines).toBe(1);
  });

  it('should set line2.enabled', () => {
    configService.setDisplayConfig('line2.enabled', false);
    
    const config = configService.getConfig();
    
    expect(config.display.line2?.enabled).toBe(false);
  });

  it('should set line2.items from comma-separated string', () => {
    configService.setDisplayConfig('line2.items', 'input,total');
    
    const config = configService.getConfig();
    
    expect(config.display.line2?.items).toEqual(['input', 'total']);
  });

  it('should set line2.items from array', () => {
    configService.setDisplayConfig('line2.items', ['cached', 'total']);
    
    const config = configService.getConfig();
    
    expect(config.display.line2?.items).toEqual(['cached', 'total']);
  });

  it('should set line3 configuration', () => {
    configService.setDisplayConfig('line3.enabled', true);
    configService.setDisplayConfig('line3.items', 'total');
    
    const config = configService.getConfig();
    
    expect(config.display.line3?.enabled).toBe(true);
    expect(config.display.line3?.items).toEqual(['total']);
  });

  it('should merge display config with defaults', () => {
    // Test mergeWithDefaults method directly
    const partialConfig = {
      colors: { petExpression: '#FF0000' },
      display: {
        line2: { items: ['input'] }
        // Missing other display properties
      }
    };

    const merged = (configService as any).mergeWithDefaults(partialConfig);

    expect(merged.display.maxLines).toBe(3); // Default
    expect(merged.display.line2?.enabled).toBe(true); // Default
    expect(merged.display.line2?.items).toEqual(['input']); // User setting
    expect(merged.display.line3?.enabled).toBe(true); // Default
  });

  it('should handle completely missing display config', () => {
    const configWithoutDisplay = {
      colors: {},
      pet: {}
      // No display config at all
    };

    const merged = (configService as any).mergeWithDefaults(configWithoutDisplay);

    expect(merged.display).toEqual({
      maxLines: 3,
      line1: { enabled: true, items: ['expression', 'energy-bar', 'energy-value', 'accumulated-tokens', 'lifetime-tokens'] },
      line2: { enabled: true, items: ['input', 'output', 'cached', 'total'] },
      line3: { enabled: true, items: ['context-length', 'context-percentage', 'context-percentage-usable', 'cost'] }
    });
  });

  // Line1 configuration tests
  it('should set line1.enabled', () => {
    configService.setDisplayConfig('line1.enabled', false);
    
    const config = configService.getConfig();
    
    expect(config.display.line1?.enabled).toBe(false);
  });

  it('should set line1.items from comma-separated string with validation', () => {
    configService.setDisplayConfig('line1.items', 'expression,energy-bar,invalid-item');
    
    const config = configService.getConfig();
    
    // Should only include valid items
    expect(config.display.line1?.items).toEqual(['expression', 'energy-bar']);
  });

  it('should set line1.items from array with validation', () => {
    configService.setDisplayConfig('line1.items', ['energy-value', 'accumulated-tokens', 'invalid-item']);
    
    const config = configService.getConfig();
    
    expect(config.display.line1?.items).toEqual(['energy-value', 'accumulated-tokens']);
  });

  it('should fallback to default when all line1.items are invalid', () => {
    configService.setDisplayConfig('line1.items', ['invalid1', 'invalid2']);
    
    const config = configService.getConfig();
    
    expect(config.display.line1?.items).toEqual(['expression', 'energy-bar', 'energy-value', 'accumulated-tokens', 'lifetime-tokens']);
  });

  it('should support pet-name item for future story', () => {
    configService.setDisplayConfig('line1.items', ['expression', 'pet-name']);
    
    const config = configService.getConfig();
    
    expect(config.display.line1?.items).toEqual(['expression', 'pet-name']);
  });

  it('should merge line1 config with defaults when partially defined', () => {
    // Test mergeWithDefaults method directly
    const partialConfig = {
      colors: { petExpression: '#FF0000' },
      display: {
        line1: { items: ['expression'] }
        // Missing enabled property and other display properties
      }
    };

    const merged = (configService as any).mergeWithDefaults(partialConfig);

    expect(merged.display.line1?.enabled).toBe(true); // Default
    expect(merged.display.line1?.items).toEqual(['expression']); // User setting
    expect(merged.display.line2?.enabled).toBe(true); // Default
    expect(merged.display.line3?.enabled).toBe(true); // Default
  });
});