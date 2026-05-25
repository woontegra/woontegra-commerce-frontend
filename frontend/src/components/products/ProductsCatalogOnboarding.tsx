export interface ProductsCatalogOnboardingProps {
  onManualAdd: () => void;
  onXmlImport: () => void;
  onExcelPlaceholder: () => void;
}

export default function ProductsCatalogOnboarding({
  onManualAdd,
  onXmlImport,
  onExcelPlaceholder,
}: ProductsCatalogOnboardingProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-8 sm:px-10 sm:py-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 mb-5">
          <svg className="w-9 h-9 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Mağazanıza ürün ekleyin
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Tek tek ürün eklemek zorunda değilsiniz. XML ile binlerce ürünü dakikalar içinde aktarabilirsiniz.
        </p>
        <p className="mt-1 text-xs font-semibold text-indigo-600">
          XML ile 1000+ ürünü yaklaşık 1 dakikada yükleyin — önce dosyayı analiz edin, alanları eşleştirin, içe aktarın.
        </p>
      </div>

      <div className="px-4 pb-8 sm:px-8 sm:pb-10">
        <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={onManualAdd}
            className="flex flex-col items-start text-left p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-indigo-600 border border-slate-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </span>
            <span className="mt-3 text-sm font-bold text-slate-900">Manuel ürün ekle</span>
            <span className="mt-1 text-xs text-slate-500 leading-relaxed">
              Tek ürün formu ile adım adım oluşturun; görseller ve varyantlar için uygundur.
            </span>
          </button>

          <button
            type="button"
            onClick={onXmlImport}
            className="relative flex flex-col items-start text-left p-5 rounded-2xl border-2 border-indigo-400 bg-gradient-to-b from-indigo-50 to-white shadow-md shadow-indigo-100/80 hover:border-indigo-500 hover:shadow-lg transition-all ring-2 ring-indigo-100/60"
          >
            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              Önerilen
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </span>
            <span className="mt-3 text-sm font-bold text-indigo-950">XML ile toplu yükle</span>
            <span className="mt-1 text-xs text-indigo-900/70 leading-relaxed">
              Mevcut XML içe aktarma sihirbazına gidin: dosya veya URL, alan eşleştirme ve ilerleme takibi.
            </span>
          </button>

          <button
            type="button"
            onClick={onExcelPlaceholder}
            className="flex flex-col items-start text-left p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 border border-slate-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
            <span className="mt-3 text-sm font-bold text-slate-800 flex items-center gap-2">
              Excel ile yükle
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">Yakında</span>
            </span>
            <span className="mt-1 text-xs text-slate-500 leading-relaxed">
              Şimdilik CSV şablonu ile toplu içe aktarma kullanılabilir; Excel arayüzü üzerinde çalışıyoruz.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
