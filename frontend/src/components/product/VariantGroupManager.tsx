import { useState } from 'react';
import type { VariantGroup, VariantOption } from '../../types/variant';
import Button from '../ui/Button';

interface VariantGroupManagerProps {
  groups: VariantGroup[];
  selectedOptions: Record<string, VariantOption[]>;
  onGroupsChange: (groups: VariantGroup[]) => void;
  onOptionsChange: (groupId: string, options: VariantOption[]) => void;
}

export default function VariantGroupManager({
  groups,
  selectedOptions,
  onGroupsChange,
  onOptionsChange,
}: VariantGroupManagerProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState<Record<string, string>>({});

  // Predefined groups
  const predefinedGroups = [
    { name: 'Renk', icon: '🎨' },
    { name: 'Beden', icon: '📏' },
    { name: 'Materyal', icon: '🧵' },
    { name: 'Stil', icon: '✨' },
  ];

  const addGroup = (name: string) => {
    const newGroup: VariantGroup = {
      id: `group-${Date.now()}`,
      name,
      displayOrder: groups.length,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onGroupsChange([...groups, newGroup]);
    setNewGroupName('');
  };

  const removeGroup = (groupId: string) => {
    onGroupsChange(groups.filter(g => g.id !== groupId));
    const newSelectedOptions = { ...selectedOptions };
    delete newSelectedOptions[groupId];
  };

  const addOption = (groupId: string, value: string) => {
    if (!value.trim()) return;

    const newOption: VariantOption = {
      id: `option-${Date.now()}`,
      groupId,
      value: value.trim(),
      displayOrder: (selectedOptions[groupId]?.length || 0),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const currentOptions = selectedOptions[groupId] || [];
    onOptionsChange(groupId, [...currentOptions, newOption]);
    setNewOptionValues({ ...newOptionValues, [groupId]: '' });
  };

  const removeOption = (groupId: string, optionId: string) => {
    const currentOptions = selectedOptions[groupId] || [];
    onOptionsChange(groupId, currentOptions.filter(o => o.id !== optionId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Varyant Grupları
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ürününüz için varyant grupları ve seçenekleri ekleyin
        </p>
      </div>

      {/* Predefined Groups */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Hızlı Ekle
        </label>
        <div className="flex flex-wrap gap-2">
          {predefinedGroups.map((pg) => (
            <button
              key={pg.name}
              onClick={() => addGroup(pg.name)}
              disabled={groups.some(g => g.name === pg.name)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {pg.icon} {pg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Group */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Özel Grup Ekle
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Grup adı (örn: Paket Tipi)"
            className="input-standard flex-1"
            onKeyPress={(e) => e.key === 'Enter' && addGroup(newGroupName)}
          />
          <Button onClick={() => addGroup(newGroupName)} disabled={!newGroupName.trim()}>
            Ekle
          </Button>
        </div>
      </div>

      {/* Groups & Options */}
      {groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{group.name}</h4>
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Kaldır
                </button>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(selectedOptions[group.id] || []).map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg"
                    >
                      <span className="text-sm">{option.value}</span>
                      <button
                        onClick={() => removeOption(group.id, option.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Option */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionValues[group.id] || ''}
                    onChange={(e) => setNewOptionValues({ ...newOptionValues, [group.id]: e.target.value })}
                    placeholder={`${group.name} seçeneği ekle (örn: ${group.name === 'Renk' ? 'Kırmızı' : group.name === 'Beden' ? 'M' : 'Değer'})`}
                    className="input-standard flex-1 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addOption(group.id, newOptionValues[group.id] || '');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => addOption(group.id, newOptionValues[group.id] || '')}
                    disabled={!newOptionValues[group.id]?.trim()}
                  >
                    Ekle
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {groups.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">
            Henüz varyant grubu eklenmedi. Yukarıdan hızlı ekle butonlarını kullanın.
          </p>
        </div>
      )}
    </div>
  );
}
