import React, { memo, useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../design/DesignSystem';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
}

const Input = memo(forwardRef<TextInput, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outline',
  size = 'md',
  disabled = false,
  style,
  inputStyle,
  required = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles = [
    styles.container,
    style,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    disabled && styles.disabled,
  ];

  const textInputStyles = [
    styles.input,
    styles[`input_${size}`],
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    inputStyle,
  ];

  return (
    <View style={containerStyles}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      {/* Input Container */}
      <View style={inputContainerStyles}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon as any}
              size={getIconSize(size)}
              color={getIconColor(isFocused, error, disabled)}
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={textInputStyles}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          editable={!disabled}
          placeholderTextColor={Colors.neutral[400]}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon as any}
              size={getIconSize(size)}
              color={getIconColor(isFocused, error, disabled)}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper/Error Text */}
      {(error || helper) && (
        <View style={styles.messageContainer}>
          <Text style={[styles.message, error ? styles.errorMessage : styles.helperMessage]}>
            {error || helper}
          </Text>
        </View>
      )}
    </View>
  );
}));

// Helper functions
const getIconSize = (size: 'sm' | 'md' | 'lg'): number => {
  switch (size) {
    case 'sm': return 16;
    case 'md': return 20;
    case 'lg': return 24;
    default: return 20;
  }
};

const getIconColor = (focused: boolean, error?: string, disabled?: boolean): string => {
  if (disabled) return Colors.neutral[300];
  if (error) return Colors.error[500];
  if (focused) return Colors.primary[500];
  return Colors.neutral[400];
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },

  // Label
  labelContainer: {
    marginBottom: Spacing[2],
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.neutral[700],
  },
  required: {
    color: Colors.error[500],
  },

  // Input Container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },

  // Variants
  default: {
    backgroundColor: Colors.neutral[50],
    borderColor: Colors.neutral[200],
  },
  filled: {
    backgroundColor: Colors.neutral[100],
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: Colors.neutral[0],
    borderColor: Colors.neutral[200],
  },

  // Sizes
  sm: {
    minHeight: 36,
    paddingHorizontal: Spacing[3],
  },
  md: {
    minHeight: 44,
    paddingHorizontal: Spacing[4],
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: Spacing[5],
  },

  // States
  focused: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  error: {
    borderColor: Colors.error[500],
  },
  disabled: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[200],
    opacity: 0.6,
  },

  // Input
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    padding: 0, // Remove default padding
  },
  input_sm: {
    fontSize: Typography.fontSize.sm,
  },
  input_md: {
    fontSize: Typography.fontSize.base,
  },
  input_lg: {
    fontSize: Typography.fontSize.lg,
  },
  inputWithLeftIcon: {
    marginLeft: Spacing[2],
  },
  inputWithRightIcon: {
    marginRight: Spacing[2],
  },

  // Icons
  leftIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[1],
  },

  // Messages
  messageContainer: {
    marginTop: Spacing[1],
  },
  message: {
    fontSize: Typography.fontSize.xs,
  },
  helperMessage: {
    color: Colors.neutral[500],
  },
  errorMessage: {
    color: Colors.error[500],
  },
});

Input.displayName = 'Input';

export default Input;
