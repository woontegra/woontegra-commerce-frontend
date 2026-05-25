import { useAppStore } from '../store/useAppStore';
import type { LogType, LogLevel, CreateLogDto, Log } from '../types/log';

class LoggerService {
  private logs: Log[] = [];

  // Log user action
  logAction(action: string, description: string, metadata?: Record<string, any>) {
    this.createLog({
      type: 'user_action',
      level: 'info',
      action,
      description,
      metadata,
    });
  }

  // Log error
  logError(action: string, error: any, metadata?: Record<string, any>) {
    this.createLog({
      type: 'error',
      level: 'error',
      action,
      description: error.message || 'Unknown error',
      metadata: {
        ...metadata,
        error: error.toString(),
        stack: error.stack,
      },
    });
  }

  // Log system event
  logSystem(action: string, description: string, level: LogLevel = 'info', metadata?: Record<string, any>) {
    this.createLog({
      type: 'system',
      level,
      action,
      description,
      metadata,
    });
  }

  // Create log entry
  private createLog(dto: CreateLogDto) {
    const user = useAppStore.getState().user;
    
    const log: Log = {
      id: this.generateId(),
      type: dto.type,
      level: dto.level,
      action: dto.action,
      description: dto.description,
      userId: user?.id,
      userName: user ? `${user.firstName} ${user.lastName}` : undefined,
      metadata: dto.metadata,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    // Store in memory (in production, send to backend)
    this.logs.unshift(log);
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    // Also store in localStorage for persistence
    this.saveToLocalStorage(log);

    // In production, send to backend
    // this.sendToBackend(log);

    // Console log in development
    if (import.meta.env.DEV) {
      console.log(`[${dto.type.toUpperCase()}] ${dto.action}:`, dto.description, dto.metadata);
    }
  }

  // Get all logs
  getLogs(filters?: {
    type?: LogType;
    level?: LogLevel;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Log[] {
    let filteredLogs = [...this.logs];

    if (filters?.type) {
      filteredLogs = filteredLogs.filter(log => log.type === filters.type);
    }

    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters?.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }

    return filteredLogs;
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // In production, get from backend
    return 'unknown';
  }

  private saveToLocalStorage(log: Log) {
    try {
      const stored = localStorage.getItem('app_logs');
      const logs = stored ? JSON.parse(stored) : [];
      logs.unshift(log);
      
      // Keep only last 100 logs in localStorage
      const trimmed = logs.slice(0, 100);
      localStorage.setItem('app_logs', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save log to localStorage:', error);
    }
  }

  // Load logs from localStorage on init
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs = logs;
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }
}

export const logger = new LoggerService();

// Load logs on init
logger.loadFromLocalStorage();
