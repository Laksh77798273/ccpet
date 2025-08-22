import { describe, it, expect, vi } from 'vitest';
import { StatusBarFormatter } from '../StatusBar';
import { IPetState } from '../../core/Pet';

describe('StatusBarFormatter Component', () => {
  const createMockPetState = (overrides: Partial<IPetState> = {}): IPetState => ({
    energy: 75,
    expression: '(^_^)',
    lastFeedTime: new Date(),
    totalTokensConsumed: 5,
    accumulatedTokens: 0,
    ...overrides
  });

  describe('constructor and initialization', () => {
    it('should initialize without dependencies', () => {
      const formatter = new StatusBarFormatter(true);
      
      expect(formatter).toBeInstanceOf(StatusBarFormatter);
    });

    it('should initialize with test mode', () => {
      const formatter = new StatusBarFormatter(true);
      
      expect(formatter).toBeInstanceOf(StatusBarFormatter);
    });
  });


  describe('formatPetDisplay', () => {
    it('should format pet display with expression, energy bar, value and tokens', () => {
      const formatter = new StatusBarFormatter(true);
      const testState = createMockPetState({
        expression: '(o_o)',
        energy: 50.25,
        accumulatedTokens: 1500
      });

      const result = formatter.formatPetDisplay(testState);

      expect(result).toBe('(o_o) ●●●●●○○○○○ 50.25 (1.5K)');
    });

    it('should handle formatting errors gracefully', () => {
      const formatter = new StatusBarFormatter(true);
      
      const result = formatter.formatPetDisplay(null as any);

      expect(result).toBe('(?) ERROR');
    });

    it('should include session token info with colored formatting when available', () => {
      const formatter = new StatusBarFormatter(true);
      const testState = createMockPetState({
        expression: '(^_^)',
        energy: 75,
        accumulatedTokens: 1000,
        sessionTotalInputTokens: 2500,
        sessionTotalOutputTokens: 1500,
        sessionTotalCachedTokens: 500
      });

      const result = formatter.formatPetDisplay(testState);

      expect(result).toBe('(^_^) ●●●●●●●●○○ 75.00 (1.0K) In: 2.5K Out: 1.5K Cached: 500 Total: 4.5K');
    });

    it('should not include session token info when not available', () => {
      const formatter = new StatusBarFormatter(true);
      const testState = createMockPetState({
        expression: '(^_^)',
        energy: 75,
        accumulatedTokens: 1000
      });

      const result = formatter.formatPetDisplay(testState);

      expect(result).toBe('(^_^) ●●●●●●●●○○ 75.00 (1.0K)');
    });
  });

  describe('generateEnergyBar', () => {
    it('should generate full energy bar for 100% energy', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(100);

      expect(result).toBe('●●●●●●●●●●');
      expect(result.length).toBe(10);
    });

    it('should generate half energy bar for 50% energy', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(50);

      expect(result).toBe('●●●●●○○○○○');
      expect(result.length).toBe(10);
    });

    it('should generate empty energy bar for 0% energy', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(0);

      expect(result).toBe('○○○○○○○○○○');
      expect(result.length).toBe(10);
    });

    it('should handle 75% energy correctly', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(75);

      expect(result).toBe('●●●●●●●●○○'); // 75% rounds to 8 filled bars
      expect(result.length).toBe(10);
    });

    it('should handle 25% energy correctly', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(25);

      expect(result).toBe('●●●○○○○○○○'); // 25% rounds to 3 filled bars
      expect(result.length).toBe(10);
    });

    it('should handle edge case of 1% energy', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(1);

      expect(result).toBe('○○○○○○○○○○');
      expect(result.length).toBe(10);
    });

    it('should handle edge case of 99% energy', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(99);

      expect(result).toBe('●●●●●●●●●●'); // 99% rounds to 10 filled bars (full)
      expect(result.length).toBe(10);
    });

    it('should handle invalid energy values gracefully', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(NaN);

      expect(result).toBe('??????????');
    });

    it('should handle negative energy values', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(-10);

      expect(result).toBe('○○○○○○○○○○');
    });

    it('should handle energy values over 100', () => {
      const formatter = new StatusBarFormatter(true);

      const result = formatter.generateEnergyBar(150);

      expect(result).toBe('●●●●●●●●●●');
    });

    it('should handle generateEnergyBar errors gracefully', () => {
      const formatter = new StatusBarFormatter(true);

      // Mock Math.round to throw an error to trigger catch block
      const originalMathRound = Math.round;
      Math.round = vi.fn().mockImplementation(() => {
        throw new Error('Math error');
      });

      const result = formatter.generateEnergyBar(50);

      expect(result).toBe('??????????');
      
      // Restore original Math.round
      Math.round = originalMathRound;
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers as is', () => {
      const formatter = new StatusBarFormatter(true);
      
      expect(formatter.formatTokenCount(42)).toBe('42');
      expect(formatter.formatTokenCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      const formatter = new StatusBarFormatter(true);
      
      expect(formatter.formatTokenCount(1500)).toBe('1.5K');
      expect(formatter.formatTokenCount(10000)).toBe('10.0K');
      expect(formatter.formatTokenCount(999500)).toBe('999.5K');
    });

    it('should format millions with M suffix', () => {
      const formatter = new StatusBarFormatter(true);
      
      expect(formatter.formatTokenCount(1000000)).toBe('1.00M');
      expect(formatter.formatTokenCount(1500000)).toBe('1.50M');
      expect(formatter.formatTokenCount(10000000)).toBe('10.00M');
    });

    it('should handle formatting errors gracefully', () => {
      const formatter = new StatusBarFormatter(true);
      
      const result = formatter.formatTokenCount(NaN);
      
      expect(result).toBe('?');
    });
  });

});