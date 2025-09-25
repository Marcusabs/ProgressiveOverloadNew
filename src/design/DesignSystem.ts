// 🎨 Professional Design System for Progressive Overload App

export const Colors = {
  // Primary Brand Colors
  primary: {
    50: '#FFF4ED',
    100: '#FFE4CC',
    200: '#FFCA99',
    300: '#FFAB66',
    400: '#FF8533',
    500: '#FF6B35', // Main brand color
    600: '#E55A2B',
    700: '#CC4A21',
    800: '#B23A17',
    900: '#992A0D',
  },

  // Secondary Colors
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // Neutral Colors
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Gradient Colors
  gradients: {
    primary: ['#FF6B35', '#FF8533'] as const,
    secondary: ['#0EA5E9', '#38BDF8'] as const,
    success: ['#22C55E', '#4ADE80'] as const,
    sunset: ['#FF6B35', '#FFAB66', '#FFE4CC'] as const,
    ocean: ['#0C4A6E', '#0284C7', '#38BDF8'] as const,
    forest: ['#14532D', '#16A34A', '#4ADE80'] as const,
    royal: ['#581C87', '#7C3AED', '#A78BFA'] as const,
  },
};

export const Typography = {
  // Font Families
  fontFamily: {
    primary: 'System', // iOS: SF Pro, Android: Roboto
    mono: 'monospace',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
  40: 160,
  48: 192,
  56: 224,
  64: 256,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  xl: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
};

export const Layout = {
  // Container widths
  container: {
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Screen breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Common dimensions
  headerHeight: 56,
  tabBarHeight: 80,
  buttonHeight: {
    sm: 32,
    base: 44,
    lg: 56,
  },
};

export const Animations = {
  // Duration
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  // Easing
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },

  // Spring configs
  spring: {
    gentle: {
      damping: 15,
      stiffness: 120,
    },
    bouncy: {
      damping: 8,
      stiffness: 100,
    },
    snappy: {
      damping: 20,
      stiffness: 300,
    },
  },
};

// Theme variations
export const LightTheme = {
  colors: {
    background: Colors.neutral[0],
    surface: Colors.neutral[50],
    card: Colors.neutral[0],
    text: Colors.neutral[900],
    textSecondary: Colors.neutral[600],
    textTertiary: Colors.neutral[400],
    border: Colors.neutral[200],
    primary: Colors.primary[500],
    secondary: Colors.secondary[500],
    success: Colors.success[500],
    warning: Colors.warning[500],
    error: Colors.error[500],
  },
};

export const DarkTheme = {
  colors: {
    background: Colors.neutral[950],
    surface: Colors.neutral[900],
    card: Colors.neutral[800],
    text: Colors.neutral[50],
    textSecondary: Colors.neutral[300],
    textTertiary: Colors.neutral[500],
    border: Colors.neutral[700],
    primary: Colors.primary[400],
    secondary: Colors.secondary[400],
    success: Colors.success[400],
    warning: Colors.warning[400],
    error: Colors.error[400],
  },
};
