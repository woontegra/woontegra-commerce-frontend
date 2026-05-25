export type LogType = 'user_action' | 'error' | 'system';
export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Log {
  id: string;
  type: LogType;
  level: LogLevel;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateLogDto {
  type: LogType;
  level: LogLevel;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}
