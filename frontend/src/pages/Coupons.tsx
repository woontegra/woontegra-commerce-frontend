import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  couponService,
  type Coupon,
  type CouponDiscountType,
  type CreateCouponDto,
  type GetCouponsQuery,
} from '../services/coupon.service';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

// ── Query keys ─────────────────────────────────────────────────────────────

const KEYS = {
  all:   ['coupons']                             as const,
  list:  (q?: GetCouponsQuery) => ['coupons', 'list',  q] as const,
  stats: ()                    => ['coupons', 'stats']    as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

function useCoupons(query: GetCouponsQuery) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn:  () => couponService.getAll(query),
  });
}

function useCouponStats() {
  return useQuery({
    queryKey:  KEYS.stats(),
    queryFn:   () => couponService.getStats(),
    staleTime: 30_000,
  });
}

function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: CreateCouponDto) => couponService.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Kupon oluşturuldu'); },
    onError:   (e: any) => toast.error(e.response?.data?.error ?? 'Kupon oluşturulamadı.'),
  });
}

function useToggleCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponService.toggle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Kupon durumu güncellendi'); },
    onError:   (e: any) => toast.error(e.response?.data?.error ?? 'Güncelleme başarısız.'),
  });
}

function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Kupon silindi'); },
    onError:   (e: any) => toast.error(e.response?.data?.error ?? 'Silme başarısız.'),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso));
}

function nextMonthStr() {
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function discountLabel(type: CouponDiscountType, value: number) {
  return type === 'PERCENTAGE' ? `%${value}` : `₺${value}`;
}

// ── Status badge ────────────────────────────────────────────────────────────

function CouponStatusBadge({ c }: { c: Coupon }) {
  if (c.isExpired)  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200">Süresi Doldu</span>;
  if (!c.isActive)  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200">Pasif</span>;
  if (c.remaining === 0) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-200">Limit Doldu</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">● Aktif</span>;
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </Card>
  );
}

// ── Coupon validator widget ─────────────────────────────────────────────────

