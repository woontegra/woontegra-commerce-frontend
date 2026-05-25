import { useState, useEffect } from 'react';
import { logger } from '../services/logger.service';
import type { Log, LogType, LogLevel } from '../types/log';
import DataTable from '../components/table/DataTable';

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');

  useEffect(() => {
    loadLogs();
    
    // Refresh logs every 5 seconds
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [typeFilter, levelFilter]);

  const loadLogs = () => {
    const filters: any = {};
    if (typeFilter !== 'all') filters.type = typeFilter;
    if (levelFilter !== 'all') filters.level = levelFilter;
    
    const filteredLogs = logger.getLogs(filters);
    setLogs(filteredLogs);
  };

  const handleClearLogs = () => {
    if (confirm('Tüm logları silmek istediğinize emin misiniz?')) {
      logger.clearLogs();
      setLogs([]);
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    const styles = {
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      critical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type: LogType) => {
    const styles = {
      user_action: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      system: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    };
    const labels = {
      user_action: 'User Action',
      error: 'Error',
      system: 'System',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white">
            Sistem Logları
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mt-1">
            Kullanıcı aktiviteleri ve sistem hataları
          </p>
        </div>
        <button
          onClick={handleClearLogs}
          className="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Logları Temizle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Tip
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="input-standard"
          >
            <option value="all">Tümü</option>
            <option value="user_action">User Action</option>
            <option value="error">Error</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Seviye
          </label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="input-standard"
          >
            <option value="all">Tümü</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Toplam Log</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{logs.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">User Actions</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
            {logs.filter(l => l.type === 'user_action').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Errors</p>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {logs.filter(l => l.type === 'error').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">System</p>
          <p className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
            {logs.filter(l => l.type === 'system').length}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <DataTable<Log>
        data={logs}
        columns={[
          {
            key: 'timestamp',
            label: 'Zaman',
            sortable: true,
            render: (log) => (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(log.timestamp).toLocaleString('tr-TR')}
              </span>
            ),
          },
          {
            key: 'type',
            label: 'Tip',
            sortable: true,
            render: (log) => getTypeBadge(log.type),
          },
          {
            key: 'level',
            label: 'Seviye',
            sortable: true,
            render: (log) => getLevelBadge(log.level),
          },
          {
            key: 'action',
            label: 'Aksiyon',
            sortable: true,
            render: (log) => (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {log.action}
              </span>
            ),
          },
          {
            key: 'description',
            label: 'Açıklama',
            render: (log) => (
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {log.description}
              </span>
            ),
          },
          {
            key: 'userName',
            label: 'Kullanıcı',
            sortable: true,
            render: (log) => (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {log.userName || '-'}
              </span>
            ),
          },
        ]}
        searchKeys={['action', 'description', 'userName']}
        itemsPerPage={20}
      />
    </div>
  );
}
