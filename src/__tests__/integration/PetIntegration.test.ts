import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Pet, IPetState } from '../../core/Pet';
import { StatusBarFormatter } from '../../ui/StatusBar';
import { PetStorage } from '../../services/PetStorage';
import { ClaudeCodeStatusLine } from '../../ccpet';
import { PET_CONFIG } from '../../core/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock filesystem and os modules
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('Pet Integration Tests', () => {
  const mockHomedir = '/mock/home';
  const mockPetDir = '/mock/home/.claude-pet';
  const mockStateFile = '/mock/home/.claude-pet/pet-state.json';

  const createInitialState = (): IPetState => ({
    energy: PET_CONFIG.INITIAL_ENERGY,
    expression: PET_CONFIG.HAPPY_EXPRESSION,
    lastFeedTime: new Date(),
    totalTokensConsumed: 0,
    accumulatedTokens: 0
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock os.homedir
    vi.mocked(os.homedir).mockReturnValue(mockHomedir);
    
    // Mock path.join
    vi.mocked(path.join)
      .mockImplementation((...args) => args.join('/'));
    
    // Mock fs methods
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pet and StatusBarFormatter Integration', () => {
    it('should format pet display correctly when pet is fed', () => {
      const formatter = new StatusBarFormatter(true);
      const pet = new Pet(createInitialState(), { config: PET_CONFIG });

      pet.feed(1000000); // 1M tokens to trigger energy change
      const state = pet.getState();
      const display = formatter.formatPetDisplay(state);

      expect(display).toBe('(^_^) ●●●●●●●●●● 100.00 (0)');
    });

    it('should reflect energy changes in display format', () => {
      const formatter = new StatusBarFormatter(true);
      const initialState = { ...createInitialState(), energy: 50, expression: '(o_o)' };
      const pet = new Pet(initialState, { config: PET_CONFIG });
      
      pet.feed(500000); // Not enough for energy change, just accumulate
      const state1 = pet.getState();
      const display1 = formatter.formatPetDisplay(state1);
      expect(display1).toBe('(o_o) ●●●●●○○○○○ 50.00 (500.0K)'); // 50% energy, 500K accumulated

      pet.feed(500000); // Now we have 1M total, triggers energy change
      const state2 = pet.getState();
      const display2 = formatter.formatPetDisplay(state2);
      expect(display2).toBe('(o_o) ●●●●●○○○○○ 51.00 (0)'); // 51% energy, 0 accumulated (converted to energy)
    });

    it('should handle pet state transitions correctly', () => {
      const formatter = new StatusBarFormatter(true);
      // 使用更长时间来达到sick状态：约60小时(2.5天)
      const sixtyHoursAgo = new Date(Date.now() - (60 * 60 * 60 * 1000));
      const initialState = { ...createInitialState(), energy: 85, lastFeedTime: sixtyHoursAgo };
      const pet = new Pet(initialState, { config: PET_CONFIG });

      pet.applyTimeDecay();
      const state = pet.getState();
      const display = formatter.formatPetDisplay(state);

      // 60小时 * 60分钟 * 0.0231 ≈ 83.33点衰减
      // 85 - 83.33 ≈ 1.67，应该是dead状态
      expect(display).toMatch(/\(x_x\) /);
    });
  });

  describe('Full CLI Lifecycle', () => {
    it('should simulate complete pet lifecycle with persistence', () => {
      // First session - new pet
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const statusLine1 = new ClaudeCodeStatusLine(true);
      const display1 = statusLine1.getStatusDisplay();
      statusLine1.saveState();
      
      expect(display1).toBe('(^_^) ●●●●●●●●●● 100.00 (0)');
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Second session - load saved state
      const savedState = {
        energy: 75,
        expression: '(^_^)',
        lastFeedTime: new Date().toISOString(),
        totalTokensConsumed: 5,
        accumulatedTokens: 0
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      
      const statusLine2 = new ClaudeCodeStatusLine(true);
      const display2 = statusLine2.getStatusDisplay();
      
      expect(display2).toBe('(^_^) ●●●●●●●●○○ 75.00 (0)'); // 75% energy (rounded to 8 bars)
    });

    it('should handle error conditions throughout CLI lifecycle', () => {
      // Simulate storage errors
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => {
        const statusLine = new ClaudeCodeStatusLine(true);
        const display = statusLine.getStatusDisplay();
        statusLine.saveState();
        expect(display).toBe('(^_^) ●●●●●●●●●● 100.00 (0)');
      }).not.toThrow();
    });

    it('should maintain pet state consistency across components', () => {
      const storage = new PetStorage();
      const formatter = new StatusBarFormatter(true);
      const pet = new Pet(createInitialState(), { config: PET_CONFIG });
      
      // Feed pet and check consistency
      pet.feed(3);
      const state = pet.getState();
      
      // Format display
      const display = formatter.formatPetDisplay(state);
      
      // Mock that state exists and return the actual state data when read
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(state));
      
      // Save and load state
      storage.saveState(state);
      const loadedState = storage.loadState();
      
      expect(loadedState).toEqual(state);
      expect(display).toBe('(^_^) ●●●●●●●●●● 100.00 (3)');
    });
  });
});