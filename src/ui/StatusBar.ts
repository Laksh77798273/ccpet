import { IPetState } from '../core/Pet';
import { PET_CONFIG } from '../core/config';

export class StatusBarFormatter {
  private testMode: boolean;

  constructor(testMode: boolean = false) {
    this.testMode = testMode;
  }

  public formatPetDisplay(state: IPetState): string {
    try {
      const energyBar = this.generateEnergyBar(state.energy);
      const energyValue = state.energy.toFixed(2);
      const tokensDisplay = this.formatTokenCount(state.accumulatedTokens);
      
      // First line: pet expression, energy bar, energy value, accumulated tokens with colors
      const firstLine = this.testMode ? 
        `${state.expression} ${energyBar} ${energyValue} (${tokensDisplay})` :
        `\x1b[1;97m${state.expression}\x1b[0m \x1b[32m${energyBar}\x1b[0m \x1b[34m${energyValue}\x1b[0m \x1b[36m(${tokensDisplay})\x1b[0m`;
      
      // Second line: session token info if available
      let secondLine = '';
      if (state.sessionTotalInputTokens !== undefined && 
          state.sessionTotalOutputTokens !== undefined &&
          state.sessionTotalCachedTokens !== undefined) {
        const inTokens = this.formatTokenCount(state.sessionTotalInputTokens);
        const outTokens = this.formatTokenCount(state.sessionTotalOutputTokens);
        const cachedTokens = this.formatTokenCount(state.sessionTotalCachedTokens);
        const totalSessionTokens = this.formatTokenCount(
          state.sessionTotalInputTokens + state.sessionTotalOutputTokens + state.sessionTotalCachedTokens
        );
        
        secondLine = this.testMode ?
          ` In: ${inTokens} Out: ${outTokens} Cached: ${cachedTokens} Total: ${totalSessionTokens}` :
          `\n\x1b[32mIn:\x1b[32m ${inTokens}\x1b[0m \x1b[33mOut:\x1b[33m ${outTokens}\x1b[0m \x1b[36mCached:\x1b[36m ${cachedTokens}\x1b[0m \x1b[37mTotal:\x1b[37m ${totalSessionTokens}\x1b[0m`;
      }
      
      return `${firstLine}${secondLine}`;
    } catch (error) {
      console.error('Failed to format pet display:', error);
      return '(?) ERROR';
    }
  }

  public generateEnergyBar(energy: number): string {
    try {
      if (isNaN(energy)) {
        return '??????????';
      }
      
      const clampedEnergy = Math.max(0, Math.min(100, energy));
      const filledBars = Math.round((clampedEnergy / 100) * PET_CONFIG.ENERGY_BAR_LENGTH);
      const emptyBars = PET_CONFIG.ENERGY_BAR_LENGTH - filledBars;
      
      return (
        PET_CONFIG.FILLED_BAR_CHAR.repeat(filledBars) +
        PET_CONFIG.EMPTY_BAR_CHAR.repeat(emptyBars)
      );
    } catch (error) {
      console.error('Failed to generate energy bar:', error);
      return '??????????';
    }
  }

  public formatTokenCount(tokens: number): string {
    try {
      if (isNaN(tokens)) {
        return '?';
      }
      if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(2)}M`;
      } else if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
      } else {
        return tokens.toString();
      }
    } catch (error) {
      console.error('Failed to format token count:', error);
      return '?';
    }
  }

}