import { useState } from 'react';
import type { Campaign } from '../types/advancedCampaign';
import CampaignForm from '../components/campaign/CampaignForm';
import Button from '../components/ui/Button';

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleSubmit = async (campaign: Campaign) => {
    if (editingCampaign) {
      setCampaigns(campaigns.map(c => c.id === campaign.id ? campaign : c));
    } else {
      setCampaigns([...campaigns, campaign]);
    }
    setShowForm(false);
    setEditingCampaign(null);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setCampaigns(campaigns.map(c => 
      c.id === id ? { ...c, active: !c.active } : c
    ));
  };

  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Yüzde İndirim';
      case 'fixed': return 'Sabit İndirim';
      case 'bxgy': return 'Al Öde';
      default: return type;
    }
  };

  const getCampaignValue = (campaign: Campaign) => {
    if (campaign.type === 'bxgy' && campaign.bxgyConfig) {
      return `${campaign.bxgyConfig.buy} Al ${campaign.bxgyConfig.pay} Öde`;
    }
    if (campaign.type === 'percentage') {
      return `%${campaign.value}`;
    }
    return `₺${campaign.value}`;
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingCampaign(null);
            }}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {editingCampaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}
          </h1>
        </div>

        <CampaignForm
          initialData={editingCampaign || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCampaign(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Kampanya Yönetimi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            İndirim kampanyalarınızı yönetin
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Yeni Kampanya
        </Button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Henüz kampanya oluşturulmadı
          </p>
          <Button onClick={() => setShowForm(true)}>
            İlk Kampanyayı Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {campaign.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {campaign.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                      {getCampaignTypeLabel(campaign.type)}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full text-sm font-semibold">
                      {getCampaignValue(campaign)}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      {new Date(campaign.startDate).toLocaleDateString('tr-TR')} - {new Date(campaign.endDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(campaign.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    title={campaign.active ? 'Pasif yap' : 'Aktif yap'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    title="Düzenle"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                    title="Sil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kullanım</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.usageCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toplam İndirim</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ₺{campaign.totalDiscount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kullanıcı Grubu</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.target.userGroup || 'Tümü'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
