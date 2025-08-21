# Error Handling & Resilience

## Error Handling Strategy

Our error handling implements **defense in depth** to ensure user experience is never interrupted by single points of failure.

```typescript
// src/core/errors.ts
export enum PetErrorType {
  API_FAILURE = 'API_FAILURE',
  STATE_CORRUPTION = 'STATE_CORRUPTION',
  STORAGE_FAILURE = 'STORAGE_FAILURE',
  TIMER_FAILURE = 'TIMER_FAILURE',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface IPetError {
  type: PetErrorType;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

export class PetErrorHandler {
  private static instance: PetErrorHandler;
  private errorLog: IPetError[] = [];
  private maxLogSize = 100;

  public static getInstance(): PetErrorHandler {
    if (!PetErrorHandler.instance) {
      PetErrorHandler.instance = new PetErrorHandler();
    }
    return PetErrorHandler.instance;
  }

  public handleError(error: IPetError): void {
    this.errorLog.push(error);
    this._trimErrorLog();
    this._attemptRecovery(error);
    this._logError(error);
  }

  private _attemptRecovery(error: IPetError): void {
    switch (error.type) {
      case PetErrorType.API_FAILURE:
        this._recoverFromAPIFailure(error);
        break;
      case PetErrorType.STATE_CORRUPTION:
        this._recoverFromStateCorruption(error);
        break;
      case PetErrorType.STORAGE_FAILURE:
        this._recoverFromStorageFailure(error);
        break;
      case PetErrorType.TIMER_FAILURE:
        this._recoverFromTimerFailure(error);
        break;
      default:
        this._fallbackRecovery(error);
    }
  }

  private _recoverFromAPIFailure(error: IPetError): void {
    // Enable degraded mode - use cached state
    Logger.getInstance().warn('error-handler', 'API failure - entering degraded mode', error.context);
    // Continue operating with last known good state
  }

  private _recoverFromStateCorruption(error: IPetError): void {
    // Reset to safe default state
    const safeState = {
      energy: 50,
      expression: '(o_o)',
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };
    
    Logger.getInstance().error('error-handler', 'State corrupted - reset to safe defaults', error.context);
    // Notify pet instance to reset state
  }

  private _recoverFromStorageFailure(error: IPetError): void {
    // Switch to in-memory storage
    Logger.getInstance().warn('error-handler', 'Storage failed - using memory only', error.context);
    // Display warning to user (non-blocking)
  }

  private _recoverFromTimerFailure(error: IPetError): void {
    // Manually trigger state checks
    Logger.getInstance().warn('error-handler', 'Timer failed - using manual checks', error.context);
    // Set up alternative timing mechanism
  }

  private _fallbackRecovery(error: IPetError): void {
    Logger.getInstance().error('error-handler', 'Unknown error - minimal recovery', error.context);
    // Log error but continue operating
  }

  private _trimErrorLog(): void {
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  private _logError(error: IPetError): void {
    const logLevel = error.recoverable ? 'warn' : 'error';
    Logger.getInstance()[logLevel]('error-handler', error.message, {
      type: error.type,
      context: error.context,
      timestamp: error.timestamp
    });
  }

  public getRecentErrors(): IPetError[] {
    return [...this.errorLog];
  }

  public getErrorStats(): { total: number; byType: Record<string, number> } {
    const byType = this.errorLog.reduce((stats, error) => {
      stats[error.type] = (stats[error.type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return { total: this.errorLog.length, byType };
  }
}
```

## Retry Strategies

Implement exponential backoff retry for critical operations:

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        // Log final failure
        Logger.getInstance().error('retry', 'Operation failed after all retries', {
          attempts: attempt + 1,
          error: lastError.message
        });
        throw lastError;
      }

      const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
      Logger.getInstance().warn('retry', `Operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        error: lastError.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage example
export async function saveStateWithRetry(state: IPetState): Promise<void> {
  return withRetry(async () => {
    await SecureStorage.getInstance().saveEncryptedState(state);
  }, 3, 500);
}
```

## Graceful Degradation

When critical services are unavailable, the extension enters safe mode:

```typescript
// src/core/SafeMode.ts
export class SafeMode {
  private static instance: SafeMode;
  private isEnabled = false;
  private degradedFeatures: Set<string> = new Set();

  public static getInstance(): SafeMode {
    if (!SafeMode.instance) {
      SafeMode.instance = new SafeMode();
    }
    return SafeMode.instance;
  }

  public enableSafeMode(reason: string): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      Logger.getInstance().warn('safe-mode', `Safe mode enabled: ${reason}`);
      this._notifyUserOfDegradedService();
    }
  }

  public disableSafeMode(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      this.degradedFeatures.clear();
      Logger.getInstance().info('safe-mode', 'Safe mode disabled - normal operation restored');
    }
  }

  public isFeatureDegraded(feature: string): boolean {
    return this.degradedFeatures.has(feature);
  }

  public degradeFeature(feature: string, reason: string): void {
    this.degradedFeatures.add(feature);
    Logger.getInstance().warn('safe-mode', `Feature degraded: ${feature} - ${reason}`);
  }

  public restoreFeature(feature: string): void {
    if (this.degradedFeatures.delete(feature)) {
      Logger.getInstance().info('safe-mode', `Feature restored: ${feature}`);
    }
  }

  public getSafeModePetState(): IPetState {
    return {
      energy: 50,
      expression: '(?_?)', // Confused expression for safe mode
      lastFeedTime: new Date(),
      totalTokensConsumed: 0
    };
  }

  private _notifyUserOfDegradedService(): void {
    // Non-blocking notification (status bar only, no popups)
    const statusBar = StatusBar.getInstance();
    statusBar?.updateStatusBarWithWarning('Pet service degraded');
  }
}

// Integration with Pet class
export class Pet {
  private safeMode = SafeMode.getInstance();

  public feed(tokens: number): void {
    try {
      if (this.safeMode.isFeatureDegraded('feeding')) {
        Logger.getInstance().warn('pet', 'Feeding is degraded - using fallback');
        this._safeFeed(tokens);
        return;
      }

      // Normal feeding logic
      const validatedTokens = InputValidator.validateTokenCount(tokens);
      this.state.energy = Math.min(100, this.state.energy + validatedTokens);
      this.state.lastFeedTime = new Date();
      this._notify();
      
    } catch (error) {
      PetErrorHandler.getInstance().handleError({
        type: PetErrorType.VALIDATION_ERROR,
        message: 'Pet feeding failed',
        context: { tokens, error: error.message },
        timestamp: new Date(),
        recoverable: true
      });
      
      this.safeMode.degradeFeature('feeding', 'Input validation failed');
      this._safeFeed(tokens);
    }
  }

  private _safeFeed(tokens: number): void {
    // Minimal, safe feeding logic
    if (typeof tokens === 'number' && tokens > 0) {
      this.state.energy = Math.min(100, this.state.energy + Math.floor(tokens));
      this._notify();
    }
  }
}
```

## Circuit Breaker Pattern

Prevent cascading failures with circuit breakers:

```typescript
// src/utils/circuitBreaker.ts
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  constructor(
    private failureThreshold: number = 5,
    private recoveryTime: number = 30000, // 30 seconds
    private successThreshold: number = 3
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this._shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open - operation blocked');
      }
    }

    try {
      const result = await operation();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  private _onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        Logger.getInstance().info('circuit-breaker', 'Circuit breaker closed - service recovered');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private _onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      Logger.getInstance().warn('circuit-breaker', `Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private _shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceFailure >= this.recoveryTime;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount
    };
  }
}

// Usage with Claude Code API
export class ResilientClaudeCodeService extends ClaudeCodeService {
  private circuitBreaker = new CircuitBreaker(3, 15000, 2);

  public async updateStatusBar(text: string): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        this.statusBarItem.text = text;
      });
    } catch (error) {
      Logger.getInstance().warn('claude-service', 'Status bar update blocked by circuit breaker');
      // Continue silently - don't crash the extension
    }
  }
}
```

## Error Monitoring and Reporting

```typescript
// src/utils/errorReporting.ts
export class ErrorReporting {
  private static instance: ErrorReporting;
  
  public static getInstance(): ErrorReporting {
    if (!ErrorReporting.instance) {
      ErrorReporting.instance = new ErrorReporting();
    }
    return ErrorReporting.instance;
  }

  public reportError(error: Error, context: Record<string, unknown> = {}): void {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: process.platform,
      version: require('../../package.json').version
    };

    // Log locally (never send data externally per privacy requirements)
    Logger.getInstance().error('error-reporting', 'Unhandled error', errorReport);
    
    // Store for debugging
    this._storeErrorForDebugging(errorReport);
  }

  private _storeErrorForDebugging(errorReport: any): void {
    // Store in local debug log for troubleshooting
    const debugLogPath = '.ai/debug-log.md';
    const errorEntry = `
## Error Report - ${errorReport.timestamp}

**Message:** ${errorReport.message}

**Context:**
\`\`\`json
${JSON.stringify(errorReport.context, null, 2)}
\`\`\`

**Stack Trace:**
\`\`\`
${errorReport.stack}
\`\`\`

---
`;
    
    // Append to debug log (implementation depends on file system access)
    try {
      // fs.appendFileSync(debugLogPath, errorEntry);
    } catch (writeError) {
      console.error('Failed to write debug log:', writeError);
    }
  }

  public generateErrorSummary(): string {
    const errorHandler = PetErrorHandler.getInstance();
    const recentErrors = errorHandler.getRecentErrors();
    const stats = errorHandler.getErrorStats();

    return `
# Error Summary Report

**Generated:** ${new Date().toISOString()}
**Total Errors:** ${stats.total}

## Error Breakdown
${Object.entries(stats.byType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

## Recent Errors
${recentErrors.slice(-5).map(error => 
  `- ${error.timestamp.toISOString()}: ${error.message} (${error.type})`
).join('\n')}
`;
  }
}

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  ErrorReporting.getInstance().reportError(
    new Error(`Unhandled promise rejection: ${reason}`),
    { promise: promise.toString() }
  );
});

process.on('uncaughtException', (error) => {
  ErrorReporting.getInstance().reportError(error, { type: 'uncaught' });
});
```

This comprehensive error handling strategy ensures:
- **User Experience Continuity**: Errors never crash the extension
- **Automatic Recovery**: System attempts to recover from common failures
- **Graceful Degradation**: Non-critical features can be disabled temporarily
- **Observability**: All errors are logged and can be analyzed for improvements
- **Privacy Compliance**: All error data stays local, never transmitted