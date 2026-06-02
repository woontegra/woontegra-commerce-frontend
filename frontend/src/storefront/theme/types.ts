import type { ThemeProductCardStyle } from '../../utils/themeSettingsHelpers';

export type ThemePresetId = 'premium-commerce' | 'default';

export type ThemeColorTokens = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
};

export type ThemeFontTokens = {
  family: string;
};

export type ThemeRadiusTokens = {
  button: string;
  card: string;
};

export type ThemeSpacingTokens = {
  section: string;
  containerMax: string;
  containerProducts: string;
};

export type ThemeProductCardTokens = {
  style: ThemeProductCardStyle;
  mediaAspectRatio: string;
  mobileMediaMaxHeight: string;
};

export type ThemeHeaderTokens = {
  background: string;
  text: string;
  height: string;
  mobileHeight: string;
};

export type ThemeFooterTokens = {
  background: string;
  text: string;
};

export type ThemeMobileTokens = {
  sectionSpacing: string;
  cardRadius: string;
  bottomNavOffset: string;
  productGridGap: string;
};

export type ThemePresetTokens = {
  colors: ThemeColorTokens;
  fonts: ThemeFontTokens;
  radius: ThemeRadiusTokens;
  spacing: ThemeSpacingTokens;
  productCard: ThemeProductCardTokens;
  header: ThemeHeaderTokens;
  footer: ThemeFooterTokens;
  mobile: ThemeMobileTokens;
};

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  tokens: ThemePresetTokens;
};
