# Environment Configuration

## Configuration Management

All configurable parameters are centralized in `src/core/config.ts` for easy management:

```typescript
// src/core/config.ts
export const config = {
  // Pet behavior settings
  ENERGY_DECAY_RATE: 5, // Energy lost per hour of inactivity
  DECAY_INTERVAL_MS: 60 * 60 * 1000, // 1 hour decay check interval
  FEED_VALUE_PER_TOKEN: 0.1, // Energy gained per token consumed
  
  // State thresholds for pet expressions
  STATE_THRESHOLDS: {
    HAPPY: 80,   // Energy level for happy expression
    NEUTRAL: 60, // Energy level for neutral expression  
    HUNGRY: 40,  // Energy level for hungry expression
    SICK: 10,    // Energy level for sick expression
    DEAD: 0      // Energy level for death
  },
  
  // UI settings
  STATUS_BAR_PRIORITY: 100, // Position priority in status bar
  STATUS_BAR_ALIGNMENT: 'right', // 'left' or 'right'
  UPDATE_DEBOUNCE_MS: 100, // Debounce time for UI updates
  
  // Performance settings
  MAX_LOG_ENTRIES: 1000, // Maximum log entries to keep
  MAX_ERROR_LOG_ENTRIES: 100, // Maximum error entries to keep
  MEMORY_CHECK_INTERVAL_MS: 30000, // Memory check every 30 seconds
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minute cache TTL
  
  // Security settings
  MAX_TOKEN_COUNT_PER_OPERATION: 10000, // Rate limiting
  MAX_OPERATIONS_PER_MINUTE: 60,
  ENCRYPTION_KEY_ROTATION_DAYS: 30,
  
  // Development settings
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_SECURITY_LOGGING: true
};

export type ConfigKey = keyof typeof config;
export type ConfigValue<K extends ConfigKey> = typeof config[K];
```

## Environment-Specific Configuration

```typescript
// src/config/environments.ts
export interface IEnvironmentConfig {
  environment: 'development' | 'production' | 'test';
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  metricsEnabled: boolean;
  healthCheckInterval: number;
  debugMode: boolean;
  performanceMonitoring: boolean;
  securityAuditing: boolean;
  cacheTTL: number;
}

export class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private config: IEnvironmentConfig;

  private constructor() {
    this.config = this._loadEnvironmentConfig();
  }

  public static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  public getConfig(): IEnvironmentConfig {
    return { ...this.config };
  }

  public get<K extends keyof IEnvironmentConfig>(key: K): IEnvironmentConfig[K] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isTest(): boolean {
    return this.config.environment === 'test';
  }

  private _loadEnvironmentConfig(): IEnvironmentConfig {
    const env = (process.env.NODE_ENV as any) || 'development';
    
    const baseConfig: IEnvironmentConfig = {
      environment: env,
      logLevel: 'INFO',
      metricsEnabled: false,
      healthCheckInterval: 30000,
      debugMode: false,
      performanceMonitoring: false,
      securityAuditing: true,
      cacheTTL: 5 * 60 * 1000
    };

    switch (env) {
      case 'development':
        return {
          ...baseConfig,
          logLevel: 'DEBUG',
          metricsEnabled: true,
          debugMode: true,
          performanceMonitoring: true,
          securityAuditing: true,
          healthCheckInterval: 10000, // More frequent in dev
          cacheTTL: 30 * 1000 // Shorter cache in dev
        };
      
      case 'production':
        return {
          ...baseConfig,
          logLevel: 'WARN',
          metricsEnabled: true,
          debugMode: false,
          performanceMonitoring: true,
          securityAuditing: true,
          healthCheckInterval: 60000, // Less frequent in prod
          cacheTTL: 10 * 60 * 1000 // Longer cache in prod
        };
      
      case 'test':
        return {
          ...baseConfig,
          logLevel: 'ERROR',
          metricsEnabled: false,
          debugMode: true,
          performanceMonitoring: false,
          securityAuditing: false,
          healthCheckInterval: 5000, // Fast for testing
          cacheTTL: 1000 // Very short for testing
        };
      
      default:
        Logger.getInstance().warn('environment', `Unknown environment: ${env}, using development defaults`);
        return {
          ...baseConfig,
          environment: 'development',
          logLevel: 'DEBUG',
          debugMode: true
        };
    }
  }

  public updateConfig(updates: Partial<IEnvironmentConfig>): void {
    this.config = { ...this.config, ...updates };
    Logger.getInstance().info('environment', 'Configuration updated', updates);
  }
}
```

## User Configuration Integration

