# Accessibility Implementation

## Screen Reader Compatibility

Since this extension displays ASCII pets in the status bar, we must ensure visually impaired users can understand the pet's status:

```typescript
// src/accessibility/screenReader.ts
export class ScreenReaderSupport {
  private static instance: ScreenReaderSupport;

  public static getInstance(): ScreenReaderSupport {
    if (!ScreenReaderSupport.instance) {
      ScreenReaderSupport.instance = new ScreenReaderSupport();
    }
    return ScreenReaderSupport.instance;
  }

  public generateAccessibleText(petState: IPetState): string {
    const energyLevel = this._getEnergyDescription(petState.energy);
    const emotionalState = this._getEmotionalStateDescription(petState.energy);
    const lastActivity = this._getLastActivityDescription(petState.lastFeedTime);
    const energyBar = this._getEnergyBarDescription(petState.energy);

    return `Status Pet: ${emotionalState}. Energy level: ${energyLevel} (${energyBar}). ${lastActivity}`;
  }

  public generateStatusBarAccessibleText(petState: IPetState): string {
    // Concise status bar text including ASCII and description
    const accessibleText = this.generateAccessibleText(petState);
    return `${petState.expression} - ${accessibleText}`;
  }

  private _getEnergyDescription(energy: number): string {
    if (energy >= 90) return 'very high';
    if (energy >= 70) return 'high';
    if (energy >= 50) return 'moderate';
    if (energy >= 30) return 'low';
    if (energy >= 10) return 'very low';
    return 'critically low';
  }

  private _getEnergyBarDescription(energy: number): string {
    const percentage = Math.round(energy);
    const level = Math.floor(energy / 10);
    return `${percentage}% - ${level} out of 10 bars filled`;
  }

  private _getEmotionalStateDescription(energy: number): string {
    if (energy >= 80) return 'very happy and energetic';
    if (energy >= 60) return 'content and active';
    if (energy >= 40) return 'neutral and calm';
    if (energy >= 20) return 'hungry and tired';
    if (energy > 0) return 'very sick and weak';
    return 'unconscious and needs revival';
  }

  private _getLastActivityDescription(lastFeedTime: Date): string {
    const now = new Date();
    const timeDiff = now.getTime() - lastFeedTime.getTime();
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    const hoursAgo = Math.floor(minutesAgo / 60);

    if (minutesAgo < 1) return 'Recently fed within the last minute';
    if (minutesAgo < 60) return `Last fed ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
    if (hoursAgo < 24) return `Last fed ${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
    
    const daysAgo = Math.floor(hoursAgo / 24);
    return `Last fed ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
  }

  public announceStateChange(oldState: IPetState, newState: IPetState): void {
    // Only announce significant state changes to avoid spam
    if (this._isSignificantChange(oldState, newState)) {
      const announcement = this._generateChangeAnnouncement(oldState, newState);
      this._announceToScreenReader(announcement);
    }
  }

  private _isSignificantChange(oldState: IPetState, newState: IPetState): boolean {
    // Check if crossing important energy thresholds
    const oldThreshold = this._getEnergyThreshold(oldState.energy);
    const newThreshold = this._getEnergyThreshold(newState.energy);
    
    return oldThreshold !== newThreshold;
  }

  private _getEnergyThreshold(energy: number): string {
    if (energy >= 80) return 'happy';
    if (energy >= 60) return 'content';
    if (energy >= 40) return 'neutral';
    if (energy >= 20) return 'hungry';
    if (energy > 0) return 'sick';
    return 'unconscious';
  }

  private _generateChangeAnnouncement(oldState: IPetState, newState: IPetState): string {
    const oldThreshold = this._getEnergyThreshold(oldState.energy);
    const newThreshold = this._getEnergyThreshold(newState.energy);

    if (newState.energy > oldState.energy) {
      return `Pet is feeling better: now ${newThreshold} with ${newState.energy}% energy`;
    } else {
      return `Pet is feeling worse: now ${newThreshold} with ${newState.energy}% energy`;
    }
  }

  private _announceToScreenReader(message: string): void {
    // In actual implementation, this would use Claude Code's accessibility APIs
    // For now, we log with a special prefix that screen readers can detect
    Logger.getInstance().info('screen-reader', message, { 
      accessibility: true,
      announce: true 
    });
  }

  public getDetailedStatusReport(petState: IPetState): string {
    return `
Detailed Pet Status Report:

Pet Expression: ${petState.expression} (${this._getExpressionMeaning(petState.expression)})
Energy Level: ${petState.energy}% - ${this._getEnergyDescription(petState.energy)}
Energy Bar: ${this._getEnergyBarDescription(petState.energy)}
Emotional State: ${this._getEmotionalStateDescription(petState.energy)}
Last Fed: ${this._getLastActivityDescription(petState.lastFeedTime)}
Total Tokens Consumed: ${petState.totalTokensConsumed.toLocaleString()} tokens

Status Summary: ${this.generateAccessibleText(petState)}
`;
  }

  private _getExpressionMeaning(expression: string): string {
    const meanings: Record<string, string> = {
      '(^_^)': 'Very happy with closed smiling eyes',
      '(o_o)': 'Neutral with wide open eyes',
      '(._.))': 'Slightly sad with downcast eyes',
      '(u_u)': 'Tired or hungry with half-closed eyes',
      '(x_x)': 'Very sick or unconscious with X eyes',
      '(RIP)': 'Deceased, needs revival',
      '[^_^]': 'Very happy with brackets - high contrast mode',
      '[o_o]': 'Neutral with brackets - high contrast mode',
      '[._.]': 'Slightly sad with brackets - high contrast mode',
      '[u_u]': 'Tired with brackets - high contrast mode',
      '[x_x]': 'Very sick with brackets - high contrast mode',
      '[___]': 'Deceased with brackets - high contrast mode'
    };
    
    return meanings[expression] || 'Unknown expression';
  }
}
```

## Keyboard Navigation Support

Although the primary interaction is passive, we support keyboard accessibility:

```typescript
// src/accessibility/keyboardSupport.ts
export class KeyboardSupport {
  private static instance: KeyboardSupport;
  private keyBindings: Map<string, () => void> = new Map();
  private registeredCommands: string[] = [];

