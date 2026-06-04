import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontNoIndex } from '../hooks/useStorefrontSeo';
import { useStorefrontGlobalTheme } from '../hooks/StorefrontGlobalThemeProvider';
import { displayStorefrontName } from '../../utils/displayStoreName';
import { submitStoreContactMessage } from '../services/storefrontContactApi';
import {
  buildContactInfoCards,
  extractContactFromFooter,
  fetchPublishedContactPageFields,
  mergeContactDisplay,
  type ContactInfoCard,
} from '../utils/storefrontContactDisplay';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400';

const FAQ_ITEMS = [
  {
    title: 'Sipariş durumu',
    desc: 'Siparişinizin nerede olduğunu hesabınızdan veya bizimle iletişime geçerek öğrenebilirsiniz.',
    slug: 'sik-sorulan-sorular',
  },
  {
    title: 'Kargo ve teslimat',
    desc: 'Teslimat süreleri, kargo firması ve takip bilgileri hakkında detaylar.',
    slug: 'kargo-ve-teslimat',
  },
  {
    title: 'İade ve değişim',
    desc: 'Cayma hakkı, iade koşulları ve değişim süreci.',
    slug: 'iade-ve-degisim',
  },
] as const;

function cardIcon(key: string) {
  switch (key) {
    case 'email':
      return Mail;
    case 'phone':
      return Phone;
    case 'whatsapp':
      return MessageCircle;
    case 'address':
      return MapPin;
    case 'hours':
      return Clock;
    default:
      return HelpCircle;
  }
}

function ContactInfoCardView({ card }: { card: ContactInfoCard }) {
  const Icon = cardIcon(card.key);
  const showValue = card.available ? card.value : card.fallback;
  const inner = (
    <>
      <div className="flex items-start gap-4">
        <span
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
            card.available ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
          <p
            className={`mt-1 text-[15px] leading-snug ${
              card.available ? 'text-slate-900 font-medium' : 'text-slate-500'
            }`}
          >
            {showValue}
          </p>
        </div>
      </div>
    </>
  );

  if (card.available && card.href) {
    return (
      <a
        href={card.href}
        target={card.external ? '_blank' : undefined}
        rel={card.external ? 'noreferrer' : undefined}
        className="block rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
      >
        {inner}
        <span className="mt-3 inline-block text-[12px] font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
          {card.external ? 'Yeni sekmede aç →' : 'İletişime geç →'}
        </span>
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">{inner}</div>
  );
}

export default function StoreContactPage() {
  const { tenant, storeLink } = useStorefrontTenant();
  const { footerSettings, themeSettings } = useStorefrontGlobalTheme();
  const storeName = displayStorefrontName(tenant?.name);
  useStorefrontNoIndex(`İletişim · ${storeName}`, tenant ?? undefined);

  const primaryColor = themeSettings.enabled ? themeSettings.primaryColor : '#4f46e5';

  const [contactInfo, setContactInfo] = useState(() =>
    mergeContactDisplay(extractContactFromFooter(footerSettings)),
  );
  const contactCards = useMemo(() => buildContactInfoCards(contactInfo), [contactInfo]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromFooter = extractContactFromFooter(footerSettings);
      const fromPage = tenant?.slug ? await fetchPublishedContactPageFields(tenant.slug) : {};
      if (!cancelled) {
        setContactInfo(mergeContactDisplay(fromPage, fromFooter));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug, footerSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const msg = await submitStoreContactMessage(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          subject: subject.trim(),
          message: message.trim(),
        },
        tenant?.slug,
      );
      setSuccess(msg);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ??
          (err instanceof Error ? err.message : 'Mesaj gönderilemedi.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50/80 min-h-[60vh]">
      <section className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-indigo-600 mb-2">
            Müşteri destek
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Bizimle iletişime geçin
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            {storeName} ekibi sipariş, ürün ve genel sorularınız için burada. Formu doldurun; mesajınız
            güvenle iletilir ve en kısa sürede yanıtlanır.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <aside className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">İletişim bilgileri</h2>
              <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
                Aşağıdaki kanallardan bize ulaşabilir veya sağdaki formu kullanarak mesaj
                bırakabilirsiniz.
              </p>
            </div>
            <div className="space-y-3">
              {contactCards.map(card => (
                <ContactInfoCardView key={card.key} card={card} />
              ))}
            </div>
          </aside>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-md overflow-hidden">
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900">Mesaj gönderin</h2>
                <p className="text-[13px] text-slate-500 mt-1">
                  Zorunlu alanları doldurun; yanıt için e-posta adresinizi doğru yazın.
                </p>
              </div>

              <div className="p-5 sm:p-8">
                {success ? (
                  <div
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-6 py-8 text-center"
                    role="status"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-emerald-950">Teşekkürler!</p>
                    <p className="mt-2 text-[15px] text-emerald-900/90 leading-relaxed max-w-md mx-auto">
                      {success}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuccess(null)}
                      className="mt-6 inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      Yeni mesaj gönder
                    </button>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div
                        className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                        role="alert"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                        <p>{error}</p>
                      </div>
                    )}
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Ad soyad <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={120}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={inputCls}
                            placeholder="Adınız Soyadınız"
                            autoComplete="name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            E-posta <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            maxLength={200}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className={inputCls}
                            placeholder="ornek@email.com"
                            autoComplete="email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Telefon
                          </label>
                          <input
                            type="tel"
                            maxLength={40}
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className={inputCls}
                            placeholder="05xx xxx xx xx"
                            autoComplete="tel"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Konu <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={200}
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className={inputCls}
                            placeholder="Örn. Sipariş durumu, ürün bilgisi"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Mesaj <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            minLength={10}
                            maxLength={8000}
                            rows={6}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className={`${inputCls} resize-y min-h-[140px]`}
                            placeholder="Sorunuzu veya talebinizi detaylı yazın…"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{ backgroundColor: primaryColor }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-60 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Gönderiliyor…' : 'Mesajı gönder'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 sm:mt-14 pt-10 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Sık sorulan konular</h2>
              <p className="text-[13px] text-slate-500 mt-1">
                Aşağıdaki sayfalarda sık sorulan sorulara yanıt bulabilirsiniz.
              </p>
            </div>
            <Link
              to={storeLink('/store/urunler')}
              className="text-sm font-medium text-indigo-600 hover:underline shrink-0"
            >
              Mağazaya dön
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FAQ_ITEMS.map(item => (
              <Link
                key={item.slug}
                to={storeLink(`/store/sayfa/${item.slug}`)}
                className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed line-clamp-3">{item.desc}</p>
                <span className="mt-3 inline-block text-[12px] font-medium text-indigo-600">
                  Detayları gör →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
