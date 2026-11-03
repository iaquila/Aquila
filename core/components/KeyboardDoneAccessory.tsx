import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import Colors from '@/constants/colors';
import { ThemedText } from './ThemedText';
import { border, sizes, spacing } from '@/constants/tokens';

export const KEYBOARD_DONE_ACCESSORY_ID = 'numeric-keyboard-done';

export function KeyboardDoneAccessory() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ACCESSORY_ID}>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => Keyboard.dismiss()}
          hitSlop={spacing.xs}
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
          style={styles.doneButton}
        >
          <ThemedText variant="body" color="primary" fontFamily="bold">
            Done
          </ThemedText>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderTopWidth: border.thin,
  },
  doneButton: {
    minHeight: sizes.buttonMd,
    minWidth: sizes.buttonMd,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
