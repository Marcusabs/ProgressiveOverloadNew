import React, { memo, ReactNode } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors, Typography as TypographySystem } from '../../design/DesignSystem';

type TypographyVariant = 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body1' | 'body2' | 'caption' | 'overline'
  | 'button' | 'subtitle1' | 'subtitle2';

type TypographyWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type TypographyAlign = 'left' | 'center' | 'right' | 'justify';
type TypographyColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'text' | 'textSecondary' | 'textTertiary';

interface TypographyProps {
  children: ReactNode;
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  color?: TypographyColor | string;
  align?: TypographyAlign;
  uppercase?: boolean;
  italic?: boolean;
  underline?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
}

const Typography = memo<TypographyProps>(({
  children,
  variant = 'body1',
  weight,
  color = 'text',
  align = 'left',
  uppercase = false,
  italic = false,
  underline = false,
  numberOfLines,
  style,
}) => {
  const textStyles = [
    styles.base,
    styles[variant],
    weight && styles[`weight_${weight}`],
    styles[`align_${align}`],
    getColorStyle(color),
    uppercase && styles.uppercase,
    italic && styles.italic,
    underline && styles.underline,
    style,
  ];

  return (
    <Text
      style={textStyles}
      numberOfLines={numberOfLines}
      ellipsizeMode={numberOfLines ? 'tail' : undefined}
    >
      {children}
    </Text>
  );
});

// Helper function to get color style
const getColorStyle = (color: TypographyColor | string): TextStyle => {
  switch (color) {
    case 'primary':
      return { color: Colors.primary[500] };
    case 'secondary':
      return { color: Colors.secondary[500] };
    case 'success':
      return { color: Colors.success[500] };
    case 'warning':
      return { color: Colors.warning[500] };
    case 'error':
      return { color: Colors.error[500] };
    case 'text':
      return { color: Colors.neutral[900] };
    case 'textSecondary':
      return { color: Colors.neutral[600] };
    case 'textTertiary':
      return { color: Colors.neutral[400] };
    default:
      // Custom color string
      return { color: color };
  }
};

const styles = StyleSheet.create({
  base: {
    fontFamily: TypographySystem.fontFamily.primary,
    color: Colors.neutral[900],
  },

  // Variants
  h1: {
    fontSize: TypographySystem.fontSize['5xl'],
    fontWeight: TypographySystem.fontWeight.bold,
    lineHeight: TypographySystem.fontSize['5xl'] * TypographySystem.lineHeight.tight,
    letterSpacing: TypographySystem.letterSpacing.tight,
  },
  h2: {
    fontSize: TypographySystem.fontSize['4xl'],
    fontWeight: TypographySystem.fontWeight.bold,
    lineHeight: TypographySystem.fontSize['4xl'] * TypographySystem.lineHeight.tight,
    letterSpacing: TypographySystem.letterSpacing.tight,
  },
  h3: {
    fontSize: TypographySystem.fontSize['3xl'],
    fontWeight: TypographySystem.fontWeight.semibold,
    lineHeight: TypographySystem.fontSize['3xl'] * TypographySystem.lineHeight.snug,
  },
  h4: {
    fontSize: TypographySystem.fontSize['2xl'],
    fontWeight: TypographySystem.fontWeight.semibold,
    lineHeight: TypographySystem.fontSize['2xl'] * TypographySystem.lineHeight.snug,
  },
  h5: {
    fontSize: TypographySystem.fontSize.xl,
    fontWeight: TypographySystem.fontWeight.medium,
    lineHeight: TypographySystem.fontSize.xl * TypographySystem.lineHeight.normal,
  },
  h6: {
    fontSize: TypographySystem.fontSize.lg,
    fontWeight: TypographySystem.fontWeight.medium,
    lineHeight: TypographySystem.fontSize.lg * TypographySystem.lineHeight.normal,
  },
  subtitle1: {
    fontSize: TypographySystem.fontSize.base,
    fontWeight: TypographySystem.fontWeight.medium,
    lineHeight: TypographySystem.fontSize.base * TypographySystem.lineHeight.normal,
  },
  subtitle2: {
    fontSize: TypographySystem.fontSize.sm,
    fontWeight: TypographySystem.fontWeight.medium,
    lineHeight: TypographySystem.fontSize.sm * TypographySystem.lineHeight.normal,
  },
  body1: {
    fontSize: TypographySystem.fontSize.base,
    fontWeight: TypographySystem.fontWeight.normal,
    lineHeight: TypographySystem.fontSize.base * TypographySystem.lineHeight.relaxed,
  },
  body2: {
    fontSize: TypographySystem.fontSize.sm,
    fontWeight: TypographySystem.fontWeight.normal,
    lineHeight: TypographySystem.fontSize.sm * TypographySystem.lineHeight.relaxed,
  },
  caption: {
    fontSize: TypographySystem.fontSize.xs,
    fontWeight: TypographySystem.fontWeight.normal,
    lineHeight: TypographySystem.fontSize.xs * TypographySystem.lineHeight.normal,
  },
  overline: {
    fontSize: TypographySystem.fontSize.xs,
    fontWeight: TypographySystem.fontWeight.semibold,
    lineHeight: TypographySystem.fontSize.xs * TypographySystem.lineHeight.normal,
    letterSpacing: TypographySystem.letterSpacing.widest,
  },
  button: {
    fontSize: TypographySystem.fontSize.base,
    fontWeight: TypographySystem.fontWeight.semibold,
    lineHeight: TypographySystem.fontSize.base * TypographySystem.lineHeight.normal,
    letterSpacing: TypographySystem.letterSpacing.wide,
  },

  // Weights
  weight_light: {
    fontWeight: TypographySystem.fontWeight.light,
  },
  weight_normal: {
    fontWeight: TypographySystem.fontWeight.normal,
  },
  weight_medium: {
    fontWeight: TypographySystem.fontWeight.medium,
  },
  weight_semibold: {
    fontWeight: TypographySystem.fontWeight.semibold,
  },
  weight_bold: {
    fontWeight: TypographySystem.fontWeight.bold,
  },
  weight_extrabold: {
    fontWeight: TypographySystem.fontWeight.extrabold,
  },

  // Alignment
  align_left: {
    textAlign: 'left',
  },
  align_center: {
    textAlign: 'center',
  },
  align_right: {
    textAlign: 'right',
  },
  align_justify: {
    textAlign: 'justify',
  },

  // Modifiers
  uppercase: {
    textTransform: 'uppercase',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

Typography.displayName = 'Typography';

export default Typography;
