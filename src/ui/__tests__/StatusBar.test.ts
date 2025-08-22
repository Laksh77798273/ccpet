import { describe, it, expect, vi } from 'vitest';
import { StatusBarFormatter } from '../StatusBar';
import { IPetState } from '../../core/Pet';

describe('StatusBarFormatter Component', () => {
  const createMockPetState = (overrides: Partial<IPetState> = {}): IPetState => ({
    energy: 75,
    expression: '(^_^)',
    lastFeedTime: new Date(),
    totalTokensConsumed: 5,
    ...overrides
  });

  describe('constructor and initialization', () => {
    it('should initialize without dependencies', () => {
      const formatter = new StatusBarFormatter();
      
      expect(formatter).toBeInstanceOf(StatusBarFormatter);
    });
  });


  describe('formatPetDisplay', () => {
    it('should format pet display with expression and energy bar', () => {
      const formatter = new StatusBarFormatter();
      const testState = createMockPetState({
        expression: '(o_o)',
        energy: 50
      });

      const result = formatter.formatPetDisplay(testState);

      expect(result).toBe('(o_o) █████░░░░░');
    });

    it('should handle formatting errors gracefully', () => {
      const formatter = new StatusBarFormatter();
      
      const result = formatter.formatPetDisplay(null as any);

      expect(result).toBe('(?) ERROR');
    });
  });

  describe('generateEnergyBar', () => {
    it('should generate full energy bar for 100% energy', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(100);

      expect(result).toBe('██████████');
      expect(result.length).toBe(10);
    });

    it('should generate half energy bar for 50% energy', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(50);

      expect(result).toBe('█████░░░░░');
      expect(result.length).toBe(10);
    });

    it('should generate empty energy bar for 0% energy', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(0);

      expect(result).toBe('░░░░░░░░░░');
      expect(result.length).toBe(10);
    });

    it('should handle 75% energy correctly', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(75);

      expect(result).toBe('████████░░'); // 75% rounds to 8 filled bars
      expect(result.length).toBe(10);
    });

    it('should handle 25% energy correctly', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(25);

      expect(result).toBe('███░░░░░░░'); // 25% rounds to 3 filled bars
      expect(result.length).toBe(10);
    });

    it('should handle edge case of 1% energy', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(1);

      expect(result).toBe('░░░░░░░░░░');
      expect(result.length).toBe(10);
    });

    it('should handle edge case of 99% energy', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(99);

      expect(result).toBe('██████████'); // 99% rounds to 10 filled bars (full)
      expect(result.length).toBe(10);
    });

    it('should handle invalid energy values gracefully', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(NaN);

      expect(result).toBe('??????????');
    });

    it('should handle negative energy values', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(-10);

      expect(result).toBe('░░░░░░░░░░');
    });

    it('should handle energy values over 100', () => {
      const formatter = new StatusBarFormatter();

      const result = formatter.generateEnergyBar(150);

      expect(result).toBe('██████████');
    });

    it('should handle generateEnergyBar errors gracefully', () => {
      const formatter = new StatusBarFormatter();

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

});