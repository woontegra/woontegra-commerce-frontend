import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  HardDrive, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Download,
  Search
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    server: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
    external: ServiceHealth;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    activeConnections: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    diskUsage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
  details?: any;
}

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  stack?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

const REFRESH_INTERVAL_MS = 5000;

const SystemHealthDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState('');

  useEffect(() => {
    fetchHealthStatus();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealthStatus();
      }, REFRESH_INTERVAL_MS);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (searchTerm || logLevel) {
      fetchLogs();
    }
  }, [searchTerm, logLevel]);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health/detailed');
      const data = await response.json();
      
      setHealthStatus(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(logLevel && { level: logLevel })
      });

      const response = await fetch(`/api/logging/logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Sağlıklı';
      case 'degraded': return 'Kısıtlı';
      case 'unhealthy': return 'Sağlıksız';
      default: return status;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}g ${hours}s ${minutes}d`;
    } else if (hours > 0) {
      return `${hours}s ${minutes}d`;
    } else {
      return `${minutes}d`;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleRefresh = () => {
    fetchHealthStatus();
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await fetch('/api/logging/logs/download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && !healthStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Sistem durumu yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sistem Sağlığı</h1>
              <p className="text-gray-600 mt-1">
                Sunucu, veritabanı ve sistem metrikleri
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Yenile
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  autoRefresh 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? 'Otomatik: Açık' : 'Otomatik: Kapalı'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Status */}
        {healthStatus && (
          <div className="mb-8">
            <div className={`rounded-lg p-6 border-2 ${
              healthStatus.status === 'healthy' ? 'border-green-200 bg-green-50' :
              healthStatus.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    healthStatus.status === 'healthy' ? 'bg-green-600' :
                    healthStatus.status === 'degraded' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}>
                    {healthStatus.status === 'healthy' && <CheckCircle className="w-6 h-6 text-white" />}
                    {healthStatus.status === 'degraded' && <AlertTriangle className="w-6 h-6 text-white" />}
                    {healthStatus.status === 'unhealthy' && <AlertTriangle className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Sistem {getStatusText(healthStatus.status)}
                    </h2>
                    <p className="text-gray-600">
                      Son kontrol: {new Date(healthStatus.timestamp).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Sürüm: {healthStatus.version}
                  </div>
                  <div className="text-sm text-gray-500">
                    Ortam: {healthStatus.environment}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Uptime */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Uptime</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {formatUptime(healthStatus?.uptime || 0)}
            </div>
            <div className="text-sm text-gray-600">
              Çalışma süresi
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-8 h-8 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {healthStatus?.metrics?.responseTime || 0}ms
            </div>
            <div className="text-sm text-gray-600">
              Ortalama süresi
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Error Rate</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {healthStatus?.metrics?.errorRate || 0}%
            </div>
            <div className="text-sm text-gray-600">
              Hata oranı
            </div>
          </div>

          {/* Active Connections */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-8 h-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Active Connections</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {healthStatus?.metrics?.activeConnections || 0}
            </div>
            <div className="text-sm text-gray-600">
              Aktif bağlantı
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Memory Usage</h3>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-gray-900">
                {healthStatus?.metrics?.memoryUsage?.percentage || 0}%
              </div>
              <div className="text-sm text-gray-600">
                {formatBytes(healthStatus?.metrics?.memoryUsage?.used || 0)} / {formatBytes(healthStatus?.metrics?.memoryUsage?.total || 0)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${healthStatus?.metrics?.memoryUsage?.percentage || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-8 h-8 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Disk Usage</h3>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-gray-900">
                {healthStatus?.metrics?.diskUsage?.percentage || 0}%
              </div>
              <div className="text-sm text-gray-600">
                {formatBytes(healthStatus?.metrics?.diskUsage?.used || 0)} / {formatBytes(healthStatus?.metrics?.diskUsage?.total || 0)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${healthStatus?.metrics?.diskUsage?.percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {healthStatus?.services && Object.entries(healthStatus.services).map(([service, status]) => (
            <div key={service} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {service}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status.status)}`}>
                  {getStatusText(status.status)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Durum:</span>
                  <span className={`font-medium ${getStatusColor(status.status)}`}>
                    {getStatusText(status.status)}
                  </span>
                </div>
                {status.responseTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Response Time:</span>
                    <span className="font-medium">{status.responseTime}ms</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Son Kontrol:</span>
                    <span className="text-gray-500">
                      {new Date(status.lastCheck).toLocaleTimeString('tr-TR')}
                    </span>
                  </div>
                {status.error && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Hata:</span> {status.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Son Loglar</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDownloadLogs}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  İndir
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Log ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Seviyeler</option>
                <option value="error">Hatalar</option>
                <option value="warn">Uyarılar</option>
                <option value="info">Bilgiler</option>
                <option value="debug">Debug</option>
              </select>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Log bulunamadı</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      
                      {log.userId && (
                        <span className="text-xs text-gray-500">
                          User: {log.userId}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-900 mb-2">
                      {log.message}
                    </div>
                    
                    {log.path && (
                      <div className="text-xs text-gray-500 mb-2">
                        {log.method} {log.path} ({log.statusCode})
                      </div>
                    )}
                    
                    {log.stack && (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-800">Stack Trace</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                          {log.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
