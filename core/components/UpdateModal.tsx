import React from 'react';
import {
  Modal,
  View,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useHaptics } from '@/core/hooks/useHaptics';
import { ThemedText } from '@/core/components/ThemedText';
import { Button } from '@/core/components/Button';
import Colors from '@/constants/colors';
import { radius, spacing, typography } from '@/constants/tokens';

export interface UpdateModalProps {
  visible: boolean;
  manifest: {
    message: string;
    forceUpdate: boolean;
    iosStoreUrl: string;
    androidStoreUrl: string;
    minRequiredVersion: string;
  };
  onDismiss: () => void;
}

export function UpdateModal({
  visible,
  manifest,
  onDismiss,
}: UpdateModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const haptics = useHaptics();

  const storeUrl = Platform.OS === 'ios' ? manifest.iosStoreUrl : manifest.androidStoreUrl;

  const handleUpdate = () => {
    haptics.impact();
    Linking.openURL(storeUrl).catch(() => {});
  };

  const handleSkip = () => {
    haptics.selection();
    onDismiss();
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,20,15,0.45)',
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={manifest.forceUpdate ? undefined : onDismiss}
      statusBarTranslucent
    >
      {manifest.forceUpdate ? (
        <View style={overlayStyle} />
      ) : (
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={overlayStyle} />
        </TouchableWithoutFeedback>
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.sheetContainer}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
                <ThemedText variant="title" color="primary">
                  ↓
                </ThemedText>
              </View>
              <View style={styles.headerTextContainer}>
                <ThemedText variant="h2" color="primary">
                  Update Available
                </ThemedText>
                <ThemedText variant="body" color="textMuted">
                  New version {manifest.minRequiredVersion}
                </ThemedText>
              </View>
              {!manifest.forceUpdate && (
                <TouchableWithoutFeedback onPress={onDismiss}>
                  <View style={styles.closeBtn}>
                    <ThemedText variant="label" color="textMuted">
                      ✕
                    </ThemedText>
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>

            <ThemedText variant="body" color="text" style={styles.body}>
              {manifest.message}
            </ThemedText>

            <View style={styles.actions}>
              {manifest.forceUpdate ? (
                <Button
                  variant="primary"
                  size="lg"
                  label="Update now"
                  onPress={handleUpdate}
                  fullWidth
                />
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    label="Skip"
                    onPress={handleSkip}
                    fullWidth
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    label="Update now"
                    onPress={handleUpdate}
                    fullWidth
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  sheet: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  body: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
