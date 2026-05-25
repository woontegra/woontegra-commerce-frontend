import { useState } from 'react';
import type { CustomField, CustomFieldType } from '../../types/product';
import Button from '../ui/Button';

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export default function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    type: 'text',
    required: false,
  });

  const fieldTypes: { value: CustomFieldType; label: string }[] = [
    { value: 'text', label: 'Metin' },
    { value: 'textarea', label: 'Uzun Metin' },
    { value: 'number', label: 'Sayı' },
    { value: 'file', label: 'Dosya' },
    { value: 'date', label: 'Tarih' },
    { value: 'select', label: 'Seçim Listesi' },
  ];

  const handleAddField = () => {
    if (!newField.name || !newField.label) return;

    const field: CustomField = {
      id: `field-${Date.now()}`,
      name: newField.name,
      label: newField.label,
      type: newField.type as CustomFieldType,
      required: newField.required || false,
      placeholder: newField.placeholder,
      options: newField.options,
      maxLength: newField.maxLength,
      minValue: newField.minValue,
      maxValue: newField.maxValue,
      fileTypes: newField.fileTypes,
      maxFileSize: newField.maxFileSize,
    };

    onChange([...fields, field]);
    setNewField({ type: 'text', required: false });
    setIsAdding(false);
  };

  const handleRemoveField = (fieldId: string) => {
    onChange(fields.filter(f => f.id !== fieldId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Özel Alanlar
        </h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            Alan Ekle
          </Button>
        )}
      </div>

      {/* Add Field Form */}
      {isAdding && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Alan Adı *
              </label>
              <input
                type="text"
                value={newField.name || ''}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="Örn: personalizasyon_metni"
                className="input-standard w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Etiket *
              </label>
              <input
                type="text"
                value={newField.label || ''}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="Örn: Kişiselleştirme Metni"
                className="input-standard w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Alan Tipi *
              </label>
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value as CustomFieldType })}
                className="input-standard w-full"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={newField.placeholder || ''}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                placeholder="Örn: Adınızı girin..."
                className="input-standard w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="required" className="text-sm text-gray-600 dark:text-gray-400">
              Zorunlu alan
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddField}>Ekle</Button>
            <Button variant="secondary" onClick={() => setIsAdding(false)}>İptal</Button>
          </div>
        </div>
      )}

      {/* Fields List */}
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(field => (
            <div
              key={field.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {fieldTypes.find(t => t.value === field.type)?.label} • {field.name}
                </p>
              </div>
              <button
                onClick={() => handleRemoveField(field.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
