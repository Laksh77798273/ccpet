import { describe, it, expect } from 'vitest';
import { validateLine1Items, LINE1_SUPPORTED_ITEMS, Line1ItemType, DEFAULT_LINE1_CONFIG } from '../config';

describe('Line1 Configuration', () => {
  describe('validateLine1Items', () => {
    it('should return all valid items', () => {
      const validItems = ['expression', 'energy-bar', 'energy-value'];
      const result = validateLine1Items(validItems);
      
      expect(result).toEqual(['expression', 'energy-bar', 'energy-value']);
    });

    it('should filter out invalid items', () => {
      const mixedItems = ['expression', 'invalid-item', 'energy-bar', 'another-invalid'];
      const result = validateLine1Items(mixedItems);
      
      expect(result).toEqual(['expression', 'energy-bar']);
    });

    it('should return empty array for all invalid items', () => {
      const invalidItems = ['invalid1', 'invalid2', 'not-supported'];
      const result = validateLine1Items(invalidItems);
      
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = validateLine1Items([]);
      
      expect(result).toEqual([]);
    });

    it('should support all defined LINE1_SUPPORTED_ITEMS', () => {
      const allSupportedItems = [...LINE1_SUPPORTED_ITEMS];
      const result = validateLine1Items(allSupportedItems);
      
      expect(result).toEqual(allSupportedItems);
    });

    it('should include pet-name for future story support', () => {
      const itemsWithPetName = ['expression', 'pet-name'];
      const result = validateLine1Items(itemsWithPetName);
      
      expect(result).toEqual(['expression', 'pet-name']);
    });
  });

  describe('LINE1_SUPPORTED_ITEMS constant', () => {
    it('should include all expected item types', () => {
      const expectedItems: Line1ItemType[] = [
        'expression',
        'energy-bar', 
        'energy-value',
        'accumulated-tokens',
        'lifetime-tokens',
        'pet-name'
      ];
      
      expect(LINE1_SUPPORTED_ITEMS).toEqual(expectedItems);
    });

    it('should be readonly at compile time', () => {
      // In TypeScript, this would be a compile-time error due to readonly
      // At runtime, the array is still mutable, but TypeScript prevents modification
      expect(LINE1_SUPPORTED_ITEMS.length).toBeGreaterThan(0);
      
      // We can't actually test immutability at runtime without Object.freeze
      // This test just verifies the array has the expected content
      expect(Array.isArray(LINE1_SUPPORTED_ITEMS)).toBe(true);
    });
  });

  describe('DEFAULT_LINE1_CONFIG constant', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_LINE1_CONFIG.enabled).toBe(true);
      expect(DEFAULT_LINE1_CONFIG.items).toEqual([
        'expression', 
        'energy-bar', 
        'energy-value', 
        'accumulated-tokens', 
        'lifetime-tokens'
      ]);
    });

    it('should not include pet-name in default config until Story 4.2', () => {
      expect(DEFAULT_LINE1_CONFIG.items).not.toContain('pet-name');
    });
  });
});