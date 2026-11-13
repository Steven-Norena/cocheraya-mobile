import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  status: string;
  label?: string;
  children?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, children, style, textStyle }) => {
  const normStatus = status.toLowerCase();
  
  const getBadgeStyle = () => {
    switch (normStatus) {
      case 'available':
      case 'active':
        return styles.available;
      case 'reserved':
      case 'pending':
        return styles.reserved;
      case 'occupied':
      case 'expired':
      case 'cancelled':
      case 'canceled':
        return styles.occupied;
      case 'finished':
      default:
        return styles.finished;
    }
  };

  const getBadgeTextStyle = () => {
    switch (normStatus) {
      case 'available':
      case 'active':
        return styles.text_available;
      case 'reserved':
      case 'pending':
        return styles.text_reserved;
      case 'occupied':
      case 'expired':
      case 'cancelled':
      case 'canceled':
        return styles.text_occupied;
      case 'finished':
      default:
        return styles.text_finished;
    }
  };

  const labelText = label || children || status;

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text style={[styles.text, getBadgeTextStyle(), textStyle]}>
        {labelText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  available: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  text_available: {
    color: '#10b981',
  },
  reserved: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  text_reserved: {
    color: '#f59e0b',
  },
  occupied: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  text_occupied: {
    color: '#ef4444',
  },
  finished: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  text_finished: {
    color: '#94a3b8',
  },
});

export default Badge;
