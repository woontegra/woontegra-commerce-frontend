import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchEmailTemplate,
  fetchEmailTemplates,
  saveEmailTemplate,
} from '../services/emailTemplates.service';
import type {
  EmailTemplateListItem,
  EmailTemplateVariable,
} from '../types/emailTemplates.types';
import { getErrorMessage } from '../utils/errorMessages';

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

const textareaCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 font-mono text-[12px] leading-relaxed resize-y';

type EditorField = 'subject' | 'preheader' | 'bodyHtml' | 'bodyText';

const PREVIEW_SAMPLE_VALUES: Record<string, string> = {
  storeName: 'Örnek Mağaza',
  customerName: 'Ahmet Yılmaz',
  orderNumber: 'SIP-10482',
  orderTotal: '1.249,00 TRY',
  paymentMethod: 'Kredi kartı',
  trackingNumber: 'TR123456789',
  trackingUrl: 'https://kargo.ornek.com/takip',
  resetLink: 'https://magaza.ornek.com/sifre-sifirla',
  contactSubject: 'Ürün hakkında bilgi',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function applyPreviewVars(text: string): string {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => PREVIEW_SAMPLE_VALUES[key] ?? `{{${key}}}`);
}

function stripHtmlForPreview(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
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

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function insertIntoField(
  current: string,
  token: string,
  el: HTMLInputElement | HTMLTextAreaElement | null,
): string {
  if (!el) return current + token;
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  const next = current.slice(0, start) + token + current.slice(end);
  requestAnimationFrame(() => {
    const pos = start + token.length;
    el.focus();
    el.setSelectionRange(pos, pos);
  });
  return next;
}

type EditorForm = {
  name: string;
  templateCode: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
};

function previewTemplateCode(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return base ? `custom_${base}` : 'custom_sablon';
}

const EMPTY_EDITOR_FORM: EditorForm = {
  name: '',
  templateCode: '',
  subject: '',
  preheader: '',
  bodyHtml: '<h2>Merhaba {{customerName}}</h2>\n<p>İçeriğinizi buraya yazın.</p>',
  bodyText: '',
  isActive: true,
};

function InboxPreviewCard({ form }: { form: EditorForm }) {
  const subject = applyPreviewVars(form.subject.trim()) || 'Konu satırı';
  const preheader = applyPreviewVars(form.preheader.trim());
  const snippet = applyPreviewVars(
    stripHtmlForPreview(form.bodyHtml) || form.bodyText.trim(),
  ).slice(0, 120);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Gelen kutusu önizlemesi
        </p>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
            M
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-900 truncate">
              {PREVIEW_SAMPLE_VALUES.storeName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">size@{`{{store}}`}.com</p>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">şimdi</span>
        </div>
        <p className="text-[13px] font-medium text-slate-900 line-clamp-1 pt-1">{subject}</p>
        {preheader ? (
          <p className="text-[12px] text-slate-600 line-clamp-1">{preheader}</p>
        ) : null}
        <p className="text-[12px] text-slate-500 line-clamp-2 leading-snug">
          {snippet || 'İçerik önizlemesi burada görünür…'}
        </p>
      </div>
    </div>
  );
}

function VariablesPanel({
  variables,
  onInsert,
}: {
  variables: EmailTemplateVariable[];
  onInsert: (token: string) => void;
}) {
  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`${token} kopyalandı`);
    } catch {
      toast.error('Panoya kopyalanamadı');
    }
  };

  return (
    <div className="wn-card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-[12px] font-semibold text-slate-800">Kullanılabilir değişkenler</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Tıklayarak aktif alana ekleyin veya kopyalayın.
        </p>
      </div>
      <ul className="divide-y divide-slate-50 max-h-[280px] overflow-y-auto">
        {variables.map((v) => (
          <li key={v.key} className="px-3 py-2.5 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-start gap-2">
              <code className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                {v.key}
              </code>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-600 leading-snug">{v.desc}</p>
                <div className="flex gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => onInsert(v.key)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3 h-3" />
                    Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyToken(v.key)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    <Copy className="w-3 h-3" />
                    Kopyala
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateTypeBadge({ isSystem }: { isSystem: boolean }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        isSystem
          ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80'
          : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/80'
      }`}
    >
      {isSystem ? 'Sistem şablonu' : 'Özel şablon'}
    </span>
  );
}

function TemplateListTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: EmailTemplateListItem[];
  onEdit: (key: string) => void;
  onDelete?: (key: string, name: string) => void;
}) {
  if (!rows.length) {
    return <p className="text-[13px] text-slate-500 py-2">Henüz şablon yok.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4 font-medium">Şablon</th>
            <th className="py-2 pr-4 font-medium">Tür</th>
            <th className="py-2 pr-4 font-medium">Durum</th>
            <th className="py-2 pr-4 font-medium">Son güncelleme</th>
            <th className="py-2 font-medium text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-slate-50 last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-slate-800">{t.name}</p>
                {!t.isSystem && (
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{t.key}</p>
                )}
              </td>
              <td className="py-3 pr-4">
                <TemplateTypeBadge isSystem={t.isSystem} />
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    t.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                {formatDate(t.updatedAt)}
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onEdit(t.key)}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium mr-3"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Düzenle
                </button>
                {t.canDelete && onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(t.key, t.name)}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmailTemplateEditor({
  templateName,
  isCreating,
  isSystem,
  canDelete,
  variables,
  form,
  setForm,
  saving,
  detailLoading,
  onBack,
  onSave,
  onCancel,
  onDelete,
}: {
  templateName: string;
  isCreating: boolean;
  isSystem: boolean;
  canDelete: boolean;
  variables: EmailTemplateVariable[];
  form: EditorForm;
  setForm: React.Dispatch<React.SetStateAction<EditorForm>>;
  saving: boolean;
  detailLoading: boolean;
  onBack: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [activeField, setActiveField] = useState<EditorField>('bodyHtml');
  const subjectRef = useRef<HTMLInputElement>(null);
  const preheaderRef = useRef<HTMLInputElement>(null);
  const bodyHtmlRef = useRef<HTMLTextAreaElement>(null);
  const bodyTextRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs: Record<EditorField, React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>> = {
    subject: subjectRef,
    preheader: preheaderRef,
    bodyHtml: bodyHtmlRef,
    bodyText: bodyTextRef,
  };

  const insertVariable = useCallback(
    (token: string) => {
      const field = activeField;
      const ref = fieldRefs[field].current;
      setForm((prev) => {
        const key = field as keyof EditorForm;
        if (key === 'isActive' || key === 'name' || key === 'templateCode') return prev;
        const current = String(prev[key]);
        const next = insertIntoField(current, token, ref);
        return { ...prev, [key]: next };
      });
      toast.success(`${token} eklendi`);
    },
    [activeField, setForm],
  );

  return (
    <div className="-mx-5 md:-mx-6 -mb-5 md:-mb-6 flex flex-col min-h-[calc(100dvh-3.25rem)] bg-slate-50/80">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-5 md:px-8 py-3 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Şablon listesine dön</span>
          <span className="sm:hidden">Geri</span>
        </button>

        <div className="hidden sm:block h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 truncate">{templateName}</h1>
            <p className="text-[11px] text-slate-500">
              {isCreating ? 'Yeni özel şablon' : isSystem ? 'Sistem şablonu' : 'Özel şablon'}
            </p>
          </div>
        </div>

        {!isCreating && <TemplateTypeBadge isSystem={isSystem} />}

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            form.isActive
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          {form.isActive ? (
            <Check className="w-3 h-3" />
          ) : null}
          {form.isActive ? 'Aktif' : 'Pasif'}
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {canDelete && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-[13px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={saving || detailLoading}
            onClick={onSave}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isCreating ? 'Oluştur' : 'Kaydet'}
          </button>
        </div>
      </header>

      {detailLoading ? (
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 px-5 md:px-8 py-6 lg:py-8">
          <div className="mx-auto w-full max-w-[1680px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 xl:gap-8 items-start">
            <section className="min-w-0 space-y-5">
              {(isCreating || !isSystem) && (
                <div className="wn-card p-5 md:p-6 space-y-5">
                  <Field label="Şablon adı" hint="Panelde görünen isim">
                    <input
                      className={inputCls}
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({
                          ...f,
                          name,
                          templateCode:
                            isCreating && !f.templateCode.trim()
                              ? previewTemplateCode(name)
                              : f.templateCode,
                        }));
                      }}
                      placeholder="Örn: Hoş geldin kampanyası"
                    />
                  </Field>
                  {isCreating ? (
                    <Field
                      label="Şablon kodu"
                      hint="Boş bırakırsanız otomatik üretilir. Kampanya ve otomasyonlarda bu kod kullanılır."
                    >
                      <input
                        className={`${inputCls} font-mono text-[12px]`}
                        value={form.templateCode}
                        onChange={(e) => setForm((f) => ({ ...f, templateCode: e.target.value }))}
                        placeholder={previewTemplateCode(form.name) || 'custom_kampanya_adi'}
                      />
                    </Field>
                  ) : (
                    <Field label="Şablon kodu">
                      <input
                        className={`${inputCls} font-mono text-[12px] bg-slate-50`}
                        value={form.templateCode}
                        readOnly
                      />
                    </Field>
                  )}
                </div>
              )}

              <div className="wn-card p-5 md:p-6 space-y-5">
                <Field label="Konu" hint="Alıcının gelen kutusunda görünen başlık">
                  <input
                    ref={subjectRef}
                    className={inputCls}
                    value={form.subject}
                    onFocus={() => setActiveField('subject')}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Örn: Siparişiniz alındı — {{orderNumber}}"
                  />
                </Field>

                <Field
                  label="Ön başlık (preheader)"
                  hint="Konu satırının altında, önizlemede görünen kısa metin"
                >
                  <input
                    ref={preheaderRef}
                    className={inputCls}
                    value={form.preheader}
                    onFocus={() => setActiveField('preheader')}
                    onChange={(e) => setForm((f) => ({ ...f, preheader: e.target.value }))}
                    placeholder="Örn: Siparişiniz başarıyla oluşturuldu"
                  />
                </Field>
              </div>

              <div className="wn-card p-5 md:p-6">
                <Field
                  label="HTML içerik"
                  hint="Mağaza e-posta şablonunun gövdesi; üst/alt bilgi otomatik eklenir"
                >
                  <textarea
                    ref={bodyHtmlRef}
                    className={`${textareaCls} min-h-[min(52vh,520px)]`}
                    value={form.bodyHtml}
                    onFocus={() => setActiveField('bodyHtml')}
                    onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                    placeholder="<h2>Merhaba {{customerName}}</h2>..."
                    spellCheck={false}
                  />
                </Field>
              </div>

              <div className="wn-card p-5 md:p-6">
                <Field label="Düz metin" hint="HTML desteklemeyen istemciler için (isteğe bağlı)">
                  <textarea
                    ref={bodyTextRef}
                    className={`${textareaCls} min-h-[200px]`}
                    value={form.bodyText}
                    onFocus={() => setActiveField('bodyText')}
                    onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
                    placeholder="Merhaba {{customerName}}, ..."
                  />
                </Field>
              </div>
            </section>

            <aside className="xl:sticky xl:top-[4.5rem] space-y-4">
              <InboxPreviewCard form={form} />

              <div className="wn-card p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-slate-800">Şablon aktif</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {isSystem
                        ? 'Kapalıyken bu bildirimde sistem varsayılanı kullanılır.'
                        : 'Kapalıyken bu şablon kampanya ve otomasyonlarda seçilemez.'}
                    </span>
                  </span>
                </label>
              </div>

              <VariablesPanel variables={variables} onInsert={insertVariable} />

              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Aktif alan:{' '}
                <span className="font-medium text-slate-600">
                  {activeField === 'bodyHtml'
                    ? 'HTML içerik'
                    : activeField === 'bodyText'
                      ? 'Düz metin'
                      : activeField === 'subject'
                        ? 'Konu'
                        : 'Ön başlık'}
                </span>
              </p>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailTemplatesManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [variables, setVariables] = useState<EmailTemplateVariable[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editMeta, setEditMeta] = useState({ isSystem: true, canDelete: false });
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState<EditorForm>(EMPTY_EDITOR_FORM);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { templates: list, meta } = await fetchEmailTemplates();
      setTemplates(list);
      setVariables(meta.variables ?? []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const systemTemplates = useMemo(
    () => templates.filter((t) => t.isSystem),
    [templates],
  );
  const customTemplates = useMemo(
    () => templates.filter((t) => !t.isSystem),
    [templates],
  );

  const openCreate = () => {
    setIsCreating(true);
    setEditingKey('__new__');
    setEditMeta({ isSystem: false, canDelete: false });
    setForm({ ...EMPTY_EDITOR_FORM });
    setDetailLoading(false);
  };

  const openEdit = async (key: string) => {
    setIsCreating(false);
    setEditingKey(key);
    setDetailLoading(true);
    try {
      const { template, meta } = await fetchEmailTemplate(key);
      setVariables(meta.variables ?? []);
      setEditMeta({ isSystem: template.isSystem, canDelete: template.canDelete });
      setForm({
        name:         template.name,
        templateCode: template.key,
        subject:      template.subject,
        preheader:    template.preheader ?? '',
        bodyHtml:     template.bodyHtml,
        bodyText:     template.bodyText ?? '',
        isActive:     template.isActive,
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
      setEditingKey(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeEdit = () => {
    setEditingKey(null);
    setIsCreating(false);
    void loadList();
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      const payload = {
        subject:   form.subject.trim(),
        preheader: form.preheader.trim() || null,
        bodyHtml:  form.bodyHtml.trim(),
        bodyText:  form.bodyText.trim() || null,
        isActive:  form.isActive,
      };

      if (isCreating) {
        const created = await createEmailTemplate({
          name: form.name.trim(),
          templateCode: form.templateCode.trim() || undefined,
          ...payload,
        });
        toast.success('Şablon oluşturuldu.');
        setTemplates((prev) => [...prev, created].sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
          return a.name.localeCompare(b.name, 'tr');
        }));
        closeEdit();
        return;
      }

      const saved = await saveEmailTemplate(editingKey, {
        ...payload,
        ...(!editMeta.isSystem && form.name.trim() ? { name: form.name.trim() } : {}),
      });
      toast.success('Şablon kaydedildi.');
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === saved.key
            ? {
                ...t,
                name:      saved.name,
                subject:   saved.subject,
                preheader: saved.preheader,
                isActive:  saved.isActive,
                updatedAt: saved.updatedAt,
              }
            : t,
        ),
      );
      closeEdit();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (!window.confirm(`"${name}" şablonunu silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteEmailTemplate(key);
      toast.success('Şablon silindi.');
      setTemplates((prev) => prev.filter((t) => t.key !== key));
      if (editingKey === key) closeEdit();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const editingName = useMemo(() => {
    if (isCreating) return form.name.trim() || 'Yeni şablon';
    return templates.find((t) => t.key === editingKey)?.name ?? (form.name || 'Şablon düzenle');
  }, [templates, editingKey, isCreating, form.name]);

  if (editingKey) {
    return (
      <EmailTemplateEditor
        templateName={editingName}
        isCreating={isCreating}
        isSystem={editMeta.isSystem}
        canDelete={editMeta.canDelete}
        variables={variables}
        form={form}
        setForm={setForm}
        saving={saving}
        detailLoading={detailLoading && !isCreating}
        onBack={closeEdit}
        onSave={() => void handleSave()}
        onCancel={closeEdit}
        onDelete={
          editMeta.canDelete && editingKey
            ? () => void handleDelete(editingKey, editingName)
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            E-posta Şablonları
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Sistem bildirimlerini özelleştirin veya kampanya için özel şablonlar oluşturun.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni şablon oluştur
        </button>
      </div>

      {loading ? (
        <div className="wn-card flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <Panel
            title="Sistem şablonları"
            desc="Sipariş, ödeme, kargo ve hesap bildirimleri — silinemez, düzenlenebilir"
          >
            <TemplateListTable rows={systemTemplates} onEdit={(key) => void openEdit(key)} />
          </Panel>

          <Panel
            title="Özel şablonlar"
            desc="Kampanya ve otomasyonlar için — oluşturulabilir, düzenlenebilir, silinebilir"
          >
            <TemplateListTable
              rows={customTemplates}
              onEdit={(key) => void openEdit(key)}
              onDelete={(key, name) => void handleDelete(key, name)}
            />
          </Panel>
        </>
      )}

      <p className="text-[12px] text-slate-400">
        <Link to="/dashboard/store-settings" className="text-indigo-600 hover:underline">
          Mağaza ayarları
        </Link>
        {' '}
        üzerinden genel iletişim tercihlerinizi yönetebilirsiniz.
      </p>
    </div>
  );
}
