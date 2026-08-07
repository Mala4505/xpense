import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useColors } from '../../theme/useColors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceCard,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: colors.surfaceBorder,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
