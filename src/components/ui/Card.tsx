import React, { memo, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../../design/DesignSystem';

type CardVariant = 'default' | 'elevated' | 'outline' | 'gradient';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  gradientColors?: string[];
}

const Card = memo<CardProps>(({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  style,
  gradientColors = Colors.gradients.primary,
}) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    disabled && styles.disabled,
    style,
  ];

  const content = (
    <View style={styles.content}>
      {children}
    </View>
  );

  if (variant === 'gradient') {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper
        onPress={onPress}
        disabled={disabled}
        style={[styles.base, style]}
        activeOpacity={onPress ? 0.9 : 1}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {content}
        </LinearGradient>
      </Wrapper>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={cardStyles}
        activeOpacity={0.9}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  
  // Variants
  default: {
    backgroundColor: Colors.neutral[0],
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.neutral[0],
    ...Shadows.lg,
  },
  outline: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  gradient: {
    backgroundColor: 'transparent',
    ...Shadows.md,
  },

  // States
  disabled: {
    opacity: 0.6,
  },

  // Content
  content: {
    padding: Spacing[4],
  },
  gradient: {
    borderRadius: BorderRadius.lg,
    flex: 1,
  },
});

Card.displayName = 'Card';

export default Card;
