/**
 * Trendyol Onboarding Wizard
 *
 * 4-step guided flow for first-time Trendyol integration:
 *   1  → Connect Trendyol API credentials
 *   2  → Map one local category to a Trendyol category
 *   3  → Pick a product and send it to Trendyol
 *   4  → Success 🎉
 *
 * Route: /onboarding  (public, but redirects to /login if no auth token)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../services/apiClient';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrendyolCategory { id: number; name: string; parentId?: number | null }
interface LocalCategory    { id: string; name: string; level: number }
interface ProductItem      { id: string; name: string; mainImage?: string | null; price: number; sku?: string | null }

type StepId = 1 | 2 | 3 | 4;

// ── Masked input with show/hide toggle ────────────────────────────────────────

function MaskedInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  className?:  string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        title={show ? 'Gizle' : 'Göster'}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: 'Trendyol Bağlantısı' },
  { id: 2, label: 'Kategori Eşleştir' },
  { id: 3, label: 'İlk Ürünü Gönder' },
  { id: 4, label: 'Tamamlandı 🎉' },
];

function StepIndicator({ current }: { current: StepId }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10 select-none">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s.id < current  ? 'bg-emerald-500 text-white' :
              s.id === current ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-100' :
                                 'bg-slate-100 text-slate-400'
            }`}>
              {s.id < current ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              ) : s.id}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap hidden sm:block ${
              s.id === current ? 'text-orange-600' : s.id < current ? 'text-emerald-600' : 'text-slate-400'
            }`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 min-w-[24px] max-w-[60px] mx-1 rounded-full transition-all ${
              s.id < current ? 'bg-emerald-400' : 'bg-slate-200'
            }`}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Trendyol API Credentials (5 fields)
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Props { onComplete: () => void }

const INPUT_CLS = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400';

type Step1Form = {
  supplierId:      string;
  apiKey:          string;
  apiSecret:       string;
  integrationCode: string;
  token:           string;
};

const EMPTY_FORM: Step1Form = {
  supplierId:      '',
  apiKey:          '',
  apiSecret:       '',
  integrationCode: '',
  token:           '',
};

function Step1Connect({ onComplete }: Step1Props) {
  const [form,      setForm]      = useState<Step1Form>(EMPTY_FORM);
  const [testing,   setTesting]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [testOk,    setTestOk]    = useState(false);   // true after successful test
  const [testError, setTestError] = useState<string | null>(null);

  // Pre-fill if already configured
  useEffect(() => {
    apiClient.get('/trendyol/integration', { skipErrorToast: true })
      .then(r => {
        const d = r.data?.data ?? r.data;
        if (d?.supplierId) {
          setForm({
            supplierId:      String(d.supplierId ?? ''),
            apiKey:          d.apiKey          ?? '',
            apiSecret:       d.apiSecret       ?? '',
            integrationCode: d.integrationCode ?? '',
            token:           d.token           ?? '',
          });
          setTestOk(true); // assume pre-configured = already tested
        }
      })
      .catch(() => {/* not configured yet */});
  }, []);

  const allFilled = (Object.values(form) as string[]).every(v => v.trim() !== '');

  const setField = (key: keyof Step1Form) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setTestOk(false);
    setTestError(null);
  };

  const handleTest = async () => {
    if (!allFilled) { toast.error('Lütfen tüm alanları doldurun.'); return; }
    setTesting(true);
    setTestOk(false);
    setTestError(null);
    try {
      // Persist credentials first so the test endpoint can pick them up
      await apiClient.post('/trendyol/integration', form, { skipErrorToast: true });
      const res = await apiClient.post('/trendyol/integration/test', {}, { skipErrorToast: true });
      const ok  = res.data?.success === true || res.data?.connected === true;
      if (ok) {
        setTestOk(true);
      } else {
        setTestError(res.data?.message ?? 'Bağlantı başarısız. Bilgileri kontrol edin.');
      }
    } catch (err) {
      setTestError(extractErrorMessage(err, 'API bilgilerini kontrol edin.'));
    } finally {
      setTesting(false);
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await apiClient.post('/trendyol/integration', form, { skipErrorToast: true });
      onComplete();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Kayıt başarısız.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-4 px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Trendyol Hesabını Bağla</h2>
          <p className="text-sm text-slate-500">API bilgilerini girerek mağazanı Trendyol'a bağla</p>
        </div>
      </div>

      {/* Info box */}
      <div className="mx-8 mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <p className="font-semibold mb-1">Bu bilgileri nereden bulabilirim?</p>
        <p className="text-blue-600 text-[13px]">
          Trendyol satıcı panelinde <strong>Hesabım → API Yönetimi</strong> bölümünden alabilirsiniz.
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-6 space-y-4">

        {/* supplierId */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Satıcı ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.supplierId}
            onChange={e => setField('supplierId')(e.target.value)}
            placeholder="Örn: 123456"
            className={INPUT_CLS}
          />
        </div>

        {/* apiKey */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            API Key <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.apiKey}
            onChange={e => setField('apiKey')(e.target.value)}
            placeholder="API anahtarınız"
            autoComplete="off"
            className={INPUT_CLS}
          />
        </div>

        {/* apiSecret — masked */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            API Secret <span className="text-red-400">*</span>
          </label>
          <MaskedInput
            value={form.apiSecret}
            onChange={setField('apiSecret')}
            placeholder="API şifreniz"
            className={INPUT_CLS}
          />
        </div>

        {/* integrationCode */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Entegrasyon Kodu <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.integrationCode}
            onChange={e => setField('integrationCode')(e.target.value)}
            placeholder="Trendyol entegrasyon kodunuz"
            autoComplete="off"
            className={INPUT_CLS}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            API Yönetimi → Entegrasyon Kodu alanından kopyalayın.
          </p>
        </div>

        {/* token — masked */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Token <span className="text-red-400">*</span>
          </label>
          <MaskedInput
            value={form.token}
            onChange={setField('token')}
            placeholder="Bearer tokenınız"
            className={INPUT_CLS}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            API Yönetimi → Token / Bearer Token alanından kopyalayın.
          </p>
        </div>
      </div>

      {/* Test result banner */}
      {testOk && (
        <div className="mx-8 mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-sm text-emerald-700 font-semibold">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
          </svg>
          Bağlantı başarılı! Devam edebilirsiniz.
        </div>
      )}
      {testError && (
        <div className="mx-8 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-700">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span><strong>Bağlantı hatası:</strong> {testError}</span>
        </div>
      )}

      {/* Footer */}
      <div className="px-8 pb-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !allFilled}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? <Spinner className="w-4 h-4 text-orange-500"/> : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
          {testing ? 'Test Ediliyor…' : 'Bağlantıyı Test Et'}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!testOk || saving}
          title={!testOk ? 'Önce bağlantıyı test edin' : undefined}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {saving ? <Spinner className="w-4 h-4 text-white"/> : null}
          {saving ? 'Kaydediliyor…' : 'Devam Et →'}
        </button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Category Mapping
// ─────────────────────────────────────────────────────────────────────────────

interface Step2Props { onComplete: () => void; onBack: () => void }

function Step2Categories({ onComplete, onBack }: Step2Props) {
  const [localCats,    setLocalCats]    = useState<LocalCategory[]>([]);
  const [trendyolCats, setTrendyolCats] = useState<TrendyolCategory[]>([]);
  const [localSel,     setLocalSel]     = useState('');
  const [trendyolSel,  setTrendyolSel]  = useState<number | null>(null);
  const [catSearch,    setCatSearch]    = useState('');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/trendyol/local-categories',    { skipErrorToast: true }),
      apiClient.get('/trendyol/trendyol-categories', { skipErrorToast: true }),
    ]).then(([lcRes, tcRes]) => {
      const lc = lcRes.data?.data ?? lcRes.data ?? [];
      const tc = tcRes.data?.data ?? tcRes.data ?? [];
      setLocalCats(Array.isArray(lc) ? lc : []);
      setTrendyolCats(Array.isArray(tc) ? tc : []);
    }).catch(() => {
      toast.error('Kategoriler yüklenemedi. Lütfen sayfayı yenileyin.');
    }).finally(() => setLoading(false));
  }, []);

  const filteredTrendyol = trendyolCats.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  ).slice(0, 80);

  const handleSave = async () => {
    if (!localSel || !trendyolSel) {
      toast.error('Lütfen her iki kategoriyi de seçin.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/trendyol/category-mapping', {
        mappings: [{ localCategoryId: localSel, trendyolCategoryId: trendyolSel }],
      }, { skipErrorToast: true });
      toast.success('Kategori eşleştirmesi kaydedildi ✓');
      onComplete();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Kayıt başarısız.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedTrendyolName = trendyolCats.find(c => c.id === trendyolSel)?.name;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-4 px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kategori Eşleştirme</h2>
          <p className="text-sm text-slate-500">Kendi kategorinden bir Trendyol kategorisi seç</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-indigo-400"/>
        </div>
      ) : (
        <div className="px-8 py-6 space-y-6">
          {/* Local category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Kendi Kategorin
            </label>
            {localCats.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                Henüz kategori eklenmemiş.{' '}
                <a href="/dashboard/categories" className="font-semibold underline">Kategori ekle →</a>
              </div>
            ) : (
              <select
                value={localSel}
                onChange={e => setLocalSel(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
              >
                <option value="">— Kategori seçin —</option>
                {localCats.map(c => (
                  <option key={c.id} value={c.id}>
                    {'  '.repeat(c.level)}{c.level > 0 ? '↳ ' : ''}{c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Trendyol category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Trendyol Kategorisi
              {selectedTrendyolName && (
                <span className="ml-2 text-indigo-600 font-normal">→ {selectedTrendyolName}</span>
              )}
            </label>
            <input
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Kategori ara…"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 mb-2"
            />
            <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-52 divide-y divide-slate-50">
              {filteredTrendyol.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Sonuç bulunamadı</p>
              ) : (
                filteredTrendyol.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTrendyolSel(c.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      trendyolSel === c.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {trendyolSel === c.id && <span className="mr-1.5">✓</span>}
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-8 pb-8 flex items-center justify-between">
        <button type="button" onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Geri
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!localSel || !trendyolSel || saving || loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {saving ? <Spinner className="w-4 h-4 text-white"/> : null}
          {saving ? 'Kaydediliyor…' : 'Eşleştirmeyi Kaydet →'}
        </button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Pick & send first product
// ─────────────────────────────────────────────────────────────────────────────

interface Step3Props { onComplete: () => void; onBack: () => void }

function Step3SendProduct({ onComplete, onBack }: Step3Props) {
  const [products,   setProducts]   = useState<ProductItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [sending,    setSending]    = useState(false);
  const [issues,     setIssues]     = useState<string[]>([]);

  useEffect(() => {
    apiClient.get('/products', { params: { limit: 20, page: 1 }, skipErrorToast: true })
      .then(r => {
        const items = r.data?.items ?? r.data?.data?.items ?? (Array.isArray(r.data) ? r.data : []);
        setProducts(items.slice(0, 20));
      })
      .catch(() => toast.error('Ürünler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!selectedId) return;

    // Validate
    setValidating(true);
    setIssues([]);
    try {
      const vRes    = await apiClient.post('/trendyol/products/validate', { productIds: [selectedId] }, { skipErrorToast: true });
      const payload = vRes.data;
      const reports = payload?.data ?? payload?.reports ?? (Array.isArray(payload) ? payload : []);
      const errors  = (reports as any[]).flatMap((r: any) =>
        (r.errors ?? r.issues?.filter((i: any) => i.level === 'error') ?? []).map((e: any) => e.message)
      );
      if (errors.length > 0) {
        setIssues(errors);
        setValidating(false);
        return;
      }
    } catch {
      // If validate fails proceed anyway
    }
    setValidating(false);

    // Send
    setSending(true);
    try {
      await apiClient.post('/trendyol/products/send', { productIds: [selectedId], skipInvalid: true }, { skipErrorToast: true });
      toast.success('Ürün Trendyol\'a gönderildi! 🎉');
      onComplete();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gönderim başarısız.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-4 px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">İlk Ürünü Gönder</h2>
          <p className="text-sm text-slate-500">Listeden bir ürün seç ve Trendyol'a gönder</p>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mx-8 mt-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700 mb-2">Bu ürün gönderilemez:</p>
          <ul className="space-y-1">
            {issues.map((msg, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">•</span>{msg}
              </li>
            ))}
          </ul>
          <a href="/dashboard/marketplaces/trendyol"
            className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:underline">
            Trendyol Entegrasyon Ayarları →
          </a>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-emerald-400"/>
        </div>
      ) : products.length === 0 ? (
        <div className="px-8 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700 mb-1">Henüz ürün yok</p>
          <p className="text-xs text-slate-400 mb-4">Önce bir ürün eklemen gerekiyor.</p>
          <a href="/dashboard/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            + Ürün Ekle
          </a>
        </div>
      ) : (
        <div className="px-8 py-4">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {products.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedId(p.id); setIssues([]); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedId === p.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                {/* Radio */}
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                  selectedId === p.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}>
                  {selectedId === p.id && <div className="w-2 h-2 rounded-full bg-white m-auto mt-0.5"/>}
                </div>
                {/* Thumb */}
                {p.mainImage ? (
                  <img src={p.mainImage} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-100"/>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {p.sku && <span className="mr-2 font-mono">{p.sku}</span>}
                    ₺{Number(p.price).toFixed(2)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-8 pb-8 flex items-center justify-between">
        <button type="button" onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Geri
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedId || validating || sending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {(validating || sending) ? <Spinner className="w-4 h-4 text-white"/> : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          )}
          {validating ? 'Kontrol ediliyor…' : sending ? 'Gönderiliyor…' : 'Trendyol\'a Gönder'}
        </button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Success
// ─────────────────────────────────────────────────────────────────────────────

interface Step4Props { onFinish: () => void }

function Step4Success({ onFinish }: Step4Props) {
  return (
    <Card>
      <div className="px-8 py-14 text-center">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-3">
          Tebrikler! 🎉
        </h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10">
          İlk ürününü başarıyla Trendyol'a gönderdin. Artık toplu gönderim yaparak tüm ürünlerini ekleyebilirsin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onFinish}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Ürünlere Git
          </button>
          <a
            href="/dashboard/marketplaces/trendyol"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Toplu Gönderim Yap
          </a>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WIZARD
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState<StepId>(1);
  const [checkingSkip, setCheckingSkip] = useState(true);
  const checkedRef = useRef(false);

  // Auto-skip: if Trendyol already connected + category mapped → go to dashboard
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    // Auth is guaranteed by ProtectedRoute — just check onboarding state
    Promise.all([
      apiClient.get('/trendyol/integration',     { skipErrorToast: true }).catch(() => null),
      apiClient.get('/trendyol/category-mapping', { skipErrorToast: true }).catch(() => null),
    ]).then(([intRes, catRes]) => {
      const integration = intRes?.data?.data ?? intRes?.data;
      const catMappings = catRes?.data?.data  ?? catRes?.data;

      const isConnected = !!integration?.supplierId;
      const isMapped    = Array.isArray(catMappings)
        ? catMappings.length > 0
        : typeof catMappings === 'object' && catMappings !== null && Object.keys(catMappings).length > 0;

      // If user already completed onboarding → go straight to dashboard
      const done = localStorage.getItem('trendyol_onboarding_done');
      if (done === 'true') {
        navigate('/dashboard', { replace: true });   // dashboard itself redirects here only if not done
        return;
      }

      // Resume at the appropriate step
      if (isConnected && isMapped) setStep(3);
      else if (isConnected)        setStep(2);

      setCheckingSkip(false);
    }).catch(() => setCheckingSkip(false));
  }, [navigate]);

  const markDone = useCallback(() => {
    localStorage.setItem('trendyol_onboarding_done', 'true');
    navigate('/dashboard/products', { replace: true });
  }, [navigate]);

  if (checkingSkip) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-10 h-10 text-orange-400"/>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 page-enter">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Trendyol Kurulumu</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Birkaç adımda Trendyol entegrasyonunu tamamla ve ilk ürününü gönder.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      {step === 1 && (
        <Step1Connect onComplete={() => setStep(2)} />
      )}
      {step === 2 && (
        <Step2Categories onComplete={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <Step3SendProduct onComplete={() => setStep(4)} onBack={() => setStep(2)} />
      )}
      {step === 4 && (
        <Step4Success onFinish={markDone} />
      )}

      {/* Skip link (steps 1–3 only) */}
      {step < 4 && (
        <p className="text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="hover:text-slate-600 underline underline-offset-2 transition-colors"
          >
            Şimdi değil, panele git
          </button>
        </p>
      )}
    </div>
  );
}
