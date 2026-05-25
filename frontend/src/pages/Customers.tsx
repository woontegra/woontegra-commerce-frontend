import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  useCustomers,
  useCustomerStats,
  useCreateCustomer,
  useDeleteCustomer,
} from '../hooks/useCustomers';
import type { Customer, CreateCustomerDto, GetCustomersQuery } from '../services/customer.service';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso));
}

function initials(c: Customer) {
  return `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();
}

function avatarColor(id: string) {
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100   text-pink-700',
    'bg-blue-100   text-blue-700',
    'bg-teal-100   text-teal-700',
    'bg-orange-100 text-orange-700',
  ];
  const idx = id.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color,
}: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
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

// ── Create modal ───────────────────────────────────────────────────────────

interface CreateModalProps {
  open:    boolean;
  onClose: () => void;
}

function CreateCustomerModal({ open, onClose }: CreateModalProps) {
  const createMut = useCreateCustomer();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerDto>();

  const onSubmit = async (data: CreateCustomerDto) => {
    await createMut.mutateAsync(data);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Müşteri Ekle</h2>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ahmet"
                {...register('firstName', {
                  required:  'Ad zorunludur.',
                  minLength: { value: 2, message: 'En az 2 karakter.' },
                })}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-indigo-400 ${errors.firstName ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Yılmaz"
                {...register('lastName', {
                  required:  'Soyad zorunludur.',
                  minLength: { value: 2, message: 'En az 2 karakter.' },
                })}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-indigo-400 ${errors.lastName ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="ahmet@example.com"
              {...register('email', {
                required: 'E-posta zorunludur.',
                pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Geçerli bir e-posta girin.' },
              })}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                focus:ring-indigo-400 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              placeholder="+90 555 000 00 00"
              {...register('phone')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none
                         focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
              <input
                type="text"
                placeholder="İstanbul"
                {...register('city')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none
                           focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ülke</label>
              <input
                type="text"
                placeholder="Türkiye"
                {...register('country')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none
                           focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
            <input
              type="text"
              placeholder="Mahalle, sokak no..."
              {...register('address')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none
                         focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                         border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
                         rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {createMut.isPending && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {createMut.isPending ? 'Kaydediliyor...' : 'Müşteri Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50];

export default function Customers() {
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

  const query: GetCustomersQuery = useMemo(
    () => ({ page, limit, ...(search ? { search } : {}) }),
    [page, limit, search],
  );

  const { data: result, isLoading, isFetching } = useCustomers(query);
  const { data: stats }                          = useCustomerStats();
  const deleteMut                                = useDeleteCustomer();

  const customers  = result?.customers  ?? [];
  const total      = result?.total      ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);

  const handleClear = () => {
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tüm müşterilerinizi görüntüleyin ve yönetin</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                     bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Müşteri Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Toplam Müşteri"
          value={stats?.total ?? '—'}
          color="bg-indigo-50"
          icon={
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Bu Ay Yeni"
          value={stats?.newThisMonth ?? '—'}
          color="bg-green-50"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
      </div>

      {/* Search bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Ad, soyad, e-posta veya telefon..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white
                         text-gray-900 placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
                       rounded-lg transition-colors"
          >
            Ara
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200
                         rounded-lg hover:bg-gray-50 transition-colors"
            >
              Temizle
            </button>
          )}
        </form>
      </Card>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            title={search ? 'Müşteri bulunamadı' : 'Henüz müşteri yok'}
            description={
              search
                ? 'Farklı bir arama terimi deneyin.'
                : 'Müşterileriniz sipariş verdikçe burada görünür. Ya da yukarıdan ekleyebilirsiniz.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {isFetching && !isLoading && (
            <div className="h-0.5 bg-indigo-100 overflow-hidden">
              <div className="h-full bg-indigo-500 animate-pulse" />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Konum
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sipariş
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Toplam Harcama
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    onDelete={() => setDeleteId(customer.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {total} müşteri
                {search && ` • "${search}" araması`}
              </span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="py-1 pl-2 pr-6 text-xs border border-gray-200 rounded bg-white focus:outline-none
                           focus:ring-1 focus:ring-indigo-400"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s} / sayfa</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Önceki
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki ›
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      <CreateCustomerModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Müşteriyi Sil</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve müşteriye ait
              tüm veriler silinecektir.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200
                           rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700
                           rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {deleteMut.isPending && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Customer row ───────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  onDelete,
}: {
  customer: Customer;
  onDelete: () => void;
}) {
  const location = [customer.city, customer.country].filter(Boolean).join(', ') || '—';

  return (
    <tr className="hover:bg-gray-50/60 transition-colors group">
      {/* Avatar + isim */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center
                        text-sm font-semibold flex-shrink-0 ${avatarColor(customer.id)}`}
          >
            {initials(customer)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {customer.firstName} {customer.lastName}
            </div>
          </div>
        </div>
      </td>

      {/* İletişim */}
      <td className="px-5 py-4">
        <div className="text-sm text-gray-900">{customer.email}</div>
        {customer.phone && (
          <div className="text-xs text-gray-400 mt-0.5">{customer.phone}</div>
        )}
      </td>

      {/* Konum */}
      <td className="px-5 py-4">
        <div className="text-sm text-gray-600">{location}</div>
      </td>

      {/* Sipariş sayısı */}
      <td className="px-5 py-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${customer.orderCount > 0
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
        >
          {customer.orderCount} sipariş
        </span>
      </td>

      {/* Toplam harcama */}
      <td className="px-5 py-4 text-right">
        <div className={`text-sm font-semibold
          ${customer.totalSpent > 0 ? 'text-gray-900' : 'text-gray-400'}`}
        >
          {customer.totalSpent > 0 ? fmtCurrency(customer.totalSpent) : '—'}
        </div>
      </td>

      {/* Tarih */}
      <td className="px-5 py-4">
        <div className="text-sm text-gray-500">{fmtDate(customer.createdAt)}</div>
      </td>

      {/* İşlem */}
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
