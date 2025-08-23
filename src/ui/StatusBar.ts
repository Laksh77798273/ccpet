import { IPetState } from '../core/Pet';
import { PET_CONFIG } from '../core/config';

export class StatusBarFormatter {
  private testMode: boolean;

  constructor(testMode: boolean = false) {
    this.testMode = testMode;
  }

  public formatPetDisplay(state: IPetState, animatedExpression?: string): string {
    try {
      const energyBar = this.generateEnergyBar(state.energy);
      const energyValue = state.energy.toFixed(2);
      const tokensDisplay = this.formatTokenCount(state.accumulatedTokens);
      const lifetimeTokensDisplay = this.formatTokenCount(state.totalLifetimeTokens);
      
      // 使用动画表情（如果提供的话），否则使用状态中的表情
      const displayExpression = animatedExpression || state.expression;
      
      // First line: pet expression, energy bar, energy value, accumulated tokens, lifetime tokens with colors
      const firstLine = this.testMode ? 
        `${displayExpression} ${energyBar} ${energyValue} (${tokensDisplay}) 💖${lifetimeTokensDisplay}` :
        `${PET_CONFIG.COLORS.PET_EXPRESSION}${displayExpression}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ENERGY_BAR}${energyBar}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ENERGY_VALUE}${energyValue}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ACCUMULATED_TOKENS}(${tokensDisplay})${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.LIFETIME_TOKENS}💖${lifetimeTokensDisplay}${PET_CONFIG.COLORS.RESET}`;
      
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
          `\n${PET_CONFIG.COLORS.SESSION_INPUT}In:${PET_CONFIG.COLORS.SESSION_INPUT} ${inTokens}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.SESSION_OUTPUT}Out:${PET_CONFIG.COLORS.SESSION_OUTPUT} ${outTokens}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.SESSION_CACHED}Cached:${PET_CONFIG.COLORS.SESSION_CACHED} ${cachedTokens}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.SESSION_TOTAL}Total:${PET_CONFIG.COLORS.SESSION_TOTAL} ${totalSessionTokens}${PET_CONFIG.COLORS.RESET}`;
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