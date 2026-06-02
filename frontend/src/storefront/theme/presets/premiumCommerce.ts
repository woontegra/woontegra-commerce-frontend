import type { ThemePreset } from '../types';

/** Premium Commerce — mevcut storefrontTheme.css varsayılanlarıyla hizalı preset */
export const premiumCommercePreset: ThemePreset = {
  id: 'premium-commerce',
  name: 'Premium Commerce',
  tokens: {
    colors: {
      primary: '#1c1917',
      secondary: '#78716c',
      background: '#faf9f7',
      surface: '#ffffff',
      text: '#1c1917',
      textMuted: '#78716c',
      border: 'rgba(28, 25, 23, 0.08)',
      accent: '#a8845a',
      accentSoft: 'rgba(168, 132, 90, 0.12)',
    },
    fonts: {
      family: "'Inter', system-ui, sans-serif",
    },
    radius: {
      button: '9999px',
      card: '1rem',
    },
    spacing: {
      section: '4rem',
      containerMax: '92rem',
      containerProducts: 'min(92rem, 100%)',
    },
    productCard: {
      style: 'standard',
      mediaAspectRatio: '3 / 4',
      mobileMediaMaxHeight: '9.25rem',
    },
    header: {
      background: 'rgba(255, 255, 255, 0.97)',
      text: '#1c1917',
      height: '4rem',
      mobileHeight: '3.25rem',
    },
    footer: {
      background: 'linear-gradient(180deg, #ffffff 0%, #f7f5f2 100%)',
      text: '#1c1917',
    },
    mobile: {
      sectionSpacing: '2.5rem',
      cardRadius: '0.75rem',
      bottomNavOffset: '4rem',
      productGridGap: '0.5rem',
    },
  },
};
