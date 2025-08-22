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
    totalTokensConsumed: 0
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
      pet.feed(1);

      expect(observer).toHaveBeenCalledWith(
        expect.objectContaining({
          energy: 60
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
      
      expect(() => pet.feed(1)).not.toThrow();
      expect(normalObserver).toHaveBeenCalled();
    });
  });

  describe('feed method', () => {
    it('should increase energy when fed', () => {
      const initialState = createInitialState();
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(1);
      const newState = pet.getState();
      
      expect(newState.energy).toBe(60);
      expect(newState.totalTokensConsumed).toBe(1);
    });

    it('should cap energy at 100', () => {
      const initialState = { ...createInitialState(), energy: 95 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(2);
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

    it('should update expression based on energy level', () => {
      const initialState = { ...createInitialState(), energy: 70 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(2);
      const newState = pet.getState();
      
      expect(newState.energy).toBe(90);
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
    it('should reduce energy based on minutes since last feed', () => {
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      const initialState = { ...createInitialState(), lastFeedTime: oneHourAgo };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const newState = pet.getState();
      
      // 1小时(60分钟) * (100/(3*24*60)) ≈ 1.39点衰减
      // 50 - 1.39 ≈ 48.61
      expect(newState.energy).toBeCloseTo(48.61, 1);
    });

    it('should not reduce energy below 0', () => {
      const tenHoursAgo = new Date(Date.now() - (10 * 60 * 60 * 1000));
      const initialState = { ...createInitialState(), energy: 10, lastFeedTime: tenHoursAgo };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const newState = pet.getState();
      
      expect(newState.energy).toBe(0);
    });

    it('should not change energy if no time has passed', () => {
      const initialState = { ...createInitialState(), lastFeedTime: new Date() };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const newState = pet.getState();
      
      expect(newState.energy).toBe(50);
    });

    it('should log errors when time decay fails', () => {
      // Create a pet with invalid lastFeedTime to trigger error
      const initialState = { ...createInitialState(), lastFeedTime: 'invalid' as any };
      const pet = new Pet(initialState, mockDependencies);
      
      // Error is handled gracefully, no exception thrown
      expect(() => pet.applyTimeDecay()).not.toThrow();
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

  describe('integration with existing methods', () => {
    it('should use addEnergy in feed method', () => {
      const initialState = { ...createInitialState(), energy: 50 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(2);
      const state = pet.getState();
      
      expect(state.energy).toBe(70);
      expect(state.totalTokensConsumed).toBe(2);
    });

    it('should use decreaseEnergy in applyTimeDecay method', () => {
      const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
      const initialState = { ...createInitialState(), energy: 50, lastFeedTime: twoHoursAgo };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const state = pet.getState();
      
      // 2小时(120分钟) * (100/(3*24*60)) ≈ 2.78点衰减  
      // 50 - 2.78 ≈ 47.22
      expect(state.energy).toBeCloseTo(47.22, 1);
    });
  });
});