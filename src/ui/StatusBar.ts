import { IPetState } from '../core/Pet';
import { PET_CONFIG, validateLine1Items, Line1ItemType } from '../core/config';
import { ConfigService } from '../services/ConfigService';

export class StatusBarFormatter {
  private testMode: boolean;
  private configService: ConfigService;

  constructor(testMode: boolean = false, configService?: ConfigService) {
    this.testMode = testMode;
    this.configService = configService || new ConfigService();
  }

  public formatPetDisplay(state: IPetState, animatedExpression?: string): string {
    try {
      const config = this.configService.getConfig();
      const lines: string[] = [];
      
      // Line 1: Configurable (with fallback to default behavior)
      if (config.display.line1?.enabled !== false && (config.display.maxLines || 3) >= 1) {
        const line1 = config.display.line1?.items 
          ? this.formatConfigurablePetLine(config.display.line1.items, state, animatedExpression)
          : this.formatPetLine(state, animatedExpression); // Fallback for backward compatibility
        lines.push(line1);
      }
      
      // Get available session data
      const sessionData = this.getSessionData(state);
      
      // Line 2: Configurable
      if (config.display.line2?.enabled && (config.display.maxLines || 3) >= 2) {
        const line2 = this.formatConfigurableLine(config.display.line2.items || [], sessionData);
        if (line2) {
          lines.push(line2);
        }
      }
      
      // Line 3: Configurable
      if (config.display.line3?.enabled && (config.display.maxLines || 3) >= 3) {
        const line3 = this.formatConfigurableLine(config.display.line3.items || [], sessionData);
        if (line3) {
          lines.push(line3);
        }
      }
      
      return lines.join(this.testMode ? '\n' : '\n');
    } catch (error) {
      console.error('Failed to format pet display:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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

  private formatConfigurablePetLine(items: string[], state: IPetState, animatedExpression?: string): string {
    try {
      // Validate and filter items
      const validItems = validateLine1Items(items);
      if (validItems.length === 0) {
        console.warn('No valid line1 items found, falling back to default format');
        return this.formatPetLine(state, animatedExpression);
      }

      const line1Data = this.getLine1Data(state, animatedExpression);
      const parts: string[] = [];

      for (const item of validItems) {
        if (line1Data[item]) {
          const data = line1Data[item];
          if (this.testMode) {
            parts.push(data.value);
          } else {
            parts.push(`${data.color}${data.value}${PET_CONFIG.COLORS.RESET}`);
          }
        } else {
          console.warn(`Line1 data not available for item: ${item}`);
        }
      }

      return parts.length > 0 ? parts.join(' ') : this.formatPetLine(state, animatedExpression);
    } catch (error) {
      console.error('Error in formatConfigurablePetLine:', error);
      return this.formatPetLine(state, animatedExpression);
    }
  }

  private getLine1Data(state: IPetState, animatedExpression?: string): Record<Line1ItemType, { value: string; color: string }> {
    const displayExpression = animatedExpression || state.expression;
    const energyBar = this.generateEnergyBar(state.energy);
    const energyValue = state.energy.toFixed(2);
    const tokensDisplay = this.formatTokenCount(state.accumulatedTokens);
    const lifetimeTokensDisplay = this.formatTokenCount(state.totalLifetimeTokens);

    return {
      'expression': {
        value: displayExpression,
        color: PET_CONFIG.COLORS.PET_EXPRESSION
      },
      'energy-bar': {
        value: energyBar,
        color: PET_CONFIG.COLORS.ENERGY_BAR
      },
      'energy-value': {
        value: energyValue,
        color: PET_CONFIG.COLORS.ENERGY_VALUE
      },
      'accumulated-tokens': {
        value: `(${tokensDisplay})`,
        color: PET_CONFIG.COLORS.ACCUMULATED_TOKENS
      },
      'lifetime-tokens': {
        value: `💖${lifetimeTokensDisplay}`,
        color: PET_CONFIG.COLORS.LIFETIME_TOKENS
      },
      'pet-name': {
        value: 'Pet', // Placeholder for Story 4.2
        color: PET_CONFIG.COLORS.PET_EXPRESSION
      }
    };
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
    
    // Add cost information
    if (state.sessionTotalCostUsd !== undefined) {
      sessionData['cost'] = {
        value: `$${state.sessionTotalCostUsd.toFixed(2)}`,
        color: PET_CONFIG.COLORS.COST
      };
    }
    
    // Add context metrics
    if (state.contextLength !== undefined) {
      sessionData['context-length'] = {
        value: this.formatTokenCount(state.contextLength),
        color: PET_CONFIG.COLORS.CONTEXT_LENGTH
      };
    }
    
    if (state.contextPercentage !== undefined) {
      sessionData['context-percentage'] = {
        value: !isNaN(state.contextPercentage) ? `${state.contextPercentage.toFixed(1)}%` : '0.0%',
        color: PET_CONFIG.COLORS.CONTEXT_PERCENTAGE
      };
    }
    
    if (state.contextPercentageUsable !== undefined) {
      sessionData['context-percentage-usable'] = {
        value: !isNaN(state.contextPercentageUsable) ? `${state.contextPercentageUsable.toFixed(1)}%` : '0.0%',
        color: PET_CONFIG.COLORS.CONTEXT_PERCENTAGE_USABLE
      };
    }
    
    return sessionData;
  }

  private formatConfigurableLine(items: string[], sessionData: Record<string, { value: string; color: string }>): string {
    const parts: string[] = [];
    
    for (const item of items) {
      if (sessionData[item]) {
        const data = sessionData[item];
        let label: string;
        
        // Custom labels for items
        if (item === 'context-length') {
          label = 'Ctx';
        } else if (item === 'context-percentage') {
          label = 'Ctx';
        } else if (item === 'context-percentage-usable') {
          label = 'Ctx(u)';
        } else if (item === 'cost') {
          label = 'Cost';
        } else {
          label = item.charAt(0).toUpperCase() + item.slice(1);
        }
        
        if (this.testMode) {
          parts.push(`${label}: ${data.value}`);
        } else {
          parts.push(`${data.color}${label}: ${data.value}${PET_CONFIG.COLORS.RESET}`);
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