import { ConfigService } from '../services/ConfigService';

export class ConfigCommand {
  name = 'config';
  description = 'Manage ccpet configuration';
  private configService = new ConfigService();

  async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const subCommand = args[0];

    switch (subCommand) {
      case 'list':
        await this.listConfig();
        break;
      case 'set':
        await this.setConfig(args.slice(1));
        break;
      case 'reset':
        await this.resetConfig();
        break;
      case 'path':
        await this.showConfigPath();
        break;
      default:
        console.error(`Unknown config command: ${subCommand}`);
        this.showHelp();
        process.exit(1);
    }
  }

  private showHelp(): void {
    console.log('ccpet config - Configuration management');
    console.log('');
    console.log('Usage: ccpet config <subcommand> [options]');
    console.log('');
    console.log('Subcommands:');
    console.log('  list                     List current configuration');
    console.log('  set <key> <value>        Set configuration value');
    console.log('  reset                    Reset to default configuration');
    console.log('  path                     Show configuration file path');
    console.log('');
    console.log('Configuration keys:');
    console.log('  colors.petExpression     Pet expression color');
    console.log('  colors.energyBar         Energy bar color');
    console.log('  colors.energyValue       Energy value color');
    console.log('  colors.accumulatedTokens Accumulated tokens color');
    console.log('  colors.lifetimeTokens    Lifetime tokens color');
    console.log('  colors.sessionInput      Session input color');
    console.log('  colors.sessionOutput     Session output color');
    console.log('  colors.sessionCached     Session cached color');
    console.log('  colors.sessionTotal      Session total color');
    console.log('  pet.animationEnabled     Enable/disable animations (true/false)');
    console.log('  pet.decayRate           Energy decay rate per minute');
    console.log('');
    console.log('Examples:');
    console.log('  ccpet config set colors.petExpression "#FF0000:bright"');
    console.log('  ccpet config set pet.animationEnabled false');
    console.log('  ccpet config set pet.decayRate 0.05');
  }

  private async listConfig(): Promise<void> {
    try {
      const config = this.configService.listConfig();
      console.log('Current configuration:');
      console.log(config);
    } catch (error) {
      console.error('Failed to list configuration:', error.message);
      process.exit(1);
    }
  }

  private async setConfig(args: string[]): Promise<void> {
    if (args.length !== 2) {
      console.error('Usage: ccpet config set <key> <value>');
      process.exit(1);
    }

    const [key, value] = args;
    
    try {
      if (key.startsWith('colors.')) {
        const colorKey = key.replace('colors.', '') as any;
        this.configService.setColorConfig(colorKey, value);
        console.log(`✅ Set ${key} = ${value}`);
      } else if (key.startsWith('pet.')) {
        const petKey = key.replace('pet.', '') as any;
        let parsedValue: any = value;
        
        // Parse boolean and number values
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);
        
        this.configService.setPetConfig(petKey, parsedValue);
        console.log(`✅ Set ${key} = ${parsedValue}`);
      } else {
        console.error(`Unknown configuration key: ${key}`);
        console.error('Run "ccpet config" to see available keys.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to set configuration:', error.message);
      process.exit(1);
    }
  }

  private async resetConfig(): Promise<void> {
    try {
      this.configService.resetConfig();
      console.log('✅ Configuration reset to defaults');
    } catch (error) {
      console.error('Failed to reset configuration:', error.message);
      process.exit(1);
    }
  }

  private async showConfigPath(): Promise<void> {
    try {
      const path = this.configService.getConfigPath();
      console.log(`Configuration file: ${path}`);
    } catch (error) {
      console.error('Failed to get configuration path:', error.message);
      process.exit(1);
    }
  }
}