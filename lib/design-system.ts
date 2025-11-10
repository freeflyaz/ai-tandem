/**
 * Design System Utilities
 * Generated from .claude/style.json
 */

export const colors = {
  primary: {
    50: '#eef3ff',
    100: '#d9e3ff',
    200: '#b4c7ff',
    300: '#8aa6ff',
    400: '#668bff',
    500: '#4a6cf7',
    600: '#384fd4',
    700: '#2837aa',
    800: '#1d2882',
    900: '#151d63',
  },
  success: {
    50: '#e7f9f1',
    100: '#c4f1dd',
    200: '#8ee3bf',
    300: '#52cf9b',
    400: '#26b97d',
    500: '#0c9e64',
    600: '#078050',
    700: '#056140',
    800: '#034530',
    900: '#023326',
  },
  warning: {
    50: '#fff7e9',
    100: '#ffe7bd',
    200: '#ffd085',
    300: '#ffb347',
    400: '#ff9a1f',
    500: '#f27f00',
    600: '#cf6700',
    700: '#a24e00',
    800: '#783900',
    900: '#592a00',
  },
  danger: {
    50: '#ffecec',
    100: '#ffd0d0',
    200: '#ffa8a8',
    300: '#ff7676',
    400: '#ff4d4d',
    500: '#f13030',
    600: '#d11f24',
    700: '#aa1720',
    800: '#7d1019',
    900: '#5d0c14',
  },
  info: {
    50: '#ebf7ff',
    100: '#cde9ff',
    200: '#9acfff',
    300: '#64b4ff',
    400: '#3a9dff',
    500: '#1985ff',
    600: '#1067d4',
    700: '#0b4daa',
    800: '#07377f',
    900: '#05275f',
  },
  gray: {
    50: '#f5f7fb',
    100: '#eef1f7',
    200: '#dde2ec',
    300: '#c3c9d8',
    400: '#a3a9bf',
    500: '#8087a0',
    600: '#636986',
    700: '#474b64',
    800: '#323548',
    900: '#202233',
  },
  black: '#060713',
  white: '#ffffff',
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

export const radii = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(15, 23, 42, 0.06)',
  md: '0 8px 20px rgba(15, 23, 42, 0.06)',
  lg: '0 16px 40px rgba(15, 23, 42, 0.08)',
};

export const fontSize = {
  xs: '11px',
  sm: '12px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
};

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Semantic color mappings
export const semantic = {
  bg: {
    body: colors.gray[50],
    shell: colors.gray[100],
    card: colors.white,
    cardSubtle: colors.gray[50],
  },
  border: {
    subtle: colors.gray[200],
    strong: colors.gray[300],
    focus: colors.primary[400],
  },
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[600],
    muted: colors.gray[500],
    onPrimary: colors.white,
    success: colors.success[600],
    warning: colors.warning[600],
    danger: colors.danger[600],
    info: colors.info[600],
  },
  accent: {
    primary: colors.primary[500],
    primarySoft: colors.primary[50],
  },
};

// Component styles
export const card = {
  padding: spacing[5],
  radius: radii.lg,
  shadow: shadows.sm,
  border: `1px solid ${semantic.border.subtle}`,
  bg: semantic.bg.card,
};

export const button = {
  primary: {
    bg: semantic.accent.primary,
    color: semantic.text.onPrimary,
    hoverBg: colors.primary[600],
    shadow: shadows.sm,
    radius: radii.sm,
    paddingX: '14px',
    paddingY: '8px',
  },
  outline: {
    bg: semantic.bg.card,
    color: semantic.text.primary,
    border: `1px solid ${semantic.border.subtle}`,
    hoverBg: semantic.bg.cardSubtle,
    radius: radii.sm,
    paddingX: '14px',
    paddingY: '8px',
  },
};
