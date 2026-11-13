import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const handlePress = () => {
    if (!loading && !disabled) {
      onPress();
    }
  };

  const buttonStyles = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_variant_${variant}`],
    styles[`text_size_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={buttonStyles as any}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#a855f7' : '#ffffff'} size="small" />
      ) : (
        <>
          {icon && icon}
          <Text style={textStyles as any}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: 'System',
    fontWeight: '700',
    textAlign: 'center',
  },
  // Variants
  variant_primary: {
    backgroundColor: '#a855f7', // violet
  },
  variant_secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  variant_danger: {
    backgroundColor: '#ef4444', // red
  },
  // Text Variants
  text_variant_primary: {
    color: '#ffffff',
  },
  text_variant_secondary: {
    color: '#f8fafc',
  },
  text_variant_danger: {
    color: '#ffffff',
  },
  // Sizes
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  // Text Sizes
  text_size_sm: {
    fontSize: 14,
  },
  text_size_md: {
    fontSize: 16,
  },
  text_size_lg: {
    fontSize: 18,
  },
});

export default Button;
