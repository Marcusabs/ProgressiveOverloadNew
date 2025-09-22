import React, { memo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../design/DesignSystem';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  dot?: boolean;
  outline?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Badge = memo<BadgeProps>(({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  dot = false,
  outline = false,
  style,
  textStyle,
}) => {
  const containerStyles = [
    styles.container,
    styles[size],
    outline ? styles[`${variant}Outline`] : styles[variant],
    dot && styles.dot,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    outline ? styles[`text_${variant}Outline`] : styles[`text_${variant}`],
    textStyle,
  ];

  if (dot) {
    return <View style={containerStyles} />;
  }

  return (
    <View style={containerStyles}>
      {icon && (
        <Ionicons
          name={icon as any}
          size={getIconSize(size)}
          color={getIconColor(variant, outline)}
          style={styles.icon}
        />
      )}
      {typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});

// Helper functions
const getIconSize = (size: BadgeSize): number => {
  switch (size) {
    case 'sm': return 12;
    case 'md': return 14;
    case 'lg': return 16;
    default: return 14;
  }
};

const getIconColor = (variant: BadgeVariant, outline: boolean): string => {
  if (outline) {
    switch (variant) {
      case 'primary': return Colors.primary[500];
      case 'secondary': return Colors.secondary[500];
      case 'success': return Colors.success[500];
      case 'warning': return Colors.warning[500];
      case 'error': return Colors.error[500];
      case 'neutral': return Colors.neutral[500];
      default: return Colors.primary[500];
    }
  }
  return Colors.neutral[0];
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },

  // Sizes
  sm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    minHeight: 20,
  },
  md: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    minHeight: 24,
  },
  lg: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    minHeight: 32,
  },

  // Dot variant
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    padding: 0,
    minHeight: 8,
  },

  // Filled variants
  primary: {
    backgroundColor: Colors.primary[500],
  },
  secondary: {
    backgroundColor: Colors.secondary[500],
  },
  success: {
    backgroundColor: Colors.success[500],
  },
  warning: {
    backgroundColor: Colors.warning[500],
  },
  error: {
    backgroundColor: Colors.error[500],
  },
  neutral: {
    backgroundColor: Colors.neutral[500],
  },

  // Outline variants
  primaryOutline: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  secondaryOutline: {
    backgroundColor: Colors.secondary[50],
    borderWidth: 1,
    borderColor: Colors.secondary[500],
  },
  successOutline: {
    backgroundColor: Colors.success[50],
    borderWidth: 1,
    borderColor: Colors.success[500],
  },
  warningOutline: {
    backgroundColor: Colors.warning[50],
    borderWidth: 1,
    borderColor: Colors.warning[500],
  },
  errorOutline: {
    backgroundColor: Colors.error[50],
    borderWidth: 1,
    borderColor: Colors.error[500],
  },
  neutralOutline: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[500],
  },

  // Text styles
  text: {
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  text_sm: {
    fontSize: Typography.fontSize.xs,
  },
  text_md: {
    fontSize: Typography.fontSize.sm,
  },
  text_lg: {
    fontSize: Typography.fontSize.base,
  },

  // Text colors - filled
  text_primary: {
    color: Colors.neutral[0],
  },
  text_secondary: {
    color: Colors.neutral[0],
  },
  text_success: {
    color: Colors.neutral[0],
  },
  text_warning: {
    color: Colors.neutral[0],
  },
  text_error: {
    color: Colors.neutral[0],
  },
  text_neutral: {
    color: Colors.neutral[0],
  },

  // Text colors - outline
  text_primaryOutline: {
    color: Colors.primary[500],
  },
  text_secondaryOutline: {
    color: Colors.secondary[500],
  },
  text_successOutline: {
    color: Colors.success[500],
  },
  text_warningOutline: {
    color: Colors.warning[500],
  },
  text_errorOutline: {
    color: Colors.error[500],
  },
  text_neutralOutline: {
    color: Colors.neutral[500],
  },

  // Icon
  icon: {
    marginRight: Spacing[1],
  },
});

Badge.displayName = 'Badge';

export default Badge;
