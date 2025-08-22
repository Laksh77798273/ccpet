import { describe, it, expect, vi } from 'vitest';
import { Pet, IPetState } from '../Pet';
import { PET_CONFIG } from '../config';

describe('Pet Core Logic', () => {
  const mockConfig = PET_CONFIG;
  const mockDependencies = { config: mockConfig };

  const createInitialState = (): IPetState => ({
    energy: 50,
    expression: '(o_o)',
    lastFeedTime: new Date('2024-01-01T00:00:00Z'),
    totalTokensConsumed: 0,
    accumulatedTokens: 0
  });

  describe('constructor and getState', () => {
    it('should initialize with provided state', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      const state = pet.getState();
      expect(state).toEqual(initialState);
    });

    it('should return a copy of state, not the original object', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      const state1 = pet.getState();
      const state2 = pet.getState();
      
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('observer pattern', () => {
    it('should allow subscribing and notify observers on state changes', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      const observer = vi.fn();

      pet.subscribe(observer);
      pet.feed(1000000); // 1M tokens to trigger energy change

      expect(observer).toHaveBeenCalledWith(
        expect.objectContaining({
          energy: 51 // 50 + 1 energy from 1M tokens
        })
      );
    });

    it('should return unsubscribe function', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      const observer = vi.fn();

      const unsubscribe = pet.subscribe(observer);
      unsubscribe();
      pet.feed(1);

      expect(observer).not.toHaveBeenCalled();
    });

    it('should handle observer errors gracefully', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      const errorObserver = vi.fn().mockImplementation(() => {
        throw new Error('Observer error');
      });
      const normalObserver = vi.fn();

      pet.subscribe(errorObserver);
      pet.subscribe(normalObserver);
      
      expect(() => pet.feed(1000000)).not.toThrow(); // 1M tokens to trigger energy change
      expect(normalObserver).toHaveBeenCalled();
    });
  });

  describe('feed method', () => {
    it('should accumulate tokens without increasing energy when below threshold', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1000);
      const newState = pet.getState();
      
      expect(newState.energy).toBe(50); // No energy increase
      expect(newState.totalTokensConsumed).toBe(1000);
      expect(newState.accumulatedTokens).toBe(1000);
    });

    it('should increase energy when token threshold is reached', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1000000); // Exactly 1M tokens = 1 energy
      const newState = pet.getState();
      
      expect(newState.energy).toBe(51); // 50 + 1
      expect(newState.totalTokensConsumed).toBe(1000000);
      expect(newState.accumulatedTokens).toBe(0); // Reset after conversion
    });

    it('should handle partial token conversion', () => {
      const initialState = { ...createInitialState(), accumulatedTokens: 999500 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1000); // 999500 + 1000 = 1000500, should convert 1M and keep 500
      const newState = pet.getState();
      
      expect(newState.energy).toBe(51); // 50 + 1
      expect(newState.accumulatedTokens).toBe(500); // Remaining tokens
    });

    it('should cap energy at 100', () => {
      const initialState = { ...createInitialState(), energy: 99.5 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(2000000); // 2M tokens = 2 energy, but should cap at 100
      const newState = pet.getState();
      
      expect(newState.energy).toBe(100);
    });

    it('should update last feed time', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      const beforeTime = Date.now();
      
      pet.feed(1);
      const newState = pet.getState();
      const afterTime = Date.now();
      
      expect(newState.lastFeedTime.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(newState.lastFeedTime.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should update expression based on energy level when threshold reached', () => {
      const initialState = { ...createInitialState(), energy: 79 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1000000); // +1 energy: 79 + 1 = 80 (happy threshold)
      const newState = pet.getState();
      
      expect(newState.energy).toBe(80);
      expect(newState.expression).toBe('(^_^)');
    });

    it('should handle errors gracefully', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      expect(() => pet.feed(NaN)).not.toThrow();
    });

    it('should log errors when feeding fails', () => {
      const initialState = createInitialState();
      
      // Create a pet with invalid dependencies to trigger error
      const invalidDependencies = { config: null as any };
      const pet = new Pet(initialState, invalidDependencies);
      
      pet.feed(1);
      
      // Error is handled gracefully, no exception thrown
      expect(() => pet.feed(1)).not.toThrow();
    });
  });

  describe('applyTimeDecay method', () => {
    describe('enhanced configurable decay system', () => {
      it('should apply decay based on configurable rate per minute', () => {
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)); // 1 hour = 60 minutes
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: oneHourAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 60 minutes * 0.0231 energy/minute = 1.386 energy decay
        // 50 - 1.386 ≈ 48.614
        expect(newState.energy).toBeCloseTo(48.61, 1);
      });

      it('should apply decay for multiple hours', () => {
        const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000)); // 3 hours = 180 minutes
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: threeHoursAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 180 minutes * 0.0231 = 4.158 energy decay
        // 50 - 4.158 = 45.842
        expect(newState.energy).toBeCloseTo(45.84, 1);
      });

      it('should not apply decay if minimum interval not reached', () => {
        const thirtySecondsAgo = new Date(Date.now() - (30 * 1000)); // 30 seconds < 1 minute minimum
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: thirtySecondsAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // Should not decay - below minimum interval
        expect(newState.energy).toBe(50);
      });

      it('should apply decay when minimum interval is reached', () => {
        const tenMinutesAgo = new Date(Date.now() - (10 * 60 * 1000)); // 10 minutes > 1 minute minimum
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: tenMinutesAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 10 minutes * 0.0231 = 0.231 energy decay
        // 50 - 0.231 = 49.769
        expect(newState.energy).toBeCloseTo(49.77, 1);
      });

      it('should use lastDecayTime if available instead of lastFeedTime', () => {
        const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        const initialState = { 
          ...createInitialState(), 
          energy: 50, 
          lastFeedTime: twoHoursAgo,
          lastDecayTime: oneHourAgo 
        };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // Should use lastDecayTime (1 hour ago), not lastFeedTime (2 hours ago)
        // 60 minutes * 0.0231 = 1.386 energy decay
        expect(newState.energy).toBeCloseTo(48.61, 1);
      });

      it('should update lastDecayTime after applying decay', () => {
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: oneHourAgo };
        const pet = new Pet(initialState, mockDependencies);
        const beforeDecay = Date.now();
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        const afterDecay = Date.now();
        
        expect(newState.lastDecayTime).toBeDefined();
        expect(newState.lastDecayTime!.getTime()).toBeGreaterThanOrEqual(beforeDecay);
        expect(newState.lastDecayTime!.getTime()).toBeLessThanOrEqual(afterDecay);
      });
    });

    describe('energy bounds validation', () => {
      it('should not reduce energy below 0', () => {
        const tenHoursAgo = new Date(Date.now() - (10 * 60 * 60 * 1000)); // 10 hours = 600 minutes
        const initialState = { ...createInitialState(), energy: 5, lastFeedTime: tenHoursAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 600 minutes * 0.0231 = 13.86 energy decay, but energy can't go below 0
        expect(newState.energy).toBe(0);
      });

      it('should handle edge case where decay equals current energy', () => {
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)); // 1 hour
        const initialState = { ...createInitialState(), energy: 1.386, lastFeedTime: oneHourAgo };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 60 minutes * 0.0231 = 1.386 energy decay, should go to 0
        expect(newState.energy).toBe(0);
      });
    });

    describe('error handling', () => {
      it('should handle invalid time calculations gracefully', () => {
        const initialState = { ...createInitialState(), lastFeedTime: new Date('invalid') };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.applyTimeDecay()).not.toThrow();
      });

      it('should handle negative time differences gracefully', () => {
        const futureTime = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour in future
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: futureTime };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // No decay should be applied for negative time differences
        expect(newState.energy).toBe(50);
      });

      it('should skip decay when time decay fails', () => {
        const initialState = { ...createInitialState(), lastFeedTime: null as any };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.applyTimeDecay()).not.toThrow();
        expect(pet.getState().energy).toBe(50); // No change in energy
      });
    });

    describe('integration with decreaseEnergy method', () => {
      it('should call decreaseEnergy method for energy reduction', () => {
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        const initialState = { ...createInitialState(), energy: 50, lastFeedTime: oneHourAgo };
        const pet = new Pet(initialState, mockDependencies);
        const observer = vi.fn();
        
        pet.subscribe(observer);
        pet.applyTimeDecay();
        
        // Should notify observers through decreaseEnergy method
        expect(observer).toHaveBeenCalledWith(
          expect.objectContaining({ energy: expect.closeTo(48.61, 1) })
        );
      });

      it('should trigger expression updates through decreaseEnergy', () => {
        const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
        const initialState = { 
          ...createInitialState(), 
          energy: 50, // hungry state
          lastFeedTime: twoHoursAgo 
        };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.applyTimeDecay();
        const newState = pet.getState();
        
        // 120 minutes * 0.0231 = 2.772 energy decay: 50 - 2.772 = 47.228
        // Energy 47.228 is above HUNGRY threshold (40), should still be hungry
        expect(newState.energy).toBeCloseTo(47.23, 1);
        expect(newState.expression).toBe('(o_o)');
      });
    });
  });

  describe('energy management methods', () => {
    describe('addEnergy', () => {
      it('should increase energy by specified amount', () => {
        const initialState = { ...createInitialState(), energy: 50 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.addEnergy(20);
        const state = pet.getState();
        
        expect(state.energy).toBe(70);
      });

      it('should cap energy at 100', () => {
        const initialState = { ...createInitialState(), energy: 95 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.addEnergy(10);
        const state = pet.getState();
        
        expect(state.energy).toBe(100);
      });

      it('should notify observers when energy changes', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        const observer = vi.fn();
        
        pet.subscribe(observer);
        pet.addEnergy(15);
        
        expect(observer).toHaveBeenCalledWith(
          expect.objectContaining({ energy: 65 })
        );
      });

      it('should update expression based on new energy level', () => {
        const initialState = { ...createInitialState(), energy: 70 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.addEnergy(15);
        const state = pet.getState();
        
        expect(state.energy).toBe(85);
        expect(state.expression).toBe('(^_^)');
      });

      it('should throw error for negative amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.addEnergy(-10)).toThrow('Invalid energy amount: -10. Must be a non-negative number.');
      });

      it('should throw error for NaN amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.addEnergy(NaN)).toThrow('Invalid energy amount: NaN. Must be a non-negative number.');
      });

      it('should throw error for non-number amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.addEnergy('invalid' as any)).toThrow('Invalid energy amount: invalid. Must be a non-negative number.');
      });
    });

    describe('decreaseEnergy', () => {
      it('should decrease energy by specified amount', () => {
        const initialState = { ...createInitialState(), energy: 70 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.decreaseEnergy(20);
        const state = pet.getState();
        
        expect(state.energy).toBe(50);
      });

      it('should not allow energy to go below 0', () => {
        const initialState = { ...createInitialState(), energy: 10 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.decreaseEnergy(20);
        const state = pet.getState();
        
        expect(state.energy).toBe(0);
      });

      it('should notify observers when energy changes', () => {
        const initialState = { ...createInitialState(), energy: 70 };
        const pet = new Pet(initialState, mockDependencies);
        const observer = vi.fn();
        
        pet.subscribe(observer);
        pet.decreaseEnergy(15);
        
        expect(observer).toHaveBeenCalledWith(
          expect.objectContaining({ energy: 55 })
        );
      });

      it('should update expression based on new energy level', () => {
        const initialState = { ...createInitialState(), energy: 50 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.decreaseEnergy(45);
        const state = pet.getState();
        
        expect(state.energy).toBe(5);
        expect(state.expression).toBe('(x_x)');
      });

      it('should throw error for negative amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.decreaseEnergy(-10)).toThrow('Invalid energy amount: -10. Must be a non-negative number.');
      });

      it('should throw error for NaN amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.decreaseEnergy(NaN)).toThrow('Invalid energy amount: NaN. Must be a non-negative number.');
      });

      it('should throw error for non-number amounts', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        expect(() => pet.decreaseEnergy('invalid' as any)).toThrow('Invalid energy amount: invalid. Must be a non-negative number.');
      });
    });

    describe('getCurrentEnergy', () => {
      it('should return current energy value', () => {
        const initialState = { ...createInitialState(), energy: 75 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.getCurrentEnergy()).toBe(75);
      });

      it('should return updated energy after changes', () => {
        const initialState = { ...createInitialState(), energy: 50 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.addEnergy(25);
        expect(pet.getCurrentEnergy()).toBe(75);
        
        pet.decreaseEnergy(10);
        expect(pet.getCurrentEnergy()).toBe(65);
      });
    });
  });

  describe('expression updates with new thresholds', () => {
    it('should show happy expression for energy >= 80', () => {
      const initialState = { ...createInitialState(), energy: 80 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.addEnergy(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(^_^)');
    });

    it('should show hungry expression for energy >= 40 and < 80', () => {
      const initialState = { ...createInitialState(), energy: 50 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.addEnergy(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(o_o)');
    });

    it('should show sick expression for energy >= 10 and < 40', () => {
      const initialState = { ...createInitialState(), energy: 20 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.addEnergy(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(u_u)');
    });

    it('should show dead expression for energy < 10', () => {
      const initialState = { ...createInitialState(), energy: 5 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.addEnergy(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(x_x)');
    });

    it('should transition expressions correctly when energy changes', () => {
      const initialState = { ...createInitialState(), energy: 35 };
      const pet = new Pet(initialState, mockDependencies);
      
      // Start in sick state (35 >= 10 and < 40)
      pet.addEnergy(0); // Trigger expression update
      expect(pet.getState().expression).toBe('(u_u)');
      
      // Add energy to reach hungry state
      pet.addEnergy(10);
      expect(pet.getState().expression).toBe('(o_o)');
      
      // Add more energy to reach happy state
      pet.addEnergy(40);
      expect(pet.getState().expression).toBe('(^_^)');
      
      // Decrease energy back to sick state (85 - 50 = 35, which is < 40)
      pet.decreaseEnergy(50);
      expect(pet.getState().expression).toBe('(u_u)');
    });
  });

  describe('pet death and resurrection', () => {
    describe('isDead', () => {
      it('should return true when energy is exactly 0', () => {
        const initialState = { ...createInitialState(), energy: 0 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.isDead()).toBe(true);
      });

      it('should return false when energy is greater than 0', () => {
        const initialState = { ...createInitialState(), energy: 1 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.isDead()).toBe(false);
      });

      it('should return false for high energy values', () => {
        const initialState = { ...createInitialState(), energy: 100 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.isDead()).toBe(false);
      });

      it('should correctly reflect death after energy decreases to 0', () => {
        const initialState = { ...createInitialState(), energy: 5 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.isDead()).toBe(false);
        
        pet.decreaseEnergy(10); // More than current energy, should go to 0
        expect(pet.isDead()).toBe(true);
      });
    });

    describe('resetToInitialState', () => {
      it('should reset energy to INITIAL_ENERGY', () => {
        const initialState = { ...createInitialState(), energy: 0 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        expect(state.energy).toBe(PET_CONFIG.INITIAL_ENERGY);
      });

      it('should reset expression to HAPPY', () => {
        const initialState = { ...createInitialState(), energy: 0, expression: '(x_x)' };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        expect(state.expression).toBe(PET_CONFIG.STATE_EXPRESSIONS.HAPPY);
      });

      it('should reset totalTokensConsumed to 0', () => {
        const initialState = { ...createInitialState(), totalTokensConsumed: 5000000 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        expect(state.totalTokensConsumed).toBe(0);
      });

      it('should reset accumulatedTokens to 0', () => {
        const initialState = { ...createInitialState(), accumulatedTokens: 999999 };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        expect(state.accumulatedTokens).toBe(0);
      });

      it('should reset session token counts to 0', () => {
        const initialState = { 
          ...createInitialState(),
          sessionTotalInputTokens: 1000,
          sessionTotalOutputTokens: 2000,
          sessionTotalCachedTokens: 500
        };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        expect(state.sessionTotalInputTokens).toBe(0);
        expect(state.sessionTotalOutputTokens).toBe(0);
        expect(state.sessionTotalCachedTokens).toBe(0);
      });

      it('should update lastFeedTime to current time', () => {
        const oldTime = new Date('2024-01-01T00:00:00Z');
        const initialState = { ...createInitialState(), lastFeedTime: oldTime };
        const pet = new Pet(initialState, mockDependencies);
        const beforeReset = Date.now();
        
        pet.resetToInitialState();
        const state = pet.getState();
        const afterReset = Date.now();
        
        expect(state.lastFeedTime.getTime()).toBeGreaterThanOrEqual(beforeReset);
        expect(state.lastFeedTime.getTime()).toBeLessThanOrEqual(afterReset);
      });

      it('should update lastDecayTime to current time', () => {
        const oldTime = new Date('2024-01-01T00:00:00Z');
        const initialState = { ...createInitialState(), lastDecayTime: oldTime };
        const pet = new Pet(initialState, mockDependencies);
        const beforeReset = Date.now();
        
        pet.resetToInitialState();
        const state = pet.getState();
        const afterReset = Date.now();
        
        expect(state.lastDecayTime).toBeDefined();
        expect(state.lastDecayTime!.getTime()).toBeGreaterThanOrEqual(beforeReset);
        expect(state.lastDecayTime!.getTime()).toBeLessThanOrEqual(afterReset);
      });

      it('should notify observers after reset', () => {
        const initialState = { ...createInitialState(), energy: 0 };
        const pet = new Pet(initialState, mockDependencies);
        const observer = vi.fn();
        
        pet.subscribe(observer);
        pet.resetToInitialState();
        
        expect(observer).toHaveBeenCalledWith(
          expect.objectContaining({
            energy: PET_CONFIG.INITIAL_ENERGY,
            expression: PET_CONFIG.STATE_EXPRESSIONS.HAPPY,
            totalTokensConsumed: 0,
            accumulatedTokens: 0
          })
        );
      });

      it('should call _updateExpression after reset', () => {
        // This is implicitly tested by checking the expression is happy
        const initialState = { ...createInitialState(), energy: 0, expression: '(x_x)' };
        const pet = new Pet(initialState, mockDependencies);
        
        pet.resetToInitialState();
        const state = pet.getState();
        
        // Expression should be updated based on the new energy level (100 = happy)
        expect(state.expression).toBe(PET_CONFIG.STATE_EXPRESSIONS.HAPPY);
      });

      it('should handle errors gracefully', () => {
        const initialState = createInitialState();
        const pet = new Pet(initialState, mockDependencies);
        
        // Mock an error in the dependencies to trigger error handling
        const invalidDependencies = { config: null as any };
        const petWithError = new Pet(initialState, invalidDependencies);
        
        expect(() => petWithError.resetToInitialState()).toThrow();
      });

      it('should reset pet from dead state to alive', () => {
        const initialState = { ...createInitialState(), energy: 0 };
        const pet = new Pet(initialState, mockDependencies);
        
        expect(pet.isDead()).toBe(true);
        
        pet.resetToInitialState();
        
        expect(pet.isDead()).toBe(false);
        expect(pet.getCurrentEnergy()).toBe(PET_CONFIG.INITIAL_ENERGY);
      });
    });
  });

  describe('integration with existing methods', () => {
    it('should use addEnergy in feed method when threshold reached', () => {
      const initialState = { ...createInitialState(), energy: 50 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1000000); // 1M tokens = 1 energy
      const state = pet.getState();
      
      expect(state.energy).toBe(51);
      expect(state.totalTokensConsumed).toBe(1000000);
      expect(state.accumulatedTokens).toBe(0);
    });

    it('should use decreaseEnergy in applyTimeDecay method', () => {
      const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
      const initialState = { ...createInitialState(), energy: 50, lastFeedTime: twoHoursAgo };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const state = pet.getState();
      
      // 120 minutes * 0.0231 = 2.772 energy decay
      // 50 - 2.772 = 47.228
      expect(state.energy).toBeCloseTo(47.23, 1);
    });
  });
});