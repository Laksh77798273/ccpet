import { PET_CONFIG } from './config';

export interface IPetState {
  energy: number;
  expression: string;
  lastFeedTime: Date;
  totalTokensConsumed: number;
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
      this.state = {
        ...this.state,
        energy: Math.min(100, this.state.energy + (tokens * 10)),
        lastFeedTime: new Date(),
        totalTokensConsumed: this.state.totalTokensConsumed + tokens
      };
      this._updateExpression();
      this._notify();
    } catch (error) {
      console.error('Pet feeding failed:', error);
    }
  }

  public applyTimeDecay(): void {
    try {
      const now = new Date();
      const hoursSinceLastFeed = Math.floor(
        (now.getTime() - this.state.lastFeedTime.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursSinceLastFeed > 0) {
        this.state = {
          ...this.state,
          energy: Math.max(0, this.state.energy - (hoursSinceLastFeed * 5))
        };
        this._updateExpression();
        this._notify();
      }
    } catch (error) {
      console.error('Pet time decay failed:', error);
    }
  }

  private _updateExpression(): void {
    if (this.state.energy >= this.deps.config.HAPPY_EXPRESSION_THRESHOLD) {
      this.state.expression = this.deps.config.HAPPY_EXPRESSION;
    } else if (this.state.energy >= 50) {
      this.state.expression = '(o_o)';
    } else if (this.state.energy >= 20) {
      this.state.expression = '(~_~)';
    } else {
      this.state.expression = '(x_x)';
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