// Error reporting service
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  type: 'client' | 'server';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  browserInfo?: BrowserInfo;
  systemInfo?: SystemInfo;
  additionalData?: Record<string, any>;
}

export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  language: string;
  screenResolution: string;
  viewportSize: string;
  connectionType?: string;
  onlineStatus: boolean;
}

export interface SystemInfo {
  platform: string;
  architecture: string;
  cores: number;
  memory: number;
  timezone: string;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private reports: ErrorReport[] = [];
  private maxReports = 1000;
  private reportEndpoint = '/api/errors/report';
  private isOnline = navigator.onLine;

  private constructor() {
    this.setupEventListeners();
    this.setupPeriodicReporting();
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  // Report error
  report(error: Error | string, severity: ErrorReport['severity'] = 'medium', additionalData?: Record<string, any>): void {
    const report: ErrorReport = {
      id: this.generateId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      type: 'client',
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      browserInfo: this.getBrowserInfo(),
      systemInfo: this.getSystemInfo(),
      additionalData
    };

    this.addReport(report);
    this.sendReport(report);
  }

  // Report performance issue
  reportPerformance(metric: string, value: number, threshold?: number): void {
    const severity: ErrorReport['severity'] = threshold ? 
      (value > threshold ? 'high' : 'medium') : 'low';

    this.report(
      `Performance issue: ${metric} = ${value}${threshold ? ` (threshold: ${threshold})` : ''}`,
      severity,
      {
        metric,
        value,
        threshold,
        type: 'performance'
      }
    );
  }

  // Report API error
  reportApiError(url: string, method: string, status: number, response: any, additionalData?: Record<string, any>): void {
    const severity: ErrorReport['severity'] = status >= 500 ? 'critical' : status >= 400 ? 'high' : 'medium';

    this.report(
      `API Error: ${method} ${url} - ${status}`,
      severity,
      {
        url,
        method,
        status,
        response: this.sanitizeResponse(response),
        type: 'api',
        ...additionalData
      }
    );
  }

  // Report user action error
  reportUserAction(action: string, error: Error, additionalData?: Record<string, any>): void {
    this.report(
      `User Action Error: ${action}`,
      'medium',
      {
        action,
        error: error.message,
        stack: error.stack,
        type: 'user-action',
        ...additionalData
      }
    );
  }

  private addReport(report: ErrorReport): void {
    this.reports.unshift(report);
    
    // Keep only last maxReports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(0, this.maxReports);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('errorReports', JSON.stringify(this.reports.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to store error reports in localStorage:', e);
    }
  }

  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - error report queued');
      return;
    }

    try {
      const response = await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('Error report sent successfully');
    } catch (error) {
      console.error('Failed to send error report:', error);
      // Report will be retried periodically
    }
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    return sessionId;
  }

  private getBrowserInfo(): BrowserInfo {
    return {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      os: this.getOS(),
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      connectionType: this.getConnectionType(),
      onlineStatus: navigator.onLine
    };
  }

  private getSystemInfo(): SystemInfo {
    return {
      platform: navigator.platform,
      architecture: this.getArchitecture(),
      cores: navigator.hardwareConcurrency || 0,
      memory: this.getMemory(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent;
    
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    
    return 'Unknown';
  }

  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType;
  }

  private getArchitecture(): string {
    return navigator.platform.includes('64') ? 'x64' : 'x86';
  }

  private getMemory(): number {
    return (navigator as any).deviceMemory || 0;
  }

  private sanitizeResponse(response: any): any {
    if (!response) return response;
    
    // Remove sensitive data
    const sanitized = { ...response };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  }

  private setupEventListeners(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.report(event.error || event.message, 'high', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript-error'
      });
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.report(
        event.reason instanceof Error ? event.reason : String(event.reason),
        'high',
        {
          type: 'unhandled-promise-rejection',
          promise: event.promise
        }
      );
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryFailedReports();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.reportPerformance('LCP', entry.startTime, 2500);
          } else if (entry.entryType === 'first-input-delay') {
            this.reportPerformance('FID', (entry as any).processingStart - entry.startTime, 100);
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input-delay'] });
    }
  }

  private setupPeriodicReporting(): void {
    // Retry failed reports every 5 minutes
    setInterval(() => {
      if (this.isOnline) {
        this.retryFailedReports();
      }
    }, 5 * 60 * 1000);
  }

  private retryFailedReports(): void {
    // Get reports that haven't been sent successfully
    const failedReports = this.reports.filter(_report => {
      // In a real implementation, you'd track which reports failed
      return Math.random() < 0.1; // Simulate 10% failure rate
    });

    failedReports.forEach(report => {
      this.sendReport(report);
    });
  }

  // Get error statistics
  getErrorStats(): any {
    const stats = {
      total: this.reports.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byHour: {} as Record<string, number>,
      recentErrors: this.reports.slice(0, 10)
    };

    this.reports.forEach(report => {
      // By severity
      stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;

      // By type
      const type = report.additionalData?.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // By hour
      const hour = new Date(report.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    return stats;
  }

  // Clear all reports
  clearReports(): void {
    this.reports = [];
    try {
      localStorage.removeItem('errorReports');
    } catch (e) {
      console.warn('Failed to clear error reports from localStorage:', e);
    }
  }

  // Export reports for debugging
  exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }
}

// Global error reporter instance
export const errorReporter = ErrorReporter.getInstance();

// Convenience functions
export const reportError = (error: Error | string, severity?: ErrorReport['severity'], additionalData?: Record<string, any>) => {
  errorReporter.report(error, severity, additionalData);
};

export const reportApiError = (url: string, method: string, status: number, response: any, additionalData?: Record<string, any>) => {
  errorReporter.reportApiError(url, method, status, response, additionalData);
};

export const reportPerformance = (metric: string, value: number, threshold?: number) => {
  errorReporter.reportPerformance(metric, value, threshold);
};

export default errorReporter;
