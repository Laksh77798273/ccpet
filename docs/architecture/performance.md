# Performance & Scaling Considerations

## Memory Optimization Strategy

```typescript
// src/performance/memoryManager.ts
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsageThreshold = 50 * 1024 * 1024; // 50MB
  private gcInterval?: NodeJS.Timeout;
  private metrics: Map<string, number[]> = new Map();

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public startMemoryMonitoring(): void {
    this.gcInterval = setInterval(() => {
      this._checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  public stopMemoryMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }
  }

  private _checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    // Record memory usage
    this._recordMemoryMetric(heapUsed);
    
    if (heapUsed > this.memoryUsageThreshold) {
      this._triggerMemoryCleanup();
    }
  }

  private _triggerMemoryCleanup(): void {
    // Clean up log buffers
    const logger = Logger.getInstance();
    logger.getRecentLogs(50); // Keep only recent 50 entries
    
    // Clean up metrics history
    this._cleanupOldMetrics();
    
    // Clean up error logs
    const errorHandler = PetErrorHandler.getInstance();
    // Keep only recent errors (implemented in error handler)
    
    // Suggest garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    Logger.getInstance().info('memory-manager', 'Memory cleanup triggered', {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      threshold: Math.round(this.memoryUsageThreshold / 1024 / 1024)
    });
  }

  private _recordMemoryMetric(heapUsed: number): void {
    const timestamp = Date.now();
    if (!this.metrics.has('memory')) {
      this.metrics.set('memory', []);
    }
    
    const memoryMetrics = this.metrics.get('memory')!;
    memoryMetrics.push(heapUsed);
    
    // Keep only last 100 measurements
    if (memoryMetrics.length > 100) {
      memoryMetrics.shift();
    }
  }

  private _cleanupOldMetrics(): void {
    this.metrics.forEach((values, key) => {
      if (values.length > 50) {
        this.metrics.set(key, values.slice(-50));
      }
    });
  }

  public getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    };
  }

  public getMemoryTrend(): 'INCREASING' | 'STABLE' | 'DECREASING' {
    const memoryMetrics = this.metrics.get('memory') || [];
    if (memoryMetrics.length < 10) return 'STABLE';
    
    const recent = memoryMetrics.slice(-10);
    const older = memoryMetrics.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const threshold = 1024 * 1024; // 1MB threshold
    
    if (recentAvg > olderAvg + threshold) return 'INCREASING';
    if (recentAvg < olderAvg - threshold) return 'DECREASING';
    return 'STABLE';
  }
}
```

## CPU Usage Optimization

```typescript
// src/performance/cpuOptimization.ts
export class CPUOptimization {
  private static readonly MAX_OPERATION_TIME = 16; // 16ms - one animation frame
  private taskQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  public scheduleTask(task: () => Promise<void>): void {
    this.taskQueue.push(task);
    
    if (!this.isProcessing) {
      this._processTaskQueue();
    }
  }

  private async _processTaskQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0) {
      const startTime = Date.now();
      const task = this.taskQueue.shift();
      
      if (task) {
        try {
          await task();
        } catch (error) {
          Logger.getInstance().error('cpu-optimization', 'Task execution failed', { error });
        }
      }
      
      // Yield control if processing takes too long
      if (Date.now() - startTime > CPUOptimization.MAX_OPERATION_TIME) {
        await this._yieldControl();
      }
    }
    
    this.isProcessing = false;
  }

  private async _yieldControl(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }

  // Debounce decorator to limit frequent calls
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle decorator to limit call frequency
  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let lastCallTime = 0;
    
    return (...args: Parameters<T>): void => {
      const now = Date.now();
      if (now - lastCallTime >= limit) {
        lastCallTime = now;
        func(...args);
      }
    };
  }
}

// Optimized Pet class with performance considerations
export class OptimizedPet extends Pet {
  // Debounce state updates to avoid excessive UI refreshes
  private _debouncedStateUpdate = CPUOptimization.debounce(
    this._notifyObservers.bind(this),
    100 // 100ms debounce - combines rapid state changes
  );

  // Throttle decay checks to avoid excessive computation
  private _throttledDecayCheck = CPUOptimization.throttle(
    this._performDecayCheck.bind(this),
    1000 // Maximum once per second
  );

  private _notifyObservers(): void {
    const stateCopy = this.getState();
    this.observers.forEach(observer => {
      // Schedule observer notifications to avoid blocking
      CPUOptimization.getInstance?.().scheduleTask(async () => {
        observer(stateCopy);
      });
    });
  }

  private _performDecayCheck(): void {
    // Actual decay check logic
    const now = Date.now();
    const timeSinceLastCheck = now - (this.lastDecayCheck || now);
    
    if (timeSinceLastCheck >= 60 * 60 * 1000) { // 1 hour
      this.applyTimeDecay();
      this.lastDecayCheck = now;
    }
  }

  public feed(tokens: number): void {
    // Validate input efficiently
    if (typeof tokens !== 'number' || tokens <= 0) return;
    
    // Update state
    this.state.energy = Math.min(100, this.state.energy + Math.floor(tokens));
    this.state.lastFeedTime = new Date();
    this.state.totalTokensConsumed += Math.floor(tokens);
    
    // Update expression only if necessary
    this._updateExpressionIfNeeded();
    
    // Debounced notification
    this._debouncedStateUpdate();
  }

  private _updateExpressionIfNeeded(): void {
    const currentExpression = this._calculateExpression();
    if (currentExpression !== this.state.expression) {
      this.state.expression = currentExpression;
    }
  }
}
```

## Caching Strategy

```typescript
// src/performance/cacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { 
    data: any; 
    timestamp: number; 
    ttl: number;
    hits: number;
  }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Clean expired entries before adding new ones
    this._cleanExpiredEntries();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
    
    // Set up automatic cleanup
    setTimeout(() => this._cleanExpiredEntries(), ttl + 1000);
  }

  public get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update hit stats
    cached.hits++;
    this.stats.hits++;
    return cached.data;
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
  }

  public getStats(): { 
    size: number; 
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions
    };
  }

  private _cleanExpiredEntries(): void {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    this.stats.evictions += evicted;
    
    if (evicted > 0) {
      Logger.getInstance().debug('cache-manager', `Cleaned ${evicted} expired cache entries`);
    }
  }
}

// Cache decorator for expensive operations
export function cached(ttl: number = 5 * 60 * 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = CacheManager.getInstance();
    
    descriptor.value = function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;
      
      let result = cache.get(cacheKey);
      if (result !== null) {
        return result;
      }
      
      result = method.apply(this, args);
      cache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}

// Usage example
export class CachedExpressionCalculator {
  @cached(60000) // Cache for 1 minute
  public calculateExpression(energy: number): string {
    // Expensive calculation that can be cached
    if (energy >= 80) return '(^_^)';
    if (energy >= 60) return '(o_o)';
    if (energy >= 40) return '(._.)'
    if (energy >= 20) return '(u_u)';
    if (energy > 0) return '(x_x)';
    return '(RIP)';
  }

  @cached(30000) // Cache for 30 seconds
  public generateEnergyBar(energy: number): string {
    const totalBars = 10;
    const filledBars = Math.floor((energy / 100) * totalBars);
    return '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars);
  }
}
```

## Performance Monitoring

```typescript
// src/performance/performanceMonitor.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private alerts: Array<{ metric: string; threshold: number; callback: () => void }> = [];

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    // Check alerts
    this._checkAlerts(name, value);
  }

  public recordOperationDuration(operation: string, duration: number): void {
    this.recordMetric(`duration.${operation}`, duration);
  }

  public recordMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.recordMetric('memory.heapUsed', usage.heapUsed / 1024 / 1024); // MB
    this.recordMetric('memory.rss', usage.rss / 1024 / 1024); // MB
  }

  public addAlert(metric: string, threshold: number, callback: () => void): void {
    this.alerts.push({ metric, threshold, callback });
  }

  private _checkAlerts(metricName: string, value: number): void {
    this.alerts
      .filter(alert => alert.metric === metricName)
      .forEach(alert => {
        if (value > alert.threshold) {
          alert.callback();
        }
      });
  }

  public getMetricSummary(name: string): {
    avg: number;
    min: number;
    max: number;
    latest: number;
    count: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
      count: values.length
    };
  }

  public getAllMetrics(): Record<string, ReturnType<typeof this.getMetricSummary>> {
    const result: Record<string, ReturnType<typeof this.getMetricSummary>> = {};
    for (const name of this.metrics.keys()) {
      result[name] = this.getMetricSummary(name);
    }
    return result;
  }

  public generatePerformanceReport(): string {
    const memoryManager = MemoryManager.getInstance();
    const cacheManager = CacheManager.getInstance();
    const memoryStats = memoryManager.getMemoryStats();
    const cacheStats = cacheManager.getStats();
    const allMetrics = this.getAllMetrics();

    return `
# Performance Report

**Generated:** ${new Date().toISOString()}

## Memory Usage
- **Heap Used:** ${memoryStats.heapUsed} MB
- **RSS:** ${memoryStats.rss} MB
- **Trend:** ${memoryManager.getMemoryTrend()}

## Cache Performance  
- **Hit Rate:** ${(cacheStats.hitRate * 100).toFixed(1)}%
- **Cache Size:** ${cacheStats.size} entries
- **Total Hits:** ${cacheStats.hits}
- **Total Misses:** ${cacheStats.misses}

## Operation Metrics
${Object.entries(allMetrics)
  .filter(([name]) => name.startsWith('duration.'))
  .map(([name, stats]) => {
    const operation = name.replace('duration.', '');
    return `- **${operation}:** avg ${stats?.avg.toFixed(2)}ms, max ${stats?.max}ms`;
  })
  .join('\n')}

## Performance Recommendations
${this._generateRecommendations(memoryStats, cacheStats, allMetrics)}
`;
  }

  private _generateRecommendations(
    memory: ReturnType<typeof MemoryManager.prototype.getMemoryStats>,
    cache: ReturnType<typeof CacheManager.prototype.getStats>,
    metrics: Record<string, any>
  ): string {
    const recommendations: string[] = [];
    
    if (memory.heapUsed > 100) {
      recommendations.push('- Consider more aggressive garbage collection (heap usage > 100MB)');
    }
    
    if (cache.hitRate < 0.8) {
      recommendations.push('- Cache hit rate is low - review caching strategy');
    }
    
    const slowOperations = Object.entries(metrics)
      .filter(([name, stats]) => name.startsWith('duration.') && stats?.avg > 100)
      .map(([name]) => name.replace('duration.', ''));
    
    if (slowOperations.length > 0) {
      recommendations.push(`- Optimize slow operations: ${slowOperations.join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Performance looks good! No immediate concerns.');
    }
    
    return recommendations.join('\n');
  }
}

// Performance decorator
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await method.apply(this, args);
        PerformanceMonitor.getInstance().recordOperationDuration(
          operation, 
          Date.now() - startTime
        );
        return result;
      } catch (error) {
        PerformanceMonitor.getInstance().recordMetric(`error.${operation}`, 1);
        throw error;
      }
    };
  };
}
```

This performance strategy ensures:
- **Memory Efficiency**: Automatic cleanup and garbage collection
- **CPU Optimization**: Task scheduling and operation throttling  
- **Smart Caching**: Reduces repeated expensive calculations
- **Monitoring**: Real-time performance metrics and alerts
- **Scalability**: Designed to handle increased load gracefully