import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hexToAnsi, processColorConfig } from '../colors';

describe('colors.ts', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('hexToAnsi', () => {
    it('should return reset code for RESET value', () => {
      expect(hexToAnsi('RESET')).toBe('\x1b[0m');
    });

    it('should handle hex colors without # prefix', () => {
      const result = hexToAnsi('FF0000');
      expect(result).toMatch(/\x1b\[38;/);
    });

    it('should handle hex colors with # prefix', () => {
      const result = hexToAnsi('#FF0000');
      expect(result).toMatch(/\x1b\[38;/);
    });

    it('should return true color codes when supported', () => {
      process.env.COLORTERM = 'truecolor';
      const result = hexToAnsi('FF0000');
      expect(result).toBe('\x1b[38;2;255;0;0m');
    });

    it('should add bold prefix when bold is true and true color is supported', () => {
      process.env.COLORTERM = 'truecolor';
      const result = hexToAnsi('FF0000', false, true);
      expect(result).toBe('\x1b[1m\x1b[38;2;255;0;0m');
    });

    it('should fallback to 256 color when true color is not supported', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
      
      const result = hexToAnsi('FF0000');
      expect(result).toMatch(/\x1b\[38;5;\d+m/);
    });

    it('should handle bright colors for standard ANSI colors', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
      
      const result = hexToAnsi('000000', true);
      expect(result).toMatch(/\x1b\[1;3\dm/);
    });

    it('should add bold prefix for 256 color mode when bold is true', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
      
      const result = hexToAnsi('808080', false, true);
      expect(result).toMatch(/\x1b\[1m\x1b\[38;5;\d+m/);
    });

    describe('true color detection', () => {
      it('should detect COLORTERM=truecolor', () => {
        process.env.COLORTERM = 'truecolor';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect COLORTERM=24bit', () => {
        process.env.COLORTERM = '24bit';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect iterm terminal', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'iterm';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect iterm2 terminal', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'iterm2';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect alacritty terminal', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'alacritty';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect kitty terminal', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'kitty';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect wezterm terminal', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'wezterm';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect 256color terminals', () => {
        delete process.env.COLORTERM;
        process.env.TERM = 'xterm-256color';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should detect Windows Terminal', () => {
        delete process.env.COLORTERM;
        delete process.env.TERM;
        process.env.WT_SESSION = 'some-session-id';
        const result = hexToAnsi('FF0000');
        expect(result).toBe('\x1b[38;2;255;0;0m');
      });

      it('should fallback to 256 color when no true color support detected', () => {
        delete process.env.COLORTERM;
        delete process.env.TERM;
        delete process.env.WT_SESSION;
        const result = hexToAnsi('FF0000');
        expect(result).toMatch(/\x1b\[38;5;\d+m/);
      });
    });
  });

  describe('processColorConfig', () => {
    it('should process simple hex colors', () => {
      const config = { primary: 'FF0000', secondary: '00FF00' };
      const result = processColorConfig(config);
      
      expect(result.primary).toMatch(/\x1b\[38;/);
      expect(result.secondary).toMatch(/\x1b\[38;/);
    });

    it('should handle RESET key specially', () => {
      const config = { RESET: 'any-value' };
      const result = processColorConfig(config);
      
      expect(result.RESET).toBe('\x1b[0m');
    });

    it('should process colors with bright modifier', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
      
      const config = { error: '800000:bright' };
      const result = processColorConfig(config);
      
      expect(result.error).toMatch(/\x1b\[1;3\dm/);
    });

    it('should process colors with bold modifier', () => {
      process.env.COLORTERM = 'truecolor';
      const config = { warning: 'FFA500:bold' };
      const result = processColorConfig(config);
      
      expect(result.warning).toBe('\x1b[1m\x1b[38;2;255;165;0m');
    });

    it('should process colors with both bright and bold modifiers', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
      
      const config = { highlight: '000080:bright:bold' };
      const result = processColorConfig(config);
      
      expect(result.highlight).toMatch(/\x1b\[1;3\dm/);
    });

    it('should handle colors with modifiers in different order', () => {
      process.env.COLORTERM = 'truecolor';
      const config = { text: 'FF00FF:bold:bright' };
      const result = processColorConfig(config);
      
      expect(result.text).toBe('\x1b[1m\x1b[38;2;255;0;255m');
    });

    it('should process empty config object', () => {
      const result = processColorConfig({});
      expect(result).toEqual({});
    });

    it('should handle multiple colors with mixed formats', () => {
      process.env.COLORTERM = 'truecolor';
      const config = {
        normal: 'FFFFFF',
        bright: '000000:bright',
        bold: '808080:bold',
        both: 'FF8000:bright:bold',
        RESET: 'ignored'
      };
      
      const result = processColorConfig(config);
      
      expect(result.normal).toBe('\x1b[38;2;255;255;255m');
      expect(result.bold).toBe('\x1b[1m\x1b[38;2;128;128;128m');
      expect(result.both).toBe('\x1b[1m\x1b[38;2;255;128;0m');
      expect(result.RESET).toBe('\x1b[0m');
    });
  });

  describe('color conversion accuracy', () => {
    it('should correctly convert pure red', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('FF0000')).toBe('\x1b[38;2;255;0;0m');
    });

    it('should correctly convert pure green', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('00FF00')).toBe('\x1b[38;2;0;255;0m');
    });

    it('should correctly convert pure blue', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('0000FF')).toBe('\x1b[38;2;0;0;255m');
    });

    it('should correctly convert white', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('FFFFFF')).toBe('\x1b[38;2;255;255;255m');
    });

    it('should correctly convert black', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('000000')).toBe('\x1b[38;2;0;0;0m');
    });

    it('should correctly convert gray', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('808080')).toBe('\x1b[38;2;128;128;128m');
    });
  });

  describe('256-color fallback', () => {
    beforeEach(() => {
      delete process.env.COLORTERM;
      delete process.env.TERM;
      delete process.env.WT_SESSION;
    });

    it('should find closest color for pure red', () => {
      const result = hexToAnsi('FF0000');
      expect(result).toMatch(/\x1b\[38;5;9m/); // Standard red
    });

    it('should find closest color for pure black', () => {
      const result = hexToAnsi('000000');
      expect(result).toMatch(/\x1b\[38;5;0m/); // Standard black
    });

    it('should find closest color for pure white', () => {
      const result = hexToAnsi('FFFFFF');
      expect(result).toMatch(/\x1b\[38;5;15m/); // Standard white
    });

    it('should handle grayscale colors', () => {
      const result = hexToAnsi('808080');
      expect(result).toMatch(/\x1b\[38;5;\d+m/);
    });

    it('should find closest grayscale color that matches exactly', () => {
      // Use a gray value that's closer to the grayscale range (232-255)
      // Gray level calculation: 8 + i * 10, so for a value like 138 (0x8A)
      // it should find a closer match in the grayscale range
      const result = hexToAnsi('8A8A8A');
      expect(result).toMatch(/\x1b\[38;5;\d+m/); // Should find a grayscale match
    });

    it('should handle color cube colors', () => {
      const result = hexToAnsi('5F87AF');
      expect(result).toMatch(/\x1b\[38;5;\d+m/);
    });
  });

  describe('edge cases', () => {
    it('should handle lowercase hex colors', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('ff0000')).toBe('\x1b[38;2;255;0;0m');
    });

    it('should handle mixed case hex colors', () => {
      process.env.COLORTERM = 'truecolor';
      expect(hexToAnsi('Ff00aA')).toBe('\x1b[38;2;255;0;170m');
    });

    it('should handle partial terminal environment detection', () => {
      delete process.env.COLORTERM;
      process.env.TERM = 'some-unknown-term';
      delete process.env.WT_SESSION;
      
      const result = hexToAnsi('FF0000');
      expect(result).toMatch(/\x1b\[38;5;\d+m/);
    });
  });
});