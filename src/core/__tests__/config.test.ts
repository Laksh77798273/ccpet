import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('config.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  it('should use ConfigService colors when available', async () => {
    // Mock ConfigService to work normally
    vi.doMock('../../services/ConfigService', () => ({
      ConfigService: vi.fn().mockImplementation(() => ({
        getConfig: () => ({
          colors: {
            petExpression: '#FF0000:bright:bold',
            energyBar: '#0000FF',
            energyValue: '#00FF00',
            accumulatedTokens: '#FFFF00',
            lifetimeTokens: '#FF00FF',
            sessionInput: '#00FFFF',
            sessionOutput: '#FF8000',
            sessionCached: '#800080',
            sessionTotal: '#808080'
          }
        })
      }))
    }));

    const { PET_CONFIG } = await import('../config');

    // Colors are processed into ANSI escape sequences, could be RGB or 256-color
    expect(PET_CONFIG.COLORS.PET_EXPRESSION).toMatch(/\u001b\[1m\u001b\[38;(2;255;0;0|5;9)m/);
    expect(PET_CONFIG.COLORS.ENERGY_BAR).toMatch(/\u001b\[38;(2;0;0;255|5;12)m/);
    expect(PET_CONFIG.COLORS.ENERGY_VALUE).toMatch(/\u001b\[38;(2;0;255;0|5;10)m/);
    expect(PET_CONFIG.COLORS.ACCUMULATED_TOKENS).toMatch(/\u001b\[38;(2;255;255;0|5;11)m/);
    expect(PET_CONFIG.COLORS.LIFETIME_TOKENS).toMatch(/\u001b\[38;(2;255;0;255|5;13)m/);
    expect(PET_CONFIG.COLORS.RESET).toBe('\u001b[0m');
  });

  it('should use fallback colors when ConfigService constructor throws error', async () => {
    // Mock ConfigService constructor to throw an error
    vi.doMock('../../services/ConfigService', () => ({
      ConfigService: vi.fn().mockImplementation(() => {
        throw new Error('Config service failed');
      })
    }));

    const { PET_CONFIG } = await import('../config');

    // Should use the fallback defaults from the catch block - could be RGB or 256-color
    expect(PET_CONFIG.COLORS.PET_EXPRESSION).toMatch(/\u001b\[1m\u001b\[38;(2;255;255;0|5;11)m/);
    expect(PET_CONFIG.COLORS.ENERGY_BAR).toMatch(/\u001b\[38;(2;0;255;0|5;10)m/);
    expect(PET_CONFIG.COLORS.ENERGY_VALUE).toMatch(/\u001b\[38;(2;0;255;255|5;14)m/);
    expect(PET_CONFIG.COLORS.ACCUMULATED_TOKENS).toMatch(/\u001b\[38;(2;119;136;153|5;103)m/);
    expect(PET_CONFIG.COLORS.LIFETIME_TOKENS).toMatch(/\u001b\[38;(2;255;0;255|5;13)m/);
    expect(PET_CONFIG.COLORS.RESET).toBe('\u001b[0m');
  });

  it('should use fallback colors when ConfigService.getConfig throws error', async () => {
    // Mock ConfigService where getConfig method throws
    vi.doMock('../../services/ConfigService', () => ({
      ConfigService: vi.fn().mockImplementation(() => ({
        getConfig: () => {
          throw new Error('getConfig failed');
        }
      }))
    }));

    const { PET_CONFIG } = await import('../config');

    // Should use the fallback defaults from the catch block - could be RGB or 256-color
    expect(PET_CONFIG.COLORS.PET_EXPRESSION).toMatch(/\u001b\[1m\u001b\[38;(2;255;255;0|5;11)m/);
    expect(PET_CONFIG.COLORS.ENERGY_BAR).toMatch(/\u001b\[38;(2;0;255;0|5;10)m/);
    expect(PET_CONFIG.COLORS.ENERGY_VALUE).toMatch(/\u001b\[38;(2;0;255;255|5;14)m/);
    expect(PET_CONFIG.COLORS.ACCUMULATED_TOKENS).toMatch(/\u001b\[38;(2;119;136;153|5;103)m/);
    expect(PET_CONFIG.COLORS.LIFETIME_TOKENS).toMatch(/\u001b\[38;(2;255;0;255|5;13)m/);
  });

  it('should handle missing color properties with defaults', async () => {
    // Mock ConfigService with incomplete config
    vi.doMock('../../services/ConfigService', () => ({
      ConfigService: vi.fn().mockImplementation(() => ({
        getConfig: () => ({
          colors: {
            petExpression: '#FF0000',
            // Missing other properties will use the || fallbacks
          }
        })
      }))
    }));

    const { PET_CONFIG } = await import('../config');

    expect(PET_CONFIG.COLORS.PET_EXPRESSION).toMatch(/\u001b\[38;(2;255;0;0|5;9)m/);
    // Should use fallback for missing properties (the || defaults in the code)
    expect(PET_CONFIG.COLORS.ENERGY_BAR).toMatch(/\u001b\[38;(2;0;255;0|5;10)m/);
    expect(PET_CONFIG.COLORS.ENERGY_VALUE).toMatch(/\u001b\[38;(2;0;255;255|5;14)m/);
  });

  it('should export PET_CONFIG with correct structure', async () => {
    const { PET_CONFIG } = await import('../config');

    expect(PET_CONFIG).toHaveProperty('INITIAL_ENERGY', 100);
    expect(PET_CONFIG).toHaveProperty('HAPPY_EXPRESSION', '(^_^)');
    expect(PET_CONFIG).toHaveProperty('ENERGY_BAR_LENGTH', 10);
    expect(PET_CONFIG).toHaveProperty('STATUS_BAR_PRIORITY', 100);
    expect(PET_CONFIG).toHaveProperty('FILLED_BAR_CHAR', '●');
    expect(PET_CONFIG).toHaveProperty('EMPTY_BAR_CHAR', '○');
    
    expect(PET_CONFIG).toHaveProperty('STATE_THRESHOLDS');
    expect(PET_CONFIG.STATE_THRESHOLDS).toEqual({
      HAPPY: 80,
      HUNGRY: 40,
      SICK: 10,
      DEAD: 0
    });

    expect(PET_CONFIG).toHaveProperty('STATE_EXPRESSIONS');
    expect(PET_CONFIG).toHaveProperty('ANIMATED_EXPRESSIONS');
    expect(PET_CONFIG).toHaveProperty('TIME_DECAY');
    expect(PET_CONFIG).toHaveProperty('FEEDING');
    expect(PET_CONFIG).toHaveProperty('COLORS');
  });

  it('should export LOGGER_CONFIG', async () => {
    const { LOGGER_CONFIG } = await import('../config');

    expect(LOGGER_CONFIG).toHaveProperty('COMPONENT_NAME', 'StatusPetExtension');
  });
});