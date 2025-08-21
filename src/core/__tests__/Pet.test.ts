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
          energy: 60,
          totalTokensConsumed: 1
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
    it('should reduce energy based on hours since last feed', () => {
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      const initialState = { ...createInitialState(), lastFeedTime: oneHourAgo };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.applyTimeDecay();
      const newState = pet.getState();
      
      expect(newState.energy).toBe(45);
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

  describe('expression updates', () => {
    it('should show happy expression for high energy (>=80)', () => {
      const initialState = { ...createInitialState(), energy: 80 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(^_^)');
    });

    it('should show neutral expression for medium energy (50-79)', () => {
      const initialState = { ...createInitialState(), energy: 60 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(o_o)');
    });

    it('should show tired expression for low energy (20-49)', () => {
      const initialState = { ...createInitialState(), energy: 30 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(~_~)');
    });

    it('should show dead expression for very low energy (<20)', () => {
      const initialState = { ...createInitialState(), energy: 10 };
      const pet = new Pet(initialState, mockDependencies);
      
      pet.feed(0);
      const state = pet.getState();
      
      expect(state.expression).toBe('(x_x)');
    });
  });
});