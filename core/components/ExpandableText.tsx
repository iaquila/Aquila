import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import Colors from '@/constants/colors';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { spacing } from '@/constants/tokens';

type ExpandableTextProps = {
  children: string;
  variant?: React.ComponentProps<typeof ThemedText>['variant'];
  color?: React.ComponentProps<typeof ThemedText>['color'];
  fontFamily?: React.ComponentProps<typeof ThemedText>['fontFamily'];
  collapsedLines?: number;
  style?: ViewStyle | object;
  testID?: string;
};

/**
 * Clamped text with a recovery path (gold-standard truncation).
 * Collapsed to `collapsedLines` with a "Show more / Show less" toggle,
 * and always exposes the full string to screen readers.
 */
export function ExpandableText({
  children,
  variant = 'body',
  color = 'text',
  fontFamily = 'regular',
  collapsedLines = 2,
  style,
  testID,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  // Short text: no toggle needed, render plain.
  // Heuristic avoids onTextLayout measurement round-trips.
  if (children.length <= 120) {
    return (
      <ThemedText variant={variant} color={color} fontFamily={fontFamily} style={style} testID={testID}>
        {children}
      </ThemedText>
    );
  }

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={children}
      accessibilityHint={expanded ? 'Collapses text' : 'Expands full text'}
      testID={testID}
    >
      <ThemedText
        variant={variant}
        color={color}
        fontFamily={fontFamily}
        style={style}
        numberOfLines={expanded ? undefined : collapsedLines}
      >
        {children}
      </ThemedText>
      <ThemedText
        variant="caption"
        fontFamily="bold"
        style={[styles.toggle, { color: colors.primary }]}
      >
        {expanded ? 'Show less' : 'Show more'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginTop: spacing['3xs'],
  },
});
