import { useAppStore } from '../store/useAppStore';
import type { Currency } from '../context/CurrencyContext';

const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'USD' },
  { code: 'EUR', symbol: '€', name: 'EUR' },
  { code: 'TRY', symbol: '₺', name: 'TRY' },
];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useAppStore();

  return (
    <div className="relative">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="appearance-none bg-gray-100 border-0 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-200 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {CURRENCIES.map((curr) => (
          <option key={curr.code} value={curr.code}>
            {curr.symbol} {curr.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
