import { Appearance, TextStyle, ViewStyle } from 'react-native';

const lightPalette = {
  canvas: '#F2F1EE',
  canvasMuted: '#ECEAE5',
  surface: '#FFFDFC',
  surfaceMuted: '#FAF8F4',
  surfaceSoft: '#F3EFEB',
  surfaceStrong: '#E7E2DB',
  ink: '#122326',
  inkSoft: '#365057',
  inkMuted: '#64757A',
  border: '#D6DEDB',
  borderStrong: '#C1CECA',
  accent: '#005C5C',
  accentPressed: '#004C4C',
  accentSoft: '#E4F0EF',
  accentStrong: '#84B2AF',
  accentSecondary: '#0F6A73',
  success: '#1E7A57',
  warning: '#A46A17',
  danger: '#B14646',
  machine: '#163033',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(10, 26, 29, 0.42)',
  brandPaper: '#F2F1EE',
  brandTeal: '#005C5C',
  focusRing: '#6B9D9A',
  previewShadow: 'rgba(18, 35, 38, 0.1)',
  separator: '#E2DED7',
};

const darkPalette = {
  canvas: '#0E1214',
  canvasMuted: '#11171A',
  surface: '#151B1F',
  surfaceMuted: '#171E22',
  surfaceSoft: '#1A2226',
  surfaceStrong: '#243036',
  ink: '#F2F5F5',
  inkSoft: '#D8E1E2',
  inkMuted: '#A1B0B5',
  border: '#26343A',
  borderStrong: '#355057',
  accent: '#11A29A',
  accentPressed: '#0C867F',
  accentSoft: 'rgba(17, 162, 154, 0.18)',
  accentStrong: '#2C716A',
  accentSecondary: '#2A91A0',
  success: '#4AB287',
  warning: '#C28A35',
  danger: '#D06A6A',
  machine: '#081114',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.48)',
  brandPaper: '#E8ECEA',
  brandTeal: '#11A29A',
  focusRing: '#5EB8B0',
  previewShadow: 'rgba(0, 0, 0, 0.22)',
  separator: '#202C31',
};

export const isDarkTheme = Appearance.getColorScheme() === 'dark';
export const palette = isDarkTheme ? darkPalette : lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  display: {
    fontFamily: 'sans-serif-medium',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.ink,
  } satisfies TextStyle,
  title: {
    fontFamily: 'sans-serif-medium',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    color: palette.ink,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: 'sans-serif-medium',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: palette.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: 'sans-serif',
    fontSize: 15,
    lineHeight: 23,
    color: palette.inkSoft,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: 'sans-serif-medium',
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
  } satisfies TextStyle,
  label: {
    fontFamily: 'sans-serif-medium',
    fontSize: 12,
    lineHeight: 15,
    color: palette.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.72,
  } satisfies TextStyle,
  small: {
    fontFamily: 'sans-serif',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkMuted,
  } satisfies TextStyle,
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: palette.machine,
  } satisfies TextStyle,
};

export const shadows = {
  card: {
    shadowColor: isDarkTheme ? '#000000' : '#122326',
    shadowOpacity: isDarkTheme ? 0.16 : 0.035,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: isDarkTheme ? 0 : 1,
  } satisfies ViewStyle,
  floating: {
    shadowColor: isDarkTheme ? '#000000' : '#122326',
    shadowOpacity: isDarkTheme ? 0.22 : 0.07,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 4,
  } satisfies ViewStyle,
};
