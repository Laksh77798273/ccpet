import { PET_CONFIG } from './config';

export interface IPetState {
  energy: number;
  expression: string;
  lastFeedTime: Date;
  totalTokensConsumed: number;
  lastDecayTime?: Date; // 上次计算衰减的时间
}

interface IPetDependencies {
  config: typeof PET_CONFIG;
}

type PetObserver = (state: IPetState) => void;

export class Pet {
  private state: IPetState;
  private deps: IPetDependencies;
  private observers: PetObserver[] = [];

  constructor(initialState: IPetState, dependencies: IPetDependencies) {
    this.state = { ...initialState };
    this.deps = dependencies;
  }

  public getState(): IPetState {
    return { ...this.state };
  }

  public subscribe(observer: PetObserver): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  public feed(tokens: number): void {
    try {
      this.addEnergy(tokens * 10);
      this.state = {
        ...this.state,
        lastFeedTime: new Date(),
        totalTokensConsumed: this.state.totalTokensConsumed + tokens
      };
    } catch (error) {
      console.error('Pet feeding failed:', error);
    }
  }

  public applyTimeDecay(): void {
    try {
      const now = new Date();
      // 使用lastDecayTime来计算衰减，如果不存在则使用lastFeedTime
      const lastTime = this.state.lastDecayTime || this.state.lastFeedTime;
      const minutesSinceLastDecay = 
        (now.getTime() - lastTime.getTime()) / (1000 * 60);
      
      if (minutesSinceLastDecay > 0) {
        // 3天(4320分钟)内从100到0，每分钟减少约0.0231点能量
        const ENERGY_DECAY_PER_MINUTE = 100 / (3 * 24 * 60); // ≈ 0.0231
        const energyDecay = minutesSinceLastDecay * ENERGY_DECAY_PER_MINUTE;
        
        if (energyDecay > 0) {
          this.decreaseEnergy(energyDecay);
          // 更新lastDecayTime但保持lastFeedTime不变
          this.state = {
            ...this.state,
            lastDecayTime: now
          };
        }
      }
    } catch (error) {
      console.error('Pet time decay failed:', error);
    }
  }

  public addEnergy(amount: number): void {
    try {
      if (typeof amount !== 'number' || amount < 0 || isNaN(amount)) {
        throw new Error(`Invalid energy amount: ${amount}. Must be a non-negative number.`);
      }

      const now = new Date();
      this.state = {
        ...this.state,
        energy: Math.min(100, this.state.energy + amount),
        lastFeedTime: now,
        lastDecayTime: now
      };
      this._updateExpression();
      this._notify();
    } catch (error) {
      console.error('Pet addEnergy failed:', error);
      throw error;
    }
  }

  public decreaseEnergy(amount: number): void {
    try {
      if (typeof amount !== 'number' || amount < 0 || isNaN(amount)) {
        throw new Error(`Invalid energy amount: ${amount}. Must be a non-negative number.`);
      }

      this.state = {
        ...this.state,
        energy: Math.max(0, this.state.energy - amount)
      };
      this._updateExpression();
      this._notify();
    } catch (error) {
      console.error('Pet decreaseEnergy failed:', error);
      throw error;
    }
  }

  public getCurrentEnergy(): number {
    return this.state.energy;
  }

  private _updateExpression(): void {
    const { STATE_THRESHOLDS, STATE_EXPRESSIONS } = this.deps.config;
    
    if (this.state.energy >= STATE_THRESHOLDS.HAPPY) {
      this.state.expression = STATE_EXPRESSIONS.HAPPY;
    } else if (this.state.energy >= STATE_THRESHOLDS.HUNGRY) {
      this.state.expression = STATE_EXPRESSIONS.HUNGRY;
    } else if (this.state.energy >= STATE_THRESHOLDS.SICK) {
      this.state.expression = STATE_EXPRESSIONS.SICK;
    } else {
      this.state.expression = STATE_EXPRESSIONS.DEAD;
    }
  }

  private _notify(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.getState());
      } catch (error) {
        console.error('Observer notification failed:', error);
      }
    });
  }
}