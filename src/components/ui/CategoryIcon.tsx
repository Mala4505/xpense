import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { fonts } from '../../theme/fonts';

interface CategoryIconProps {
  name: string;
  color: string;
  size?: number;
  style?: ViewStyle;
}

export function CategoryIcon({ name, color, size = 34, style }: CategoryIconProps) {
  const abbr = name.slice(0, 3).toUpperCase();
  const fontSize = Math.max(8, Math.floor(size / 3.2));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: 10,
          backgroundColor: color + '22',
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize,
          color,
          letterSpacing: -0.5,
        }}
      >
        {abbr}
      </Text>
    </View>
  );
}
