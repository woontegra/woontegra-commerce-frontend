/**
 * XML alan eşleştirme — düz liste, tamamen manuel
 */

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllDropdownTargets,
  makeCustomTargetKey,
  type MappingTargetField,
} from '../../utils/xmlMapping';

export interface XmlMappingEditorProps {
  xmlFields: string[];
  sampleRows: Record<string, string>[];
  mapping: Record<string, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customTargets: MappingTargetField[];
  setCustomTargets: React.Dispatch<React.SetStateAction<MappingTargetField[]>>;
}

export default function XmlMappingEditor({
  xmlFields,
  sampleRows,
  mapping,
  setMapping,
  customTargets,
  setCustomTargets,
}: XmlMappingEditorProps) {
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldXml, setNewFieldXml]     = useState('');

  const dropdownTargets = useMemo(
    () => getAllDropdownTargets(customTargets),
    [customTargets],
  );

  const sortedXmlFields = useMemo(
    () => [...xmlFields].sort((a, b) => a.localeCompare(b, 'tr')),
    [xmlFields],
  );

  const handleRowChange = (xmlField: string, targetKey: string) => {
    setMapping(prev => ({ ...prev, [xmlField]: targetKey }));
  };

  const addCustomField = () => {
    const label = newFieldLabel.trim();
    const xmlField = newFieldXml.trim();
    if (!label) {
      toast.error('Özel alan adı girin.');
      return;
    }
    if (!xmlField) {
      toast.error('XML alanı seçin.');
      return;
    }
    const key = makeCustomTargetKey(label);
    if (dropdownTargets.some(t => t.key === key)) {
      toast.error('Bu isimde bir alan zaten var.');
      return;
    }
    setCustomTargets(prev => [...prev, { key, label }]);
    setMapping(prev => ({ ...prev, [xmlField]: key }));
    setNewFieldLabel('');
    setNewFieldXml('');
    toast.success(`"${label}" eklendi.`);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {xmlFields.length} XML alanı · Tanınan alanlar otomatik seçildi; kontrol edip düzenleyebilirsiniz
      </p>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-1/2">
                XML alanı
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-1/2">
                Sistem alanı
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedXmlFields.map((xmlField, i) => {
              const value = mapping[xmlField] ?? '';
              const sample = sampleRows[0]?.[xmlField];
              return (
                <tr
                  key={xmlField}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                >
                  <td className="px-4 py-2.5 align-top">
                    <span className="font-mono text-sm text-gray-900">{xmlField}</span>
                    {sample != null && String(sample).trim() !== '' && (
                      <p className="text-xs text-gray-400 mt-1 truncate max-w-md" title={String(sample)}>
                        Örnek: {String(sample).length > 60 ? `${String(sample).slice(0, 60)}…` : sample}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={value === '__ignore__' ? '' : value}
                      onChange={e => handleRowChange(xmlField, e.target.value)}
                      className="wn-select w-full px-2.5 py-1.5 text-sm text-black bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
                      style={{ color: '#000', backgroundColor: '#fff', colorScheme: 'light' }}
                    >
                      <option value="">— Seçin —</option>
                      {dropdownTargets.map(t => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                      <option value="__ignore__">— Yoksay —</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
        <p className="text-sm font-medium text-indigo-950">Özel alan ekle</p>
        <div className="flex flex-col lg:flex-row gap-2">
          <input
            type="text"
            value={newFieldLabel}
            onChange={e => setNewFieldLabel(e.target.value)}
            placeholder="Alan adı (örn. Taş Türü)"
            className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
          />
          <select
            value={newFieldXml}
            onChange={e => setNewFieldXml(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
          >
            <option value="">— XML alanı —</option>
            {sortedXmlFields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCustomField}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700
                       bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Ekle
          </button>
        </div>
      </div>
    </div>
  );
}
