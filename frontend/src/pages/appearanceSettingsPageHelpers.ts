export interface AppearanceForm {
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  fontFamily:     string;
  borderRadius:   string;
  customCss:      string;
  currency:       string;
  language:       string;
}

export const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins',
  'Nunito', 'Raleway', 'Montserrat', 'Source Sans Pro', 'Ubuntu',
] as const;

export const RADIUS_OPTIONS = [
  { label: 'Yok',      value: '0rem'    },
  { label: 'Az',       value: '0.25rem' },
  { label: 'Normal',   value: '0.5rem'  },
  { label: 'Fazla',    value: '0.75rem' },
  { label: 'Yuvarlak', value: '1rem'    },
  { label: 'Tam',      value: '9999px'  },
] as const;

export const PRESET_PALETTES = [
  { name: 'Mavi',    primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
  { name: 'Mor',     primary: '#8B5CF6', secondary: '#EC4899', accent: '#06B6D4' },
  { name: 'Yeşil',   primary: '#10B981', secondary: '#3B82F6', accent: '#F59E0B' },
  { name: 'Turuncu', primary: '#F59E0B', secondary: '#EF4444', accent: '#8B5CF6' },
  { name: 'Pembe',   primary: '#EC4899', secondary: '#8B5CF6', accent: '#10B981' },
  { name: 'Koyu',    primary: '#1E293B', secondary: '#64748B', accent: '#F59E0B' },
] as const;

export const PLANNED_APPEARANCE_FEATURES = [
  'Tema şablonları',
  'Header/footer düzenleyici',
  'Ürün kartı varyasyonları',
  'Vitrin genişliği',
  'Header stili',
  'Footer stili',
] as const;

export function languageLabel(code: string): string {
  switch (code) {
    case 'en': return 'English';
    case 'tr':
    default:   return 'Türkçe';
  }
}

export function currencyLabel(code: string): string {
  switch (code) {
    case 'USD': return 'USD';
    case 'EUR': return 'EUR';
    case 'GBP': return 'GBP';
    case 'TRY':
    default:    return 'TRY';
  }
}

export function radiusLabel(value: string): string {
  return RADIUS_OPTIONS.find(r => r.value === value)?.label ?? 'Normal';
}

export function safeStoreName(name: string | null | undefined): string {
  const v = name?.trim();
  return v || 'Mağaza Adı';
}
