import { Table } from '../components/ui/Table';

/**
 * Blog admin — backend CRUD routes not deployed yet.
 * Flip to true when GET/POST/PUT/DELETE /api/blog are live on the server.
 */
const BLOG_ADMIN_API_READY = false;

export default function BlogManagement() {
  if (!BLOG_ADMIN_API_READY) {
    return <BlogManagementPlaceholder />;
  }

  // Future: restore API-backed admin when backend blog module ships.
  return <BlogManagementPlaceholder />;
}

function BlogManagementPlaceholder() {
  const columns = [
    {
      key:    'title',
      header: 'Başlık',
      cell:   () => null,
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   () => null,
    },
    {
      key:    'author',
      header: 'Yazar',
      cell:   () => null,
    },
    {
      key:    'publishedAt',
      header: 'Yayın Tarihi',
      cell:   () => null,
    },
    {
      key:    'seo',
      header: 'SEO',
      cell:   () => null,
    },
    {
      key:    'actions',
      header: 'İşlem',
      align:  'right' as const,
      cell:   () => null,
    },
  ];

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Blog Yönetimi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            Blog yazılarınızı ve içeriklerinizi yöneteceğiniz alan.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Blog yönetimi sonraki fazda aktif olacak."
          className="btn btn-primary text-[13px] opacity-50 cursor-not-allowed shrink-0"
        >
          Yeni Blog Yazısı
        </button>
      </div>

      <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
        <p className="text-[13px] font-medium text-slate-800">
          Blog yönetimi sonraki fazda aktif olacak.
        </p>
        <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">
          Bu modül aktif edildiğinde blog yazısı oluşturma, SEO başlığı, açıklama, kategori,
          etiket ve yayın durumu yönetimi yapılabilecek.
        </p>
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[13px] font-semibold text-slate-800">Blog yazıları</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">0 kayıt</p>
        </div>
        <Table
          data={[]}
          columns={columns}
          keyExtractor={() => 'empty'}
          stickyHeader
          emptyState={
            <div className="empty-state py-14 px-6">
              <div className="empty-state-icon">
                <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="empty-state-title">Henüz blog yazısı yok.</p>
              <p className="empty-state-desc mx-auto max-w-md">
                Blog yönetimi aktif edildiğinde yazılarınız burada listelenecektir.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
