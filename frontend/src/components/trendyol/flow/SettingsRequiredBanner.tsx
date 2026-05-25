export function SettingsRequiredBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <svg
        className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <p className="text-sm font-semibold text-amber-900">Genel ayarlar kaydedilmedi</p>
        <p className="text-xs text-amber-800 mt-0.5">
          Ürün gönderme ve senkron butonları devre dışı. Lütfen sayfanın üstündeki{' '}
          <strong>Genel Ayarlar</strong> panelinden kargo ve fiyat stratejisini kaydedin.
        </p>
      </div>
    </div>
  );
}
