import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService, UserConfig } from '../ConfigService';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('fs');
vi.mock('os');
vi.mock('path');

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);
const mockPath = vi.mocked(path);

describe('ConfigService Display Configuration', () => {
  let configService: ConfigService;
  const mockConfigDir = '/home/user/.claude-pet';
  const mockConfigFile = '/home/user/.claude-pet/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockOs.homedir.mockReturnValue('/home/user');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      colors: {},
      pet: {},
      display: {
        maxLines: 2,
        line2: { enabled: true, items: ['input', 'output'] },
        line3: { enabled: false, items: [] }
      }
    }));

    configService = new ConfigService();
  });

  it('should set maxLines with validation', () => {
    configService.setDisplayConfig('maxLines', '3');
    
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      mockConfigFile,
      expect.stringContaining('"maxLines": 3'),
      'utf8'
    );
  });

  it('should clamp maxLines between 1 and 3', () => {
    // Test upper bound
    configService.setDisplayConfig('maxLines', '5');
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      mockConfigFile,
      expect.stringContaining('"maxLines": 3'),
      'utf8'
    );

    // Test lower bound  
    configService.setDisplayConfig('maxLines', '0');
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      mockConfigFile,
      expect.stringContaining('"maxLines": 1'),
      'utf8'
    );
  });

  it('should set line2.enabled', () => {
    configService.setDisplayConfig('line2.enabled', 'false');
    
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      mockConfigFile,
      expect.stringContaining('"enabled": false'),
      'utf8'
    );
  });

  it('should set line2.items from comma-separated string', () => {
    configService.setDisplayConfig('line2.items', 'input,total');
    
    const writeCall = mockFs.writeFileSync.mock.calls[0];
    const configJson = JSON.parse(writeCall[1] as string);
    
    expect(configJson.display.line2.items).toEqual(['input', 'total']);
  });

  it('should set line2.items from array', () => {
    configService.setDisplayConfig('line2.items', ['cached', 'total']);
    
    const writeCall = mockFs.writeFileSync.mock.calls[0];
    const configJson = JSON.parse(writeCall[1] as string);
    
    expect(configJson.display.line2.items).toEqual(['cached', 'total']);
  });

  it('should set line3 configuration', () => {
    configService.setDisplayConfig('line3.enabled', 'true');
    configService.setDisplayConfig('line3.items', 'total');
    
    const writeCalls = mockFs.writeFileSync.mock.calls;
    const lastConfigJson = JSON.parse(writeCalls[writeCalls.length - 1][1] as string);
    
    expect(lastConfigJson.display.line3.enabled).toBe(true);
    expect(lastConfigJson.display.line3.items).toEqual(['total']);
  });

  it('should merge display config with defaults', () => {
    // Mock partial config
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      colors: { petExpression: '#FF0000' },
      display: {
        line2: { items: ['input'] }
        // Missing other display properties
      }
    }));

    const newConfigService = new ConfigService();
    const config = newConfigService.getConfig();

    expect(config.display.maxLines).toBe(2); // Default
    expect(config.display.line2?.enabled).toBe(true); // Default
    expect(config.display.line2?.items).toEqual(['input']); // User setting
    expect(config.display.line3?.enabled).toBe(false); // Default
  });

  it('should handle completely missing display config', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      colors: {},
      pet: {}
      // No display config at all
    }));

    const newConfigService = new ConfigService();
    const config = newConfigService.getConfig();

    expect(config.display).toEqual({
      maxLines: 2,
      line2: { enabled: true, items: ['input', 'output', 'cached', 'total'] },
      line3: { enabled: false, items: [] }
    });
  });
});