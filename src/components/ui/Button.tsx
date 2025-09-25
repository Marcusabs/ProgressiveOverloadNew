import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Animations } from '../../design/DesignSystem';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button = memo<ButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.base,
    styles[size],
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    styles[`text_${variant}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const renderContent = () => (
    <View style={styles.content}>
      {loading && <ActivityIndicator size="small" color={getSpinnerColor(variant)} style={styles.spinner} />}
      {!loading && icon && iconPosition === 'left' && (
        <Ionicons name={icon as any} size={getIconSize(size)} color={getIconColor(variant, disabled)} style={styles.iconLeft} />
      )}
      <Text style={textStyles}>{title}</Text>
      {!loading && icon && iconPosition === 'right' && (
        <Ionicons name={icon as any} size={getIconSize(size)} color={getIconColor(variant, disabled)} style={styles.iconRight} />
      )}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.base, styles[size], fullWidth && styles.fullWidth, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={disabled ? [Colors.neutral[300], Colors.neutral[400]] as const : Colors.gradients.primary}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
});

// Helper functions
const getIconSize = (size: ButtonSize): number => {
  switch (size) {
    case 'sm': return 16;
    case 'md': return 20;
    case 'lg': return 24;
    default: return 20;
  }
};

const getIconColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) return Colors.neutral[400];
  
  switch (variant) {
    case 'primary':
    case 'gradient':
      return Colors.neutral[0];
    case 'secondary':
      return Colors.neutral[0];
    case 'outline':
      return Colors.primary[500];
    case 'ghost':
      return Colors.primary[500];
    default:
      return Colors.neutral[0];
  }
};

const getSpinnerColor = (variant: ButtonVariant): string => {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'gradient':
      return Colors.neutral[0];
    case 'outline':
    case 'ghost':
      return Colors.primary[500];
    default:
      return Colors.neutral[0];
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Shadows.sm,
  },
  
  // Sizes
  sm: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    minHeight: 32,
  },
  md: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[4],
    minHeight: 56,
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary[500],
  },
  secondary: {
    backgroundColor: Colors.secondary[500],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // States
  disabled: {
    backgroundColor: Colors.neutral[300],
    ...Shadows.none,
  },
  fullWidth: {
    width: '100%',
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: BorderRadius.md,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text styles
  text: {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  text_sm: {
    fontSize: Typography.fontSize.sm,
  },
  text_md: {
    fontSize: Typography.fontSize.base,
  },
  text_lg: {
    fontSize: Typography.fontSize.lg,
  },
  text_primary: {
    color: Colors.neutral[0],
  },
  text_secondary: {
    color: Colors.neutral[0],
  },
  text_outline: {
    color: Colors.primary[500],
  },
  text_ghost: {
    color: Colors.primary[500],
  },
  text_gradient: {
    color: Colors.neutral[0],
  },
  textDisabled: {
    color: Colors.neutral[500],
  },

  // Icons
  iconLeft: {
    marginRight: Spacing[2],
  },
  iconRight: {
    marginLeft: Spacing[2],
  },
  spinner: {
    marginRight: Spacing[2],
  },
});

Button.displayName = 'Button';

export default Button;
