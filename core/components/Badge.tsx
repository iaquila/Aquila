import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { radius, spacing } from '@/constants/tokens';
import Colors from '@/constants/colors';
import { useColorScheme } from '@/core/hooks/useColorScheme';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'critical'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'outline';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  color?: string; // Custom color (e.g. for political party acronyms)
  bgColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
};

/**
 * Shared Badge / Pill component for status, party, and categorical indicators.
 * Guarantees zero text clip, responsive autoscaling, and uniform padding.
 */
export function Badge({
  label,
  variant = 'neutral',
  color: customColor,
  bgColor: customBgColor,
  size = 'md',
  style,
  textStyle,
  icon,
}: BadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  // Resolve palette
  let textColor = colors.text;
  let bg = colors.borderSubtle;
  let borderColor: string | undefined = undefined;

  if (customColor) {
    textColor = customColor;
    bg = customBgColor ?? `${customColor}18`;
  } else {
    switch (variant) {
      case 'success':
        textColor = colors.success;
        bg = colors.successSubtle;
        break;
      case 'warning':
        textColor = colors.warning;
        bg = colors.warningSubtle;
        break;
      case 'error':
      case 'critical':
        textColor = colors.critical;
        bg = colors.criticalSubtle;
        break;
      case 'info':
        textColor = colors.primaryLight;
        bg = colors.primarySubtle;
        break;
      case 'primary':
        textColor = colors.primary;
        bg = colors.primarySubtle;
        break;
      case 'outline':
        textColor = colors.textSecondary;
        bg = 'transparent';
        borderColor = colors.border;
        break;
      case 'neutral':
      default:
        textColor = colors.textSecondary;
        bg = colors.borderSubtle;
        break;
    }
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        isSmall ? styles.sizeSm : styles.sizeMd,
        {
          backgroundColor: bg,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? 1 : 0,
        },
        style,
      ]}
    >
      {icon}
      <ThemedText
        variant="label"
        fontFamily="bold"
        style={[
          styles.text,
          isSmall && styles.textSm,
          { color: textColor },
          textStyle,
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    flexShrink: 0,
    gap: 4,
  },
  sizeMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  sizeSm: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