```typescript
// src/config/userConfig.ts
export interface IUserConfig {
  enabled: boolean;
  petName?: string;
  theme: 'auto' | 'light' | 'dark' | 'high-contrast';
  accessibility: {
    enabled: boolean;
    announceStateChanges: boolean;
    verboseDescriptions: boolean;
    colorBlindSupport: boolean;
  };
  performance: {
    updateFrequency: 'low' | 'normal' | 'high';
    memoryOptimization: boolean;
  };
  privacy: {
    localStorageOnly: boolean;
    encryptStorage: boolean;
  };
}

export class UserConfigManager {
  private static instance: UserConfigManager;
  private config: IUserConfig;
  private claudeService: ClaudeCodeService;

  private constructor(claudeService: ClaudeCodeService) {
    this.claudeService = claudeService;
    this.config = this._getDefaultConfig();
  }

  public static getInstance(claudeService?: ClaudeCodeService): UserConfigManager {
    if (!UserConfigManager.instance) {
      if (!claudeService) {
        throw new Error('ClaudeCodeService required for first initialization');
      }
      UserConfigManager.instance = new UserConfigManager(claudeService);
    }
    return UserConfigManager.instance;
  }

  public async loadConfig(): Promise<void> {
    try {
      // Load from Claude Code configuration
      const claudeConfig = this._getClaudeCodeConfiguration();
      this.config = { ...this._getDefaultConfig(), ...claudeConfig };
      
      Logger.getInstance().info('user-config', 'User configuration loaded', {
        enabled: this.config.enabled,
        theme: this.config.theme,
        accessibilityEnabled: this.config.accessibility.enabled
      });
    } catch (error) {
      Logger.getInstance().warn('user-config', 'Failed to load user config, using defaults', { error });
      this.config = this._getDefaultConfig();
    }
  }

  public async saveConfig(updates: Partial<IUserConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await this._saveToClaudeCode(this.config);
      
      Logger.getInstance().info('user-config', 'User configuration saved', updates);
    } catch (error) {
      Logger.getInstance().error('user-config', 'Failed to save user config', { error });
      throw new Error('Configuration save failed');
    }
  }

  public getConfig(): IUserConfig {
    return { ...this.config };
  }

  public get<K extends keyof IUserConfig>(key: K): IUserConfig[K] {
    return this.config[key];
  }

  private _getDefaultConfig(): IUserConfig {
    return {
      enabled: true,
      theme: 'auto',
      accessibility: {
        enabled: true,
        announceStateChanges: true,
        verboseDescriptions: false,
        colorBlindSupport: false
      },
      performance: {
        updateFrequency: 'normal',
        memoryOptimization: true
      },
      privacy: {
        localStorageOnly: true,
        encryptStorage: true
      }
    };
  }

  private _getClaudeCodeConfiguration(): Partial<IUserConfig> {
    // In actual implementation, would use Claude Code's configuration API
    // This is a placeholder showing the structure
    return {
      enabled: true, // claudeCode.workspace.getConfiguration('statusPet').get('enabled', true),
      theme: 'auto', // claudeCode.workspace.getConfiguration('statusPet').get('theme', 'auto'),
      accessibility: {
        enabled: true, // claudeCode.workspace.getConfiguration('statusPet.accessibility').get('enabled', true),
        announceStateChanges: true, // claudeCode.workspace.getConfiguration('statusPet.accessibility').get('announceStateChanges', true),
        verboseDescriptions: false, // claudeCode.workspace.getConfiguration('statusPet.accessibility').get('verboseDescriptions', false),
        colorBlindSupport: false // claudeCode.workspace.getConfiguration('statusPet.accessibility').get('colorBlindSupport', false)
      }
    };
  }

  private async _saveToClaudeCode(config: IUserConfig): Promise<void> {
    // In actual implementation, would save to Claude Code's configuration
    // await claudeCode.workspace.getConfiguration('statusPet').update('enabled', config.enabled, true);
    // await claudeCode.workspace.getConfiguration('statusPet').update('theme', config.theme, true);
    // etc.
    
    // Placeholder implementation
    Logger.getInstance().debug('user-config', 'Configuration would be saved to Claude Code', config);
  }

  public onConfigurationChanged(callback: (config: IUserConfig) => void): () => void {
    // In actual implementation, would listen to Claude Code configuration changes
    // const disposable = claudeCode.workspace.onDidChangeConfiguration(event => {
    //   if (event.affectsConfiguration('statusPet')) {
    //     this.loadConfig().then(() => callback(this.config));
    //   }
    // });
    // return () => disposable.dispose();
    
    // Placeholder implementation
    return () => {};
  }
}
```

## Configuration Validation