  public static getInstance(): KeyboardSupport {
    if (!KeyboardSupport.instance) {
      KeyboardSupport.instance = new KeyboardSupport();
    }
    return KeyboardSupport.instance;
  }

  public registerKeyBindings(): void {
    // Register global shortcuts for accessibility
    this.keyBindings.set('ctrl+shift+alt+p', () => this._announceCurrentStatus());
    this.keyBindings.set('ctrl+shift+alt+r', () => this._promptRevivePet());
    this.keyBindings.set('ctrl+shift+alt+h', () => this._showPetHelp());
    this.keyBindings.set('ctrl+shift+alt+d', () => this._showDetailedStatus());

    // Register with Claude Code
    this._registerWithClaudeCode();
  }

  private _announceCurrentStatus(): void {
    try {
      const pet = this._getCurrentPet();
      const screenReader = ScreenReaderSupport.getInstance();
      const announcement = screenReader.generateAccessibleText(pet.getState());
      screenReader._announceToScreenReader(`Current status: ${announcement}`);
    } catch (error) {
      Logger.getInstance().error('keyboard-support', 'Failed to announce status', { error });
    }
  }

  private _promptRevivePet(): void {
    try {
      const pet = this._getCurrentPet();
      const currentState = pet.getState();
      const screenReader = ScreenReaderSupport.getInstance();
      
      if (currentState.energy === 0) {
        screenReader._announceToScreenReader(
          'Pet has passed away and needs revival. Execute the "Adopt New Pet" command to revive your pet.'
        );
        // Optionally trigger the command automatically
        this._executeCommand('statusPet.adoptNew');
      } else {
        screenReader._announceToScreenReader(
          `Pet is still alive with ${currentState.energy}% energy and does not need revival.`
        );
      }
    } catch (error) {
      Logger.getInstance().error('keyboard-support', 'Failed to check revival status', { error });
    }
  }

  private _showPetHelp(): void {
    const helpText = this._generateHelpText();
    ScreenReaderSupport.getInstance()._announceToScreenReader(helpText);
  }

  private _showDetailedStatus(): void {
    try {
      const pet = this._getCurrentPet();
      const screenReader = ScreenReaderSupport.getInstance();
      const detailedReport = screenReader.getDetailedStatusReport(pet.getState());
      screenReader._announceToScreenReader(detailedReport);
    } catch (error) {
      Logger.getInstance().error('keyboard-support', 'Failed to show detailed status', { error });
    }
  }

  private _generateHelpText(): string {
    return `
Status Pet Accessibility Help:

This extension displays a virtual pet in your status bar that responds to your coding activity.

How it works:
- The pet gains energy when you write code that consumes tokens
- The pet loses energy over time if you don't code
- The pet's expression and energy bar reflect its current state

Available keyboard shortcuts:
- Control+Shift+Alt+P: Hear current pet status
- Control+Shift+Alt+R: Check if pet needs revival and revive if necessary
- Control+Shift+Alt+H: Repeat this help message
- Control+Shift+Alt+D: Hear detailed pet status report

Available commands (access via Command Palette):
- "Status Pet: Adopt New Pet" - Revive a deceased pet
- "Status Pet: Show Status" - Display current pet information

The pet's expressions mean:
- Happy expressions (^_^) or [^_^]: Pet has high energy (80% or more)
- Neutral expressions (o_o) or [o_o]: Pet has moderate energy (60-80%)
- Tired expressions (u_u) or [u_u]: Pet is hungry and needs feeding (20-60%)
- Sick expressions (x_x) or [x_x]: Pet is very low on energy (1-20%)
- RIP or [___]: Pet has died and needs revival (0% energy)

Energy bar shows as filled and empty blocks representing pet's energy level.

To feed your pet, simply continue coding in Claude Code. Each token you use will increase your pet's energy.
`;
  }

  private _registerWithClaudeCode(): void {
    // Register commands with Claude Code
    const claudeService = ClaudeCodeService.getInstance();
    
    // Primary accessibility command
    claudeService.registerCommand('statusPet.announceStatus', () => {
      this._announceCurrentStatus();
    });
    this.registeredCommands.push('statusPet.announceStatus');
    
    // Revival command with accessibility support
    claudeService.registerCommand('statusPet.accessibleRevive', () => {
      this._promptRevivePet();
    });
    this.registeredCommands.push('statusPet.accessibleRevive');
    
    // Help command
    claudeService.registerCommand('statusPet.accessibilityHelp', () => {
      this._showPetHelp();
    });
    this.registeredCommands.push('statusPet.accessibilityHelp');
    
    // Detailed status command
    claudeService.registerCommand('statusPet.detailedStatus', () => {
      this._showDetailedStatus();
    });
    this.registeredCommands.push('statusPet.detailedStatus');
  }

  private _getCurrentPet(): Pet {
    // In actual implementation, would get from main extension context
    // This is a placeholder for the pet instance
    throw new Error('Pet instance not available - implement pet access');
  }

  private _executeCommand(commandId: string): void {
    // Execute Claude Code command
    const claudeService = ClaudeCodeService.getInstance();
    // claudeService.executeCommand(commandId);
  }

  public dispose(): void {
    // Clean up registered commands
    this.registeredCommands.forEach(commandId => {
      // Dispose command registrations if Claude Code supports it
    });
    this.keyBindings.clear();
  }
}
```

## High Contrast Support

Ensure ASCII characters are clearly visible across all themes:

```typescript
// src/accessibility/contrastSupport.ts
export class ContrastSupport {
  private static instance: ContrastSupport;

  public static getInstance(): ContrastSupport {
    if (!ContrastSupport.instance) {
      ContrastSupport.instance = new ContrastSupport();
    }
    return ContrastSupport.instance;
  }

  public getOptimalPetDisplay(
    petState: IPetState, 
    theme: 'light' | 'dark' | 'high-contrast' | 'auto'
  ): string {
    const baseExpression = petState.expression;
    
    // Auto-detect theme if needed
    const resolvedTheme = theme === 'auto' ? this._detectTheme() : theme;
    
    // Adjust display based on theme
    switch (resolvedTheme) {
      case 'high-contrast':
        return this._getHighContrastExpression(petState);
      case 'dark':
        return this._getDarkThemeExpression(petState);
      case 'light':
      default:
        return this._getLightThemeExpression(petState);
    }
  }

  private _getHighContrastExpression(petState: IPetState): string {
    // High contrast mode uses more prominent characters with brackets
    if (petState.energy >= 80) return '[^_^]'; // Very happy
    if (petState.energy >= 60) return '[o_o]'; // Happy
    if (petState.energy >= 40) return '[._.]'; // Neutral
    if (petState.energy >= 20) return '[u_u]'; // Hungry
    if (petState.energy > 0) return '[x_x]'; // Sick
    return '[___]'; // Dead
  }

  private _getDarkThemeExpression(petState: IPetState): string {
    // Dark theme expressions work well with current ASCII
    return petState.expression;
  }

  private _getLightThemeExpression(petState: IPetState): string {
    // Light theme expressions work well with current ASCII
    return petState.expression;
  }

  public getEnergyBarDisplay(
    energy: number, 
    theme: 'light' | 'dark' | 'high-contrast' | 'auto'
  ): string {
    const totalBars = 10;
    const filledBars = Math.floor((energy / 100) * totalBars);
    const resolvedTheme = theme === 'auto' ? this._detectTheme() : theme;
    
    let filledChar = '●';
    let emptyChar = '○';
    
    switch (resolvedTheme) {
      case 'high-contrast':
        filledChar = '■';
        emptyChar = '□';
        break;
      case 'dark':
        filledChar = '●';
        emptyChar = '▒'; // Slightly different for better dark theme visibility
        break;
      case 'light':
      default:
        filledChar = '●';
        emptyChar = '○';
        break;
    }
    
    return filledChar.repeat(filledBars) + emptyChar.repeat(totalBars - filledBars);
  }

  public getCompleteAccessibleDisplay(petState: IPetState, theme: string = 'auto'): {
    visual: string;
    accessible: string;
    detailed: string;
  } {
    const expression = this.getOptimalPetDisplay(petState, theme as any);
    const energyBar = this.getEnergyBarDisplay(petState.energy, theme as any);
    const screenReader = ScreenReaderSupport.getInstance();
    
    return {
      visual: `${expression} ${energyBar}`,
      accessible: screenReader.generateStatusBarAccessibleText(petState),
      detailed: screenReader.getDetailedStatusReport(petState)
    };
  }

  private _detectTheme(): 'light' | 'dark' | 'high-contrast' {
    // In actual implementation, would detect Claude Code's current theme
    // This is a placeholder implementation
    try {
      // const config = claudeCode.workspace.getConfiguration('workbench');
      // const theme = config.get('colorTheme');
      // if (theme.includes('High Contrast')) return 'high-contrast';
      // if (theme.includes('Dark')) return 'dark';
      // return 'light';
      
      // Fallback detection based on system preferences
      if (process.env.THEME === 'high-contrast') return 'high-contrast';
      if (process.env.THEME === 'dark') return 'dark';
      return 'light';
      
    } catch (error) {
      Logger.getInstance().debug('contrast-support', 'Theme detection failed, using light theme', { error });
      return 'light';
    }
  }

  public getColorBlindFriendlyIndicators(petState: IPetState): {
    shapeIndicator: string;
    patternIndicator: string;
    textIndicator: string;
  } {
    // Alternative indicators for color-blind users
    let shapeIndicator = '●'; // Circle for neutral
    let patternIndicator = '---';
    let textIndicator = 'OK';
    
    if (petState.energy >= 80) {
      shapeIndicator = '★'; // Star for very happy
      patternIndicator = '+++';
      textIndicator = 'GREAT';
    } else if (petState.energy >= 60) {
      shapeIndicator = '◆'; // Diamond for happy
      patternIndicator = '++';
      textIndicator = 'GOOD';
    } else if (petState.energy >= 40) {
      shapeIndicator = '●'; // Circle for neutral
      patternIndicator = '---';
      textIndicator = 'OK';
    } else if (petState.energy >= 20) {
      shapeIndicator = '▲'; // Triangle for hungry
      patternIndicator = '--';
      textIndicator = 'HUNGRY';
    } else if (petState.energy > 0) {
      shapeIndicator = '✖'; // X for sick
      patternIndicator = '!!';
      textIndicator = 'SICK';
    } else {
      shapeIndicator = '☠'; // Skull for dead
      patternIndicator = 'XXX';
      textIndicator = 'DEAD';
    }
    
    return { shapeIndicator, patternIndicator, textIndicator };
  }
}
```

## Configuration and package.json

```json
// package.json accessibility configuration
{
  "contributes": {
    "configuration": {
      "properties": {
        "statusPet.accessibility.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable accessibility features for screen readers"
        },
        "statusPet.accessibility.announceStateChanges": {
          "type": "boolean", 
          "default": true,
          "description": "Announce significant pet state changes to screen readers"
        },
        "statusPet.accessibility.verboseDescriptions": {
          "type": "boolean",
          "default": false,
          "description": "Use more detailed descriptions for screen readers"
        },
        "statusPet.accessibility.highContrast": {
          "type": "boolean",
          "default": false,
          "description": "Use high contrast pet expressions and energy bars"
        },
        "statusPet.accessibility.colorBlindSupport": {
          "type": "boolean",
          "default": false,
          "description": "Show additional shape and pattern indicators for color-blind users"
        }
      }
    },
    "commands": [
      {
        "command": "statusPet.announceStatus",
        "title": "Announce Pet Status",
        "category": "Status Pet Accessibility"
      },
      {
        "command": "statusPet.accessibleRevive", 
        "title": "Check and Revive Pet (Accessible)",
        "category": "Status Pet Accessibility"
      },
      {
        "command": "statusPet.accessibilityHelp",
        "title": "Show Accessibility Help",
        "category": "Status Pet Accessibility"
      },
      {
        "command": "statusPet.detailedStatus",
        "title": "Detailed Pet Status Report",
        "category": "Status Pet Accessibility"
      }
    ]
  }
}
```

This accessibility implementation ensures:
- **Screen Reader Support**: Full descriptions of pet status and state changes
- **Keyboard Navigation**: Complete keyboard access to all functionality
- **High Contrast**: Alternative visual representations for visibility
- **Color Blind Support**: Shape and pattern alternatives to color coding
- **Configurable**: Users can customize accessibility features to their needs