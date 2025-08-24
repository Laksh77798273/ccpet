import { IPetState } from '../core/Pet';
import { PET_CONFIG } from '../core/config';
import { ConfigService } from '../services/ConfigService';

export class StatusBarFormatter {
  private testMode: boolean;
  private configService: ConfigService;

  constructor(testMode: boolean = false) {
    this.testMode = testMode;
    this.configService = new ConfigService();
  }

  public formatPetDisplay(state: IPetState, animatedExpression?: string): string {
    try {
      const config = this.configService.getConfig();
      const lines: string[] = [];
      
      // Line 1: Always show pet info (non-configurable)
      const line1 = this.formatPetLine(state, animatedExpression);
      lines.push(line1);
      
      // Get available session data
      const sessionData = this.getSessionData(state);
      
      // Line 2: Configurable
      if (config.display.line2?.enabled && (config.display.maxLines || 2) >= 2) {
        const line2 = this.formatConfigurableLine(config.display.line2.items || [], sessionData);
        if (line2) {
          lines.push(line2);
        }
      }
      
      // Line 3: Configurable
      if (config.display.line3?.enabled && (config.display.maxLines || 2) >= 3) {
        const line3 = this.formatConfigurableLine(config.display.line3.items || [], sessionData);
        if (line3) {
          lines.push(line3);
        }
      }
      
      return lines.join(this.testMode ? '\n' : '\n');
    } catch (error) {
      console.error('Failed to format pet display:', error);
      return '(?) ERROR';
    }
  }

  private formatPetLine(state: IPetState, animatedExpression?: string): string {
    const energyBar = this.generateEnergyBar(state.energy);
    const energyValue = state.energy.toFixed(2);
    const tokensDisplay = this.formatTokenCount(state.accumulatedTokens);
    const lifetimeTokensDisplay = this.formatTokenCount(state.totalLifetimeTokens);
    const displayExpression = animatedExpression || state.expression;
    
    return this.testMode ? 
      `${displayExpression} ${energyBar} ${energyValue} (${tokensDisplay}) 💖${lifetimeTokensDisplay}` :
      `${PET_CONFIG.COLORS.PET_EXPRESSION}${displayExpression}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ENERGY_BAR}${energyBar}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ENERGY_VALUE}${energyValue}${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.ACCUMULATED_TOKENS}(${tokensDisplay})${PET_CONFIG.COLORS.RESET} ${PET_CONFIG.COLORS.LIFETIME_TOKENS}💖${lifetimeTokensDisplay}${PET_CONFIG.COLORS.RESET}`;
  }

  private getSessionData(state: IPetState): Record<string, { value: string; color: string }> {
    const sessionData: Record<string, { value: string; color: string }> = {};
    
    if (state.sessionTotalInputTokens !== undefined) {
      sessionData.input = {
        value: this.formatTokenCount(state.sessionTotalInputTokens),
        color: PET_CONFIG.COLORS.SESSION_INPUT
      };
    }
    
    if (state.sessionTotalOutputTokens !== undefined) {
      sessionData.output = {
        value: this.formatTokenCount(state.sessionTotalOutputTokens),
        color: PET_CONFIG.COLORS.SESSION_OUTPUT
      };
    }
    
    if (state.sessionTotalCachedTokens !== undefined) {
      sessionData.cached = {
        value: this.formatTokenCount(state.sessionTotalCachedTokens),
        color: PET_CONFIG.COLORS.SESSION_CACHED
      };
    }
    
    if (state.sessionTotalInputTokens !== undefined && 
        state.sessionTotalOutputTokens !== undefined &&
        state.sessionTotalCachedTokens !== undefined) {
      const total = state.sessionTotalInputTokens + state.sessionTotalOutputTokens + state.sessionTotalCachedTokens;
      sessionData.total = {
        value: this.formatTokenCount(total),
        color: PET_CONFIG.COLORS.SESSION_TOTAL
      };
    }
    
    return sessionData;
  }

  private formatConfigurableLine(items: string[], sessionData: Record<string, { value: string; color: string }>): string {
    const parts: string[] = [];
    
    for (const item of items) {
      if (sessionData[item]) {
        const data = sessionData[item];
        const label = item.charAt(0).toUpperCase() + item.slice(1);
        
        if (this.testMode) {
          parts.push(`${label}: ${data.value}`);
        } else {
          parts.push(`${data.color}${label}:${data.color} ${data.value}${PET_CONFIG.COLORS.RESET}`);
        }
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : '';
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