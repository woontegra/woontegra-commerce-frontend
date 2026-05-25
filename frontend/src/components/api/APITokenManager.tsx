import { useState, useEffect } from 'react';
import type { APIToken, APIPermission } from '../../types/api';
import { apiTokenService } from '../../services/apiToken.service';
import Button from '../ui/Button';

export default function APITokenManager() {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<APIPermission[]>([]);
  const [createdToken, setCreatedToken] = useState<APIToken | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = () => {
    setTokens(apiTokenService.getAll());
  };

  const handleCreate = () => {
    if (!newTokenName.trim()) {
      return;
    }

    const token = apiTokenService.createToken(newTokenName, selectedPermissions);
    setCreatedToken(token);
    setNewTokenName('');
    setSelectedPermissions([]);
    loadTokens();
  };

  const handleRevoke = (tokenId: string) => {
    if (confirm('Bu token\'ı iptal etmek istediğinizden emin misiniz?')) {
      apiTokenService.revokeToken(tokenId);
      loadTokens();
    }
  };

  const handleDelete = (tokenId: string) => {
    if (confirm('Bu token\'ı silmek istediğinizden emin misiniz?')) {
      apiTokenService.deleteToken(tokenId);
      loadTokens();
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert('Token kopyalandı!');
  };

  const allPermissions: APIPermission[] = [
    'products:read',
    'products:write',
    'orders:read',
    'orders:write',
    'customers:read',
    'customers:write',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            API Tokens
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Entegrasyon için API token'ları yönetin
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Yeni Token
        </Button>
      </div>

      {/* Tokens List */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İsim</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İzinler</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tokens.map((token) => (
              <tr key={token.id}>
                <td className="px-4 py-3 text-sm font-medium">{token.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {token.token.substring(0, 20)}...
                  </code>
                  <button
                    onClick={() => copyToken(token.token)}
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Kopyala
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {token.permissions.map(perm => (
                      <span key={perm} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                        {perm}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {token.currentUsage}/{token.rateLimit}/min
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    token.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {token.isActive ? 'Aktif' : 'İptal'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {token.isActive && (
                      <button
                        onClick={() => handleRevoke(token.id)}
                        className="text-yellow-600 hover:text-yellow-700 text-sm"
                      >
                        İptal Et
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(token.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Yeni API Token</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token İsmi</label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="Örn: Mobil Uygulama"
                  className="input-standard w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">İzinler</label>
                <div className="space-y-2">
                  {allPermissions.map(perm => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={() => setShowCreateModal(false)} variant="secondary" className="flex-1">
                İptal
              </Button>
              <Button onClick={handleCreate} className="flex-1">
                Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Created Token Modal */}
      {createdToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Token Oluşturuldu!</h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bu token'ı güvenli bir yerde saklayın. Bir daha göremeyeceksiniz.
            </p>

            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded mb-4">
              <code className="text-sm break-all">{createdToken.token}</code>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => copyToken(createdToken.token)} className="flex-1">
                Kopyala
              </Button>
              <Button onClick={() => setCreatedToken(null)} variant="secondary" className="flex-1">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
