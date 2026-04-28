import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceCard,
          borderRadius: 18,
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
