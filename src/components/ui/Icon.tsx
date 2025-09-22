import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../../design/DesignSystem';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type IconVariant = 'default' | 'filled' | 'outline' | 'gradient';
type IconColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | string;

interface IconProps {
  name: string;
  size?: IconSize | number;
  color?: IconColor;
  variant?: IconVariant;
  backgroundColor?: string;
  borderRadius?: number;
  style?: ViewStyle;
  gradientColors?: string[];
}

const Icon = memo<IconProps>(({
  name,
  size = 'md',
  color = 'neutral',
  variant = 'default',
  backgroundColor,
  borderRadius,
  style,
  gradientColors = Colors.gradients.primary,
}) => {
  const iconSize = getIconSize(size);
  const iconColor = getIconColor(color, variant);
  const containerSize = getContainerSize(size, variant);

  const containerStyles = [
    variant !== 'default' && styles.container,
    variant !== 'default' && {
      width: containerSize,
      height: containerSize,
      borderRadius: borderRadius ?? containerSize / 2,
    },
    variant === 'filled' && {
      backgroundColor: backgroundColor || getBackgroundColor(color),
    },
    variant === 'outline' && {
      borderWidth: 2,
      borderColor: getIconColor(color, 'default'),
      backgroundColor: 'transparent',
    },
    variant !== 'default' && Shadows.sm,
    style,
  ];

  const icon = (
    <Ionicons
      name={name as any}
      size={iconSize}
      color={iconColor}
    />
  );

  if (variant === 'gradient') {
    return (
      <View style={containerStyles}>
        <LinearGradient
          colors={gradientColors}
          style={[
            styles.gradientContainer,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: borderRadius ?? containerSize / 2,
            },
          ]}
        >
          {icon}
        </LinearGradient>
      </View>
    );
  }

  if (variant === 'default') {
    return icon;
  }

  return (
    <View style={containerStyles}>
      {icon}
    </View>
  );
});

// Helper functions
const getIconSize = (size: IconSize | number): number => {
  if (typeof size === 'number') return size;
  
  switch (size) {
    case 'xs': return 12;
    case 'sm': return 16;
    case 'md': return 20;
    case 'lg': return 24;
    case 'xl': return 32;
    case '2xl': return 40;
    default: return 20;
  }
};

const getContainerSize = (size: IconSize | number, variant: IconVariant): number => {
  if (variant === 'default') return 0;
  
  const iconSize = getIconSize(size);
  return iconSize + 16; // Add padding
};

const getIconColor = (color: IconColor, variant: IconVariant): string => {
  if (variant === 'filled' || variant === 'gradient') {
    return Colors.neutral[0]; // White for filled/gradient backgrounds
  }

  switch (color) {
    case 'primary':
      return Colors.primary[500];
    case 'secondary':
      return Colors.secondary[500];
    case 'success':
      return Colors.success[500];
    case 'warning':
      return Colors.warning[500];
    case 'error':
      return Colors.error[500];
    case 'neutral':
      return Colors.neutral[600];
    default:
      return color; // Custom color string
  }
};

const getBackgroundColor = (color: IconColor): string => {
  switch (color) {
    case 'primary':
      return Colors.primary[500];
    case 'secondary':
      return Colors.secondary[500];
    case 'success':
      return Colors.success[500];
    case 'warning':
      return Colors.warning[500];
    case 'error':
      return Colors.error[500];
    case 'neutral':
      return Colors.neutral[500];
    default:
      return color; // Custom color string
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

Icon.displayName = 'Icon';

export default Icon;

// Pre-defined icon components for common use cases
export const WorkoutIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="barbell" {...props} />
));

export const ExerciseIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="fitness" {...props} />
));

export const ProgressIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="trending-up" {...props} />
));

export const TimerIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="timer" {...props} />
));

export const HeartIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="heart" {...props} />
));

export const StarIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="star" {...props} />
));

export const CheckIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="checkmark-circle" {...props} />
));

export const PlusIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="add-circle" {...props} />
));

export const SettingsIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="settings" {...props} />
));

export const ProfileIcon = memo((props: Omit<IconProps, 'name'>) => (
  <Icon name="person-circle" {...props} />
));