```typescript
// src/config/validation.ts
export class ConfigValidator {
  public static validateConfig(config: any): IUserConfig {
    const validated: IUserConfig = {
      enabled: this._validateBoolean(config.enabled, true),
      petName: this._validateString(config.petName, undefined),
      theme: this._validateTheme(config.theme, 'auto'),
      accessibility: {
        enabled: this._validateBoolean(config.accessibility?.enabled, true),
        announceStateChanges: this._validateBoolean(config.accessibility?.announceStateChanges, true),
        verboseDescriptions: this._validateBoolean(config.accessibility?.verboseDescriptions, false),
        colorBlindSupport: this._validateBoolean(config.accessibility?.colorBlindSupport, false)
      },
      performance: {
        updateFrequency: this._validateUpdateFrequency(config.performance?.updateFrequency, 'normal'),
        memoryOptimization: this._validateBoolean(config.performance?.memoryOptimization, true)
      },
      privacy: {
        localStorageOnly: this._validateBoolean(config.privacy?.localStorageOnly, true),
        encryptStorage: this._validateBoolean(config.privacy?.encryptStorage, true)
      }
    };

    return validated;
  }

  private static _validateBoolean(value: any, defaultValue: boolean): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
  }

  private static _validateString(value: any, defaultValue: string | undefined): string | undefined {
    if (typeof value === 'string' && value.length > 0 && value.length <= 50) {
      // Sanitize string
      return value.replace(/[^\w\s-]/g, '').trim();
    }
    return defaultValue;
  }

  private static _validateTheme(value: any, defaultValue: IUserConfig['theme']): IUserConfig['theme'] {
    const validThemes: IUserConfig['theme'][] = ['auto', 'light', 'dark', 'high-contrast'];
    return validThemes.includes(value) ? value : defaultValue;
  }

  private static _validateUpdateFrequency(
    value: any, 
    defaultValue: IUserConfig['performance']['updateFrequency']
  ): IUserConfig['performance']['updateFrequency'] {
    const validFrequencies: IUserConfig['performance']['updateFrequency'][] = ['low', 'normal', 'high'];
    return validFrequencies.includes(value) ? value : defaultValue;
  }
}
```

## Environment Detection

```typescript
// src/config/environmentDetection.ts
export class EnvironmentDetection {
  public static detectEnvironment(): {
    platform: string;
    nodeVersion: string;
    claudeCodeVersion?: string;
    isExtensionHost: boolean;
    capabilities: {
      hasFileSystem: boolean;
      hasNetwork: boolean;
      hasClipboard: boolean;
      hasNotifications: boolean;
    };
  } {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      claudeCodeVersion: this._getClaudeCodeVersion(),
      isExtensionHost: this._isRunningInExtensionHost(),
      capabilities: {
        hasFileSystem: this._hasFileSystemAccess(),
        hasNetwork: this._hasNetworkAccess(),
        hasClipboard: this._hasClipboardAccess(),
        hasNotifications: this._hasNotificationAccess()
      }
    };
  }

  private static _getClaudeCodeVersion(): string | undefined {
    try {
      // return claudeCode.version;
      return undefined; // Placeholder
    } catch {
      return undefined;
    }
  }

  private static _isRunningInExtensionHost(): boolean {
    // Check if running in Claude Code extension host
    return typeof process.env.CLAUDE_CODE_EXTENSION_HOST !== 'undefined';
  }

  private static _hasFileSystemAccess(): boolean {
    try {
      require('fs');
      return true;
    } catch {
      return false;
    }
  }

  private static _hasNetworkAccess(): boolean {
    // Extensions typically don't have network access
    return false;
  }

  private static _hasClipboardAccess(): boolean {
    // Check if Claude Code clipboard API is available
    try {
      // return typeof claudeCode.env.clipboard !== 'undefined';
      return false; // Placeholder
    } catch {
      return false;
    }
  }

  private static _hasNotificationAccess(): boolean {
    // Check if Claude Code notification API is available
    try {
      // return typeof claudeCode.window.showInformationMessage !== 'undefined';
      return true; // Usually available
    } catch {
      return false;
    }
  }
}
```

## Migration and Configuration Updates

```typescript
// src/config/migration.ts
export class ConfigMigration {
  private static readonly CONFIG_VERSION = 2;

  public static migrateConfig(config: any): IUserConfig {
    const version = config._version || 1;
    
    let migratedConfig = config;
    
    // Apply migrations in sequence
    if (version < 2) {
      migratedConfig = this._migrateV1ToV2(migratedConfig);
    }
    
    // Add future migrations here
    // if (version < 3) {
    //   migratedConfig = this._migrateV2ToV3(migratedConfig);
    // }
    
    // Validate and clean up
    migratedConfig = ConfigValidator.validateConfig(migratedConfig);
    migratedConfig._version = this.CONFIG_VERSION;
    
    return migratedConfig;
  }

  private static _migrateV1ToV2(config: any): any {
    // Example: Migrate from V1 structure to V2
    const migrated = { ...config };
    
    // V1 had a single 'accessibilityEnabled' field
    // V2 has a nested accessibility object
    if (typeof config.accessibilityEnabled === 'boolean') {
      migrated.accessibility = {
        enabled: config.accessibilityEnabled,
        announceStateChanges: true,
        verboseDescriptions: false,
        colorBlindSupport: false
      };
      delete migrated.accessibilityEnabled;
    }
    
    // V1 had 'highContrastMode' as a separate field
    // V2 includes it in theme selection
    if (config.highContrastMode === true) {
      migrated.theme = 'high-contrast';
      delete migrated.highContrastMode;
    }
    
    Logger.getInstance().info('config-migration', 'Migrated configuration from V1 to V2');
    
    return migrated;
  }
}
```

This configuration system ensures:
- **Centralized Management**: All settings in one place for easy modification
- **Environment Awareness**: Different behavior for dev/test/production
- **User Customization**: Rich user preferences with validation
- **Migration Support**: Smooth upgrades when configuration structure changes
- **Platform Detection**: Adapts to available capabilities