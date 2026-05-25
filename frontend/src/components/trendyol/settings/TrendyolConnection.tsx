/**
 * TrendyolConnection
 * Trendyol API kimlik bilgileri formu + bağlantı testi.
 * TrendyolIntegration.tsx#SetupTab'ın bağımsız kardeşidir.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from './trendyol-settings-api';

// ─── SecretField ─────────────────────────────────────────────────────────────

function SecretField({
  label, value, onChange, placeholder = '••••••••',
  hint, required = false, type = 'password',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; required?: boolean; type?: 'text' | 'password';
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!value || value === '***') return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400 bg-white">
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent"
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="px-2 text-gray-400 hover:text-gray-700 transition-colors" tabIndex={-1} title={show ? 'Gizle' : 'Göster'}>
            {show
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            }
          </button>
        )}
        <button type="button" onClick={copy} disabled={!value || value === '***'}
          className="px-2 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30" tabIndex={-1} title="Kopyala">
          {copied
            ? <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          }
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FormState = {
  supplierId: string; apiKey: string; apiSecret: string;
  token: string; integrationCode: string;
};

const EMPTY: FormState = { supplierId: '', apiKey: '', apiSecret: '', token: '', integrationCode: '' };

export default function TrendyolConnection() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [testing, setTesting] = useState(false);

  const { data: integration } = useQuery({
    queryKey: ['trendyol-integration'],
    queryFn:  settingsApi.getIntegration,
  });

  const { data: stats } = useQuery({
    queryKey: ['trendyol-stats'],
    queryFn:  settingsApi.getStats,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (integration) {
      setForm({
        supplierId:      integration.supplierId      ?? '',
        apiKey:          integration.apiKey          ?? '',
        apiSecret:       integration.apiSecret       ?? '',
        token:           integration.token           ?? '',
        integrationCode: integration.integrationCode ?? '',
      });
    }
  }, [integration]);

  const set = (k: keyof FormState) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const missingRequired = !form.supplierId.trim() || !form.apiKey.trim() || !form.apiSecret.trim();

  const saveMut = useMutation({
    mutationFn: () => settingsApi.saveIntegration(form),
    onSuccess:  () => {
      toast.success('API bilgileri kaydedildi.');
      qc.invalidateQueries({ queryKey: ['trendyol-stats'] });
      qc.invalidateQueries({ queryKey: ['trendyol-integration'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? e.message),
  });

  const testConn = async () => {
    if (missingRequired) { toast.error('Önce Supplier ID, API Key ve API Secret alanlarını doldurun.'); return; }
    setTesting(true);
    try {
      const hasChanges = [form.apiKey, form.apiSecret, form.token].some(v => v && v !== '***');
      if (hasChanges) await settingsApi.saveIntegration(form);
      const res = await settingsApi.testConnection();
      if (res.success) toast.success(res.message ?? 'Bağlantı başarılı!');
      else toast.error(res.message ?? 'Bağlantı başarısız.');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message ?? 'Test başarısız.');
    } finally { setTesting(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">API Bağlantısı</h3>
          <p className="text-[11px] text-gray-400">Supplier ID, API Key ve Secret bilgileri</p>
        </div>
        {/* Connection status dot */}
        {stats && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            stats.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stats.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}/>
            {stats.connected ? 'Bağlı' : 'Bağlı Değil'}
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SecretField label="Supplier ID (Mağaza ID)" value={form.supplierId} onChange={set('supplierId')}
            type="text" placeholder="12345678" hint="Trendyol satıcı kimlik numaranız" required/>
          <SecretField label="API Key" value={form.apiKey} onChange={set('apiKey')}
            type="password" placeholder="••••••••••••" hint="Maskelenmiş — değiştirmek için yeniden girin" required/>
          <SecretField label="API Secret" value={form.apiSecret} onChange={set('apiSecret')}
            type="password" placeholder="••••••••••••" hint="Maskelenmiş — değiştirmek için yeniden girin" required/>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecretField label="Token" value={form.token} onChange={set('token')}
            type="password" placeholder="Bearer token (opsiyonel)" hint="OAuth Bearer token"/>
          <SecretField label="Entegrasyon Referans Kodu" value={form.integrationCode} onChange={set('integrationCode')}
            type="text" placeholder="WTG-2024-XXXXX" hint="Trendyol tarafından verilen entegrasyon tanımlayıcısı"/>
        </div>

        {missingRequired && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Kaydetmek için Supplier ID, API Key ve API Secret zorunludur.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-1">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || missingRequired}
            className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
            {saveMut.isPending && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saveMut.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button onClick={testConn} disabled={testing || missingRequired}
            className="flex items-center gap-2 px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
            {testing
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Test ediliyor…</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Bağlantıyı Test Et</>
            }
          </button>
        </div>

        {/* Stats (when connected) */}
        {stats?.connected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            {[
              { label: 'Toplam Ürün',      value: stats.totalProducts ?? 0, cls: 'text-gray-800' },
              { label: "Trendyol'da",      value: stats.sent ?? 0,          cls: 'text-emerald-600' },
              { label: 'Eşleştirilmemiş', value: stats.unmapped ?? 0,       cls: 'text-amber-600' },
              { label: 'Hatalı',           value: stats.errors ?? 0,         cls: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{s.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${s.cls}`}>{s.value.toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
