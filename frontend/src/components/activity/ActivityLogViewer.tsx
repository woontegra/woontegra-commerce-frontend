import { useState, useEffect } from 'react';
import type { ActivityLog, ActivityType, ActivityLogFilter } from '../../types/activityLog';
import { activityLogger } from '../../services/activityLogger.service';

export default function ActivityLogViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<ActivityLogFilter>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [filter, search]);

  const loadLogs = () => {
    const filterWithSearch = { ...filter, search };
    const allLogs = activityLogger.getAll(filterWithSearch);
    setLogs(allLogs);
  };

  const getTypeIcon = (type: ActivityType) => {
    const icons = {
      auth: '🔐',
      product: '📦',
      order: '🛒',
      user: '👤',
      settings: '⚙️',
      system: '💻',
    };
    return icons[type];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      success: 'text-green-600 dark:text-green-400',
      failed: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const logDate = new Date(timestamp);
    const diffMs = now.getTime() - logDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    return `${diffDays} gün önce`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          İşlem Logları
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Kullanıcı aktivitelerini takip edin
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-standard w-full"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value as ActivityType || undefined })}
            className="input-standard"
          >
            <option value="">Tüm Tipler</option>
            <option value="auth">🔐 Giriş/Çıkış</option>
            <option value="product">📦 Ürün</option>
            <option value="order">🛒 Sipariş</option>
            <option value="user">👤 Kullanıcı</option>
            <option value="settings">⚙️ Ayarlar</option>
            <option value="system">💻 Sistem</option>
          </select>

          {/* Status Filter */}
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as any || undefined })}
            className="input-standard"
          >
            <option value="">Tüm Durumlar</option>
            <option value="success">✅ Başarılı</option>
            <option value="failed">❌ Başarısız</option>
            <option value="warning">⚠️ Uyarı</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Log</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.status === 'success').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Başarılı</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.status === 'failed').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Başarısız</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {logs.filter(l => l.status === 'warning').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Uyarı</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zaman</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Log bulunamadı
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <span className="text-2xl">{getTypeIcon(log.type)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.userName || 'Sistem'}
                      </p>
                      {log.userEmail && (
                        <p className="text-xs text-gray-500">{log.userEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{log.description}</p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.targetName ? (
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{log.targetName}</p>
                        <p className="text-xs text-gray-500">{log.targetType}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                      {log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '⚠️'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getTimeAgo(log.timestamp)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString('tr-TR')}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
