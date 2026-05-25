export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textLight: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export const themes: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
      textLight: '#6B7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  },
  purple: {
    id: 'purple',
    name: 'Purple Dream',
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
      textLight: '#6B7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  },
  green: {
    id: 'green',
    name: 'Nature Green',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
      textLight: '#6B7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#1F2937',
      text: '#F9FAFB',
      textLight: '#D1D5DB',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      accent: '#FBBF24',
      background: '#FFFFFF',
      text: '#1F2937',
      textLight: '#6B7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  },
};

export function getThemeById(id: string): Theme {
  return themes[id] || themes.default;
}

export function createCustomTheme(primaryColor: string, secondaryColor?: string): Theme {
  return {
    id: 'custom',
    name: 'Custom Theme',
    colors: {
      primary: primaryColor,
      secondary: secondaryColor || primaryColor,
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
      textLight: '#6B7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
    },
  };
}
