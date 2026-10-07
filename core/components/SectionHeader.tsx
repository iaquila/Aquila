import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { spacing, radius } from '@/constants/tokens';
import Colors from '@/constants/colors';
import { useColorScheme } from '@/core/hooks/useColorScheme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  color?: string;
  showIndicator?: boolean;
  action?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Production-hardened Section Header.
 * Features:
 * - Fluid flex distribution (`minWidth: 0, flexShrink: 1`).
 * - Optional accent color indicator.
 * - Optional secondary caption subtitle.
 * - Pinned flexShrink: 0 action container.
 */
export function SectionHeader({
  title,
  subtitle,
  color,
  showIndicator = false,
  action,
  style,
}: SectionHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          {showIndicator && (
            <View style={[styles.indicator, { backgroundColor: color ?? colors.primary }]} />
          )}
          <ThemedText variant="title" color="text" fontFamily="bold" style={styles.titleText}>
            {title}
          </ThemedText>
        </View>
        {subtitle && (
          <ThemedText variant="caption" color="textSecondary" style={styles.subtitleText}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action && <View style={styles.actionWrap}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 4,
    height: 16,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  titleText: {
    flexShrink: 1,
  },
  subtitleText: {
    marginTop: 2,
  },
  actionWrap: {
    flexShrink: 0,
  },
});
