import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Loader2,
  Mail,
  RefreshCw,
  Radio,
  Smartphone,
} from 'lucide-react';
import {
  categoryLabelForType,
  categoryStatusClass,
  categoryStatusLabel,
  EMAIL_PREFERENCE_ITEMS,
  formatNotificationDate,
  isToday,
  NOTIFICATION_CATEGORIES,
  resolveCategoryStatus,
  type NotificationModuleState,
} from './notificationPageHelpers';
import type { ApiNotification } from '../services/notificationApi.service';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationApi.service';

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[100px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="wn-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
        {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Notifications() {
  const [moduleState, setModuleState] = useState<NotificationModuleState>('unknown');
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const [listResult, unread] = await Promise.all([
      fetchNotifications(1, 50),
      fetchUnreadNotificationCount(),
    ]);

    if (listResult.ok) {
      setNotifications(listResult.items);
      setTotal(listResult.total);
      setUnreadCount(unread !== null ? unread : listResult.unread);
      setTodayCount(listResult.items.filter(n => isToday(n.createdAt)).length);
      setModuleState('available');
      setLoadError(null);
    } else if (listResult.reason === 'not_available') {
      setNotifications([]);
      setTotal(0);
      setUnreadCount(0);
      setTodayCount(0);
      setModuleState('unavailable');
      setLoadError(null);
    } else {
      setNotifications([]);
      setTotal(0);
      setUnreadCount(0);
      setTodayCount(0);
      setModuleState('unknown');
      setLoadError(listResult.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const apiAvailable = moduleState === 'available';

  const handleMarkAllRead = async () => {
    if (!apiAvailable) return;
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);
    if (result.ok) {
      toast.success('Tüm bildirimler okundu olarak işaretlendi.');
      void loadNotifications();
    } else {
      toast.error(result.message);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!apiAvailable) return;
    setMarkingId(id);
    const result = await markNotificationRead(id);
    setMarkingId(null);
    if (result.ok) {
      void loadNotifications();
    } else {
      toast.error(result.message);
    }
  };

  const channelItems = useMemo(() => [
    {
      id: 'inapp',
      label: 'Panel içi bildirimler',
      status: apiAvailable ? 'Aktif' : moduleState === 'unavailable' ? 'Planlandı' : 'Kontrol ediliyor…',
      tone: apiAvailable ? 'success' as const : 'muted' as const,
      icon: Bell,
    },
    {
      id: 'email',
      label: 'E-posta bildirimleri',
      status: 'Planlandı',
      tone: 'warning' as const,
      icon: Mail,
    },
    {
      id: 'realtime',
      label: 'Realtime bildirimler',
      status: 'Planlandı',
      tone: 'muted' as const,
      icon: Radio,
    },
    {
      id: 'sms',
      label: 'SMS / WhatsApp',
      status: 'Planlandı',
      tone: 'muted' as const,
      icon: Smartphone,
    },
  ], [apiAvailable, moduleState]);

  const checklist = useMemo(() => [
    {
      id: 'email_infra',
      label: 'E-posta gönderimi yapılandırıldı',
      done: false,
      note: 'Sonraki faz',
    },
    {
      id: 'order_email',
      label: 'Sipariş e-postaları aktif',
      done: false,
      note: 'Tercih API planlandı',
    },
    {
      id: 'payment_email',
      label: 'Ödeme e-postaları aktif',
      done: false,
      note: 'Tercih API planlandı',
    },
    {
      id: 'panel_infra',
      label: 'Panel bildirim altyapısı hazır',
      done: apiAvailable,
      note: apiAvailable ? 'Backend bağlı' : 'Endpoint bekleniyor',
    },
    {
      id: 'realtime',
      label: 'Realtime altyapı planlandı',
      done: false,
      note: 'Websocket gerekli',
    },
  ], [apiAvailable]);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Bildirim Yönetimi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Sistem bildirimlerini, e-posta tercihlerini ve mağaza uyarılarını yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={!apiAvailable || markingAll || unreadCount === 0}
            title={!apiAvailable ? 'Panel bildirim API\'si aktif değil' : undefined}
            className="btn btn-secondary text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Tümünü Okundu İşaretle
          </button>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="btn btn-primary text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Bildirimleri Yenile
          </button>
        </div>
      </div>

      {moduleState === 'unavailable' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[13px] text-indigo-900">
          <p className="font-medium">Panel bildirim altyapısı henüz aktif değil.</p>
          <p className="text-[12px] text-indigo-800/80 mt-1">
            Bildirim listesi ve okundu işaretleme sonraki fazda tam kapasiteyle kullanılabilir olacak.
            E-posta tercihleri ayrı bir fazda eklenecektir.
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Bildirim verileri yüklenemedi.</p>
              <p className="text-[12px] mt-0.5 opacity-90">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="btn btn-secondary text-[12px] inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric
          label="Okunmamış Bildirim"
          value={loading ? '…' : apiAvailable ? unreadCount : moduleState === 'unavailable' ? 'Planlandı' : 0}
        />
        <SummaryMetric
          label="Bugünkü Bildirim"
          value={loading ? '…' : apiAvailable ? todayCount : '—'}
        />
        <SummaryMetric
          label="E-posta Bildirimleri"
          value={loading ? '…' : 'Planlandı'}
        />
        <SummaryMetric
          label="Sistem Bildirimleri"
          value={loading ? '…' : apiAvailable ? 'Aktif' : 'Henüz aktif değil'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <Panel title="Bildirim Listesi" desc="Mağaza panelinde oluşan sistem bildirimleri">
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    <th className="pb-3 pr-3">Başlık</th>
                    <th className="pb-3 pr-3">Kategori</th>
                    <th className="pb-3 pr-3">Durum</th>
                    <th className="pb-3 pr-3">Tarih</th>
                    <th className="pb-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                        Bildirimler yükleniyor…
                      </td>
                    </tr>
                  ) : loadError ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <p className="text-slate-700 font-medium">Bildirimler yüklenemedi.</p>
                        <p className="text-[12px] text-slate-500 mt-1 max-w-md mx-auto">{loadError}</p>
                      </td>
                    </tr>
                  ) : moduleState === 'unavailable' ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <p className="text-slate-700 font-medium">Panel bildirim API&apos;si bu ortamda aktif değil.</p>
                        <p className="text-[12px] text-slate-500 mt-1 max-w-md mx-auto">
                          Bildirim endpoint&apos;i (404) bulunamadı. Backend deploy durumunu kontrol edin.
                        </p>
                      </td>
                    </tr>
                  ) : notifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <p className="text-slate-700 font-medium">Henüz bildiriminiz yok.</p>
                        <p className="text-[12px] text-slate-500 mt-1 max-w-md mx-auto">
                          Yeni sipariş, ödeme, stok ve destek olayları oluştuğunda burada listelenecektir.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    notifications.map(n => (
                      <tr key={n.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-slate-800">{n.title}</p>
                          <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-600">{categoryLabelForType(n.type)}</td>
                        <td className="py-3 pr-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            n.isRead ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {n.isRead ? 'Okundu' : 'Okunmadı'}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-500 whitespace-nowrap">
                          {formatNotificationDate(n.createdAt)}
                        </td>
                        <td className="py-3">
                          {!n.isRead && (
                            <button
                              type="button"
                              disabled={markingId === n.id}
                              onClick={() => void handleMarkRead(n.id)}
                              className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                            >
                              {markingId === n.id ? '…' : 'Okundu'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {apiAvailable && total > notifications.length && (
              <p className="text-[11px] text-slate-400 mt-3">
                Toplam {total} bildirim — ilk {notifications.length} kayıt gösteriliyor.
              </p>
            )}
          </Panel>

          <Panel title="Bildirim Kategorileri" desc="Olay türlerine göre bildirim kanalları">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NOTIFICATION_CATEGORIES.map(card => {
                const status = resolveCategoryStatus(card, moduleState, new Set());
                return (
                  <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13px] font-semibold text-slate-800">{card.label}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${categoryStatusClass(status)}`}>
                        {categoryStatusLabel(status)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="E-posta Bildirim Tercihleri" desc="Olay bazlı e-posta tercihleri — sonraki faz">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[12px] text-amber-900 mb-4">
              E-posta tercih API&apos;si henüz aktif değil. Aşağıdaki olaylar planlanmıştır; kaydetme veya
              toggle bu fazda devre dışıdır.
            </div>
            <ul className="space-y-3">
              {EMAIL_PREFERENCE_ITEMS.map(item => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">{item.label}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                    Planlandı
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Bildirim Durumu">
            <ul className="space-y-3">
              {channelItems.map(({ id, label, status, tone, icon: Icon }) => (
                <li key={id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[12px] text-slate-600 truncate">{label}</span>
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 ${
                    tone === 'success' ? 'text-emerald-700'
                    : tone === 'warning' ? 'text-amber-700'
                    : 'text-slate-500'
                  }`}>
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Kurulum Kontrol Listesi">
            <ul className="space-y-2">
              {checklist.map(item => (
                <li key={item.id} className="flex items-start gap-2 text-[12px]">
                  <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {item.done ? '✓' : '·'}
                  </span>
                  <div>
                    <p className={item.done ? 'text-slate-800 font-medium' : 'text-slate-600'}>{item.label}</p>
                    {item.note && <p className="text-[11px] text-slate-400 mt-0.5">{item.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Bildirim Kanalları">
            <dl className="space-y-2 text-[12px]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Toplam kayıt</dt>
                <dd className="font-medium text-slate-800">{apiAvailable ? total : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Panel API</dt>
                <dd className="font-medium text-slate-800">
                  {apiAvailable ? 'Bağlı' : moduleState === 'unavailable' ? 'Planlandı' : 'Kontrol ediliyor…'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">E-posta tercihleri</dt>
                <dd className="font-medium text-slate-800">Planlandı</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Test e-postası</dt>
                <dd className="font-medium text-slate-800">Sonraki faz</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Bilgilendirme">
            <ul className="space-y-2 text-[12px] text-slate-600 leading-relaxed list-disc pl-4">
              <li>E-posta bildirimleri sipariş ve ödeme süreçlerinde kullanılır.</li>
              <li>Panel içi bildirimler olay oluştuğunda backend üzerinden kaydedilir.</li>
              <li>
                {apiAvailable
                  ? 'Panel içi bildirimler aktif; olay bazlı tercihler ileride genişletilecektir.'
                  : 'Panel içi bildirimler sonraki fazda olay bazlı tercihlerle genişletilecektir.'}
              </li>
              <li>Realtime bildirimler için ek altyapı gereklidir.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