function CouponValidator() {
  const [code,    setCode]    = useState('');
  const [amount,  setAmount]  = useState('');
  const [result,  setResult]  = useState<{ valid: boolean; discount: number; final: number; coupon: Coupon | null; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Kupon kodu girin.'); return; }
    const orderAmount = parseFloat(amount);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) { toast.error('Geçerli bir sipariş tutarı girin.'); return; }
    setLoading(true);
    try {
      const r = await couponService.validate(code.trim(), orderAmount);
      setResult({ valid: r.valid, discount: r.discountAmount, final: r.finalAmount, coupon: r.coupon, error: r.error });
    } catch { toast.error('Kontrol başarısız.'); }
    finally { setLoading(false); }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-violet-50 rounded-lg">
          <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Kupon Test Et</h3>
      </div>
      <p className="text-xs text-gray-500">Kuponun geçerliliğini sipariş tutarına göre kontrol edin.</p>
      <form onSubmit={handleCheck} className="space-y-3">
        <input
          type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="KODU GIRIN"
          className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-gray-200
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 uppercase bg-white"
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
          <input
            type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Sipariş tutarı"
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700
                     rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Kontrol Ediliyor...' : 'Kuponu Kontrol Et'}
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-xl border space-y-2 text-sm ${
          result.valid
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {result.valid ? (
            <>
              <div className="flex items-center gap-2 font-semibold text-emerald-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                Kupon geçerli!
              </div>
              <div className="text-emerald-700">
                İndirim: <strong>₺{result.discount.toFixed(2)}</strong>
              </div>
              <div className="text-emerald-700">
                Son tutar: <strong>₺{result.final.toFixed(2)}</strong>
              </div>
              {result.coupon?.remaining != null && (
                <div className="text-xs text-emerald-600">
                  Kalan kullanım: {result.coupon.remaining}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              {result.error ?? 'Geçersiz kupon.'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Create form modal ───────────────────────────────────────────────────────

interface CreateFormValues {
  code:           string;
  discountType:   CouponDiscountType;
  value:          number;
  minOrderAmount: string;
  maxDiscount:    string;
  usageLimit:     string;
  isActive:       boolean;
  expiresAt:      string;
}

function CreateCouponModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateCoupon();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateFormValues>({
    defaultValues: {
      discountType: 'PERCENTAGE',
      isActive:     true,
      expiresAt:    nextMonthStr(),
    },
  });
  const type = watch('discountType');

  const onSubmit = async (data: CreateFormValues) => {
    await createMut.mutateAsync({
      code:           data.code.trim().toUpperCase(),
      discountType:   data.discountType,
      value:          Number(data.value),
      minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : undefined,
      maxDiscount:    data.maxDiscount    ? Number(data.maxDiscount)    : undefined,
      usageLimit:     data.usageLimit     ? Number(data.usageLimit)     : null,
      isActive:       data.isActive,
      expiresAt:      data.expiresAt      ? data.expiresAt              : null,
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Yeni Kupon Oluştur</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sipariş sırasında uygulanacak indirim kuponu</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kupon Kodu <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 ml-1 font-normal">— büyük harf + rakam, 3-32 karakter</span>
            </label>
            <input
              {...register('code', {
                required: 'Kupon kodu zorunludur.',
                minLength: { value: 3, message: 'En az 3 karakter.' },
                maxLength: { value: 32, message: 'En fazla 32 karakter.' },
                pattern: { value: /^[A-Z0-9_-]+$/i, message: 'Yalnızca harf, rakam, tire, alt çizgi.' },
              })}
              placeholder="YAZA50, HOSGELDIN, VIP20..."
              className={`w-full px-3 py-2 text-sm font-mono tracking-wider border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase ${errors.code ? 'border-red-400' : 'border-gray-200'}`}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İndirim Türü <span className="text-red-500">*</span>
              </label>
              <select
                {...register('discountType', { required: true })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="PERCENTAGE">Yüzde (%)</option>
                <option value="FIXED">Sabit Tutar (₺)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İndirim Değeri <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                  {type === 'PERCENTAGE' ? '%' : '₺'}
                </span>
                <input
                  {...register('value', {
                    required: 'Değer zorunludur.',
                    min: { value: 0.01, message: '0\'dan büyük olmalıdır.' },
                    max: type === 'PERCENTAGE' ? { value: 100, message: 'Yüzde 100\'ü geçemez.' } : undefined,
                  })}
                  type="number" min="0.01" step={type === 'PERCENTAGE' ? '1' : '0.01'}
                  placeholder={type === 'PERCENTAGE' ? '10' : '50.00'}
                  className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none
                    focus:ring-2 focus:ring-indigo-400 ${errors.value ? 'border-red-400' : 'border-gray-200'}`}
                />
              </div>
              {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value.message}</p>}
            </div>
          </div>

          {/* Min order + Max discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min. Sipariş Tutarı
                <span className="text-gray-400 text-xs ml-1">(opsiyonel)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
                <input
                  {...register('minOrderAmount', { min: { value: 0, message: '0 veya daha fazla.' } })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            {type === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maks. İndirim
                  <span className="text-gray-400 text-xs ml-1">(opsiyonel)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
                  <input
                    {...register('maxDiscount', { min: { value: 0, message: '0 veya daha fazla.' } })}
                    type="number" min="0" step="0.01" placeholder="Sınırsız"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Usage limit + Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kullanım Limiti
                <span className="text-gray-400 text-xs ml-1">(boş = sınırsız)</span>
              </label>
              <input
                {...register('usageLimit', { min: { value: 1, message: 'En az 1 olmalıdır.' } })}
                type="number" min="1" placeholder="Sınırsız"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Son Kullanım Tarihi
                <span className="text-gray-400 text-xs ml-1">(opsiyonel)</span>
              </label>
              <input
                {...register('expiresAt')}
                type="date"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* isActive toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <input
              {...register('isActive')} type="checkbox" id="couponActive"
              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <label htmlFor="couponActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Kuponu hemen aktif et
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              İptal
            </button>
            <button
              type="submit" disabled={createMut.isPending}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
                         rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {createMut.isPending && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              )}
              {createMut.isPending ? 'Kaydediliyor...' : 'Kupon Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Coupon row ──────────────────────────────────────────────────────────────

function CouponRow({ c, onDelete }: { c: Coupon; onDelete: () => void }) {
  const toggleMut = useToggleCoupon();

  const usagePct = c.usageLimit != null && c.usageLimit > 0
    ? Math.round((c.usageCount / c.usageLimit) * 100)
    : null;

  return (
    <tr className="hover:bg-gray-50/60 transition-colors group border-b border-gray-100">
      {/* Code */}
      <td className="px-5 py-4">
        <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100
                         px-2.5 py-1 rounded-lg tracking-wider">
          {c.code}
        </span>
      </td>

      {/* Discount */}
      <td className="px-5 py-4 text-sm">
        <span className={`font-semibold ${c.discountType === 'PERCENTAGE' ? 'text-indigo-700' : 'text-emerald-700'}`}>
          {discountLabel(c.discountType, c.value)} İndirim
        </span>
        {c.minOrderAmount != null && (
          <div className="text-xs text-gray-400 mt-0.5">min. ₺{c.minOrderAmount}</div>
        )}
        {c.maxDiscount    != null && (
          <div className="text-xs text-gray-400">max. ₺{c.maxDiscount}</div>
        )}
      </td>

      {/* Usage */}
      <td className="px-5 py-4">
        <div className="text-sm text-gray-700">
          {c.usageCount}
          {c.usageLimit != null
            ? <span className="text-gray-400"> / {c.usageLimit}</span>
            : <span className="text-gray-400"> / ∞</span>
          }
        </div>
        {usagePct != null && (
          <div className="mt-1 w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-400' : usagePct >= 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
        )}
      </td>

      {/* Expiry */}
      <td className="px-5 py-4 text-sm text-gray-600">
        {c.expiresAt ? fmtDate(c.expiresAt) : <span className="text-gray-400">—</span>}
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <CouponStatusBadge c={c}/>
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => toggleMut.mutate(c.id)}
            disabled={toggleMut.isPending}
            title={c.isActive ? 'Pasifleştir' : 'Aktifleştir'}
            className={`p-1.5 rounded-lg transition-colors ${c.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50];

export default function Coupons() {
  const [page,          setPage]         = useState(1);
  const [limit,         setLimit]        = useState(20);
  const [activeFilter,  setActiveFilter] = useState<'true' | 'false' | ''>('');
  const [searchInput,   setSearchInput]  = useState('');
  const [search,        setSearch]       = useState('');
  const [showCreate,    setShowCreate]   = useState(false);
  const [deleteId,      setDeleteId]     = useState<string | null>(null);

  const query: GetCouponsQuery = useMemo(() => ({
    page, limit,
    ...(activeFilter ? { active: activeFilter } : {}),
    ...(search       ? { search }               : {}),
  }), [page, limit, activeFilter, search]);

  const { data: result, isLoading, isFetching } = useCoupons(query);
  const { data: stats }                          = useCouponStats();
  const deleteMut                                = useDeleteCoupon();

  const coupons    = result?.coupons    ?? [];
  const total      = result?.total      ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault(); setPage(1); setSearch(searchInput.trim());
  }, [searchInput]);

  const handleClear = () => { setSearch(''); setSearchInput(''); setActiveFilter(''); setPage(1); };
  const hasFilter   = !!search || !!activeFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kuponlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">İndirim kuponları oluşturun, sipariş sırasında otomatik uygulanır</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                     bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Kupon Oluştur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam Kupon" value={stats?.total ?? '—'} color="bg-indigo-50"
          icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>}/>
        <StatCard label="Aktif" value={stats?.active ?? '—'} color="bg-green-50"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
        <StatCard label="Toplam Kullanım" value={stats?.totalUsage ?? '—'} color="bg-blue-50"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}/>
        <StatCard label="Süresi Doldu" value={stats?.expired ?? '—'} color="bg-gray-100"
          icon={<svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" placeholder="Kupon kodu ara..."
                  value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
              </div>
              <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value as any); setPage(1); }}
                className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="">Tüm Durumlar</option>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                Ara
              </button>
              {hasFilter && (
                <button type="button" onClick={handleClear}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Temizle
                </button>
              )}
            </form>
          </Card>

          {isLoading ? <TableSkeleton/> : coupons.length === 0 ? (
            <Card>
              <EmptyState
                icon={<svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>}
                title={hasFilter ? 'Kupon bulunamadı' : 'Henüz kupon yok'}
                description={hasFilter ? 'Filtrelerinizi değiştirin.' : 'Yukarıdan ilk kuponunuzu oluşturun.'}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              {isFetching && !isLoading && (
                <div className="h-0.5 bg-indigo-100"><div className="h-full bg-indigo-500 animate-pulse"/></div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kod</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">İndirim</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanım</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Son Tarih</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <CouponRow key={c.id} c={c} onDelete={() => setDeleteId(c.id)}/>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{total} kupon</span>
                  <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="py-1 pl-2 pr-6 text-xs border border-gray-200 rounded bg-white focus:outline-none">
                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / sayfa</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                    ‹ Önceki
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium text-gray-700">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                    Sonraki ›
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: validator + info */}
        <div className="space-y-4">
          <CouponValidator/>

          {/* Integration guide */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Sipariş Entegrasyonu</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">1.</span>
                <span>
                  Sipariş oluşturulurken <code className="bg-gray-100 px-1 rounded">POST /orders</code> isteğine
                  {' '}<code className="bg-gray-100 px-1 rounded">couponCode</code> alanını ekleyin
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">2.</span>
                Backend kuponun geçerliliğini kontrol eder ve toplam tutardan düşer
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">3.</span>
                Kullanım sayacı atomik olarak artırılır (race condition korumalı)
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">4.</span>
                <span>
                  Önceden kontrol için: <code className="bg-gray-100 px-1 rounded">POST /coupons/validate</code>
                </span>
              </li>
            </ul>
            {/* Code snippet */}
            <div className="mt-2 p-3 rounded-lg bg-gray-900 text-xs text-green-400 font-mono leading-relaxed overflow-x-auto">
              <div className="text-gray-500">{'//'} sipariş sırasında kupon uygula</div>
              <div>{'{'}</div>
              <div className="pl-3 text-yellow-300">"customerId"<span className="text-white">: "..."</span>,</div>
              <div className="pl-3 text-yellow-300">"items"<span className="text-white">: [...]</span>,</div>
              <div className="pl-3 text-yellow-300">"couponCode"<span className="text-white">: <span className="text-green-400">"YAZA50"</span></span></div>
              <div>{'}'}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && <CreateCouponModal onClose={() => setShowCreate(false)}/>}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Kuponu Sil</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Bu kupon kalıcı olarak silinecek. Devam etmek istiyor musunuz?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                İptal
              </button>
              <button
                onClick={async () => { await deleteMut.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700
                           rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {deleteMut.isPending && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
