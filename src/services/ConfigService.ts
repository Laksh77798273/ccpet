import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UserConfig {
  colors: {
    petExpression?: string;
    energyBar?: string;
    energyValue?: string;
    accumulatedTokens?: string;
    lifetimeTokens?: string;
    sessionInput?: string;
    sessionOutput?: string;
    sessionCached?: string;
    sessionTotal?: string;
  };
  pet: {
    animationEnabled?: boolean;
    decayRate?: number;
  };
}

const DEFAULT_CONFIG: UserConfig = {
  colors: {
    petExpression: '#FFFF00:bright:bold',
    energyBar: '#00FF00',
    energyValue: '#00FFFF',
    accumulatedTokens: '#778899',
    lifetimeTokens: '#FF00FF',
    sessionInput: '#00FF00',
    sessionOutput: '#FFFF00',
    sessionCached: '#F4A460',
    sessionTotal: '#FFFFFF'
  },
  pet: {
    animationEnabled: true,
    decayRate: 0.0231
  }
};

export class ConfigService {
  private readonly configDir: string;
  private readonly configFile: string;
  private cachedConfig: UserConfig | null = null;

  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-pet');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  private loadConfig(): UserConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    this.ensureConfigDir();

    if (!fs.existsSync(this.configFile)) {
      // Create default config if it doesn't exist
      this.saveConfig(DEFAULT_CONFIG);
      this.cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }

    try {
      const configData = fs.readFileSync(this.configFile, 'utf8');
      const userConfig = JSON.parse(configData);
      
      // Merge with defaults to ensure all properties exist
      this.cachedConfig = this.mergeWithDefaults(userConfig);
      return this.cachedConfig;
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error.message);
      this.cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  private mergeWithDefaults(userConfig: Partial<UserConfig>): UserConfig {
    return {
      colors: {
        ...DEFAULT_CONFIG.colors,
        ...userConfig.colors
      },
      pet: {
        ...DEFAULT_CONFIG.pet,
        ...userConfig.pet
      }
    };
  }

  private saveConfig(config: UserConfig): void {
    this.ensureConfigDir();
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');
    this.cachedConfig = config;
  }

  getConfig(): UserConfig {
    return this.loadConfig();
  }

  setColorConfig(key: keyof UserConfig['colors'], value: string): void {
    const config = this.loadConfig();
    config.colors[key] = value;
    this.saveConfig(config);
  }

  setPetConfig(key: keyof UserConfig['pet'], value: any): void {
    const config = this.loadConfig();
    config.pet[key] = value;
    this.saveConfig(config);
  }

  resetConfig(): void {
    this.saveConfig(DEFAULT_CONFIG);
  }

  listConfig(): string {
    const config = this.getConfig();
    return JSON.stringify(config, null, 2);
  }

  getConfigPath(): string {
    return this.configFile;
  }
}