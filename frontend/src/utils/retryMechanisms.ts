// Retry mechanisms and utilities
import React from 'react';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
}

export class RetryManager {
  private static defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    maxDelay: 30000,
    retryCondition: (_error) => true,
    onRetry: () => {}
  };

  // Retry function with exponential backoff
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attempt,
          totalDelay
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (!opts.retryCondition(error) || attempt === opts.maxAttempts) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt - 1, opts);
        totalDelay += delay;

        // Call retry callback
        opts.onRetry(attempt, error);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: opts.maxAttempts,
      totalDelay
    };
  }

  // Retry with circuit breaker pattern
  static async retryWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: RetryOptions & { threshold?: number; timeout?: number } = {}
  ): Promise<RetryResult<T>> {
    const { threshold = 5, timeout = 30000, ...retryOptions } = options;
    const circuitBreaker = new CircuitBreaker(threshold, timeout);
    
    return this.retry(() => circuitBreaker.execute(fn), retryOptions);
  }

  // Batch retry for multiple operations
  static async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions & { concurrency?: number } = {}
  ): Promise<RetryResult<T>[]> {
    const { concurrency = 3, ...retryOptions } = options;
    const results: RetryResult<T>[] = [];
    
    // Process in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(op => this.retry(op, retryOptions))
      );
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason,
            attempts: 0,
            totalDelay: 0
          });
        }
      });
    }
    
    return results;
  }

  private static calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    let delay: number;

    switch (options.backoff) {
      case 'linear':
        delay = options.delay * attempt;
        break;
      case 'exponential':
        delay = options.delay * Math.pow(2, attempt);
        break;
      default:
        delay = options.delay;
    }

    return Math.min(delay, options.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private threshold: number;
  private resetTimeout: number;

  constructor(
    threshold = 5,
    _timeout = 60000,
    resetTimeout = 30000
  ) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }

  getFailures() {
    return this.failures;
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

// Retry hook for React
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { immediate?: boolean } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const { immediate = false, ...retryOptions } = options;

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await RetryManager.retry(fn, {
        ...retryOptions,
        onRetry: (attempt, err) => {
          setRetryCount(attempt);
          if (retryOptions.onRetry) {
            retryOptions.onRetry(attempt, err);
          }
        }
      });

      if (result.success) {
        setData(result.data ?? null);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fn, retryOptions]);

  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  const reset = React.useCallback(() => {
    setData(null);
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    data,
    loading,
    error,
    retryCount,
    execute,
    reset
  };
}

// API client with retry
export class ApiClient {
  private baseURL: string;
  private defaultRetryOptions: RetryOptions;

  constructor(baseURL: string, defaultRetryOptions: RetryOptions = {}) {
    this.baseURL = baseURL;
    this.defaultRetryOptions = {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
      ...defaultRetryOptions
    };
  }

  async get<T>(endpoint: string, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
    const { retry = {}, ...fetchOptions } = options;
    const retryOptions = { ...this.defaultRetryOptions, ...retry };

    return RetryManager.retry(async () => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        ...fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }, retryOptions).then(result => {
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    });
  }

  async post<T>(endpoint: string, data?: any, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
    const { retry = {}, ...fetchOptions } = options;
    const retryOptions = { ...this.defaultRetryOptions, ...retry };

    return RetryManager.retry(async () => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        },
        body: data ? JSON.stringify(data) : undefined,
        ...fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }, retryOptions).then(result => {
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    });
  }

  async put<T>(endpoint: string, data?: any, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
    const { retry = {}, ...fetchOptions } = options;
    const retryOptions = { ...this.defaultRetryOptions, ...retry };

    return RetryManager.retry(async () => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        },
        body: data ? JSON.stringify(data) : undefined,
        ...fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }, retryOptions).then(result => {
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    });
  }

  async delete<T>(endpoint: string, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
    const { retry = {}, ...fetchOptions } = options;
    const retryOptions = { ...this.defaultRetryOptions, ...retry };

    return RetryManager.retry(async () => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        ...fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }, retryOptions).then(result => {
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    });
  }
}

// Debounced retry
export function debounceRetry<T>(
  fn: () => Promise<T>,
  delay: number = 1000
): () => Promise<RetryResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout>;
  let lastCallTime = 0;

  return () => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;
        
        if (timeSinceLastCall >= delay) {
          lastCallTime = now;
          const result = await RetryManager.retry(fn);
          resolve(result);
        }
      }, delay);
    });
  };
}

// Throttled retry
export function throttleRetry<T>(
  fn: () => Promise<T>,
  limit: number = 1
): () => Promise<RetryResult<T> | null> {
  let inProgress = 0;
  let queue: Array<(result: RetryResult<T>) => void> = [];

  return () => {
    return new Promise((resolve) => {
      if (inProgress < limit) {
        inProgress++;
        
        RetryManager.retry(fn).then(result => {
          inProgress--;
          
          // Process next in queue
          if (queue.length > 0) {
            const next = queue.shift();
            if (next) {
              next(result);
            }
          }
          
          resolve(result);
        });
      } else {
        // Add to queue
        queue.push(resolve);
      }
    });
  };
}

export default {
  RetryManager,
  CircuitBreaker,
  useRetry,
  ApiClient,
  debounceRetry,
  throttleRetry
};
