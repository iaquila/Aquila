import React, { useState, useCallback, useRef } from 'react';
import { Platform, ScrollView, View, StyleSheet, Keyboard, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText, Input, Button, Card } from '@/core/components';
import { spacing, radius, shadows, typography, border, sizes } from '@/constants/tokens';
import { useLoginMutation, useDemoLoginMutation } from '@/features/auth/hooks';
import { UnsupportedOfficerError } from '@/features/auth/api';
import { ApiError } from '@/core/services/http';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: 'light', hidden: false });

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const loginMutation = useLoginMutation();
  const demoLoginMutation = useDemoLoginMutation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    try {
      await loginMutation.mutateAsync({
        email: email.trim(),
        password,
      });
      if (__DEV__) console.log('[login] success', email.trim());
    } catch (e) {
      console.warn('[login] failed', e);
      if (e instanceof UnsupportedOfficerError) {
        setError(e.message);
      } else if (e instanceof ApiError) {
        setError(e.statusCode === 401 ? 'Invalid email or password.' : 'Could not reach the election service.');
      } else {
        setError('Authentication failed. Please verify credentials.');
      }
    }
  };

  const launchDemo = async (role: 'agent' | 'polling' | 'officer') => {
    setError('');
    try {
      let demoEmail = 'agent@iaquila.com.ng';
      if (role === 'polling') {
        demoEmail = 'polling@iaquila.com.ng';
      } else if (role === 'officer') {
        demoEmail = 'officer@iaquila.com.ng';
      }

      await demoLoginMutation.mutateAsync({
        email: demoEmail,
        password: 'demo',
      });
    } catch (e) {
      console.warn('[login] demo failed', role, e);
      setError('Demo login failed. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#070C09' }}>
      <LinearGradient
        colors={['#070C09', '#0D2619', '#0D6338']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl,
            paddingHorizontal: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Brand Identity */}
          <View style={styles.headerBlock}>
            <View style={[styles.logoBadge, { borderColor: colors.primaryLight + '44' }]}>
              <Image
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                source={require('@/assets/eagle-head.png')}
                style={styles.logoImage}
                contentFit="contain"
                priority="high"
                cachePolicy="memory-disk"
              />
            </View>
            <ThemedText variant="display" color="#FFFFFF" fontFamily="bold" style={styles.brandTitle}>
              iAQUILA
            </ThemedText>
            <ThemedText variant="label" color="#10B981" fontFamily="medium" style={styles.brandSub}>
              REAL-TIME ELECTION INTELLIGENCE · ELECTION CONSOLE
            </ThemedText>
          </View>

          {/* Auth Form Card */}
          <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <ThemedText variant="title" color="text" fontFamily="bold" style={{ marginBottom: spacing.xs }}>
              Sign In
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
              Enter credentials to connect to the situation room.
            </ThemedText>

            <Input
              label="Email"
              placeholder="agent@iaquila.com.ng"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              leftIcon="mail-outline"
              containerStyle={{ marginBottom: spacing.sm }}
            />

            <Input
              ref={passwordRef}
              label="Password"
              placeholder="Enter your security passkey"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              secureToggle
              visible={showPassword}
              onToggleSecure={() => setShowPassword((prev) => !prev)}
              leftIcon="lock-closed-outline"
              containerStyle={{ marginBottom: spacing.md }}
            />

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorSubtle, borderColor: colors.error }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <ThemedText variant="caption" color="error" style={{ marginLeft: spacing['2xs'] + spacing['3xs'], flex: 1 }}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <Button
              label="Access Situation Room"
              onPress={handleLogin}
              loading={loginMutation.isPending}
              fullWidth
              leftIcon="shield-checkmark-outline"
              style={{ marginTop: spacing.xs }}
              size="lg"
            />

            {/* Quick Demo Access Buttons */}
            <View style={styles.demoSection}>
              <ThemedText variant="label" color="textMuted" style={{ textAlign: 'center', marginBottom: spacing.xs }}>
                ONE-TAP DEMO ROLES
              </ThemedText>
              <View style={{ gap: spacing.xs }}>
                <Button
                  label="Field Agent"
                  variant="outline"
                  onPress={() => launchDemo('agent')}
                  loading={demoLoginMutation.isPending}
                  fullWidth
                  size="sm"
                />
                <Button
                  label="PU Agent"
                  variant="outline"
                  onPress={() => launchDemo('polling')}
                  loading={demoLoginMutation.isPending}
                  fullWidth
                  size="sm"
                />
                <Button
                  label="Election Officer"
                  variant="outline"
                  onPress={() => launchDemo('officer')}
                  loading={demoLoginMutation.isPending}
                  fullWidth
                  size="sm"
                />
              </View>
            </View>
          </Card>

          {/* Government Non-Affiliation Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={16} color="#A3B8AC" />
            <ThemedText variant="micro" color="#A3B8AC" style={{ flex: 1 }}>
              <ThemedText variant="micro" color="#FFFFFF" fontFamily="bold">iAQUILA</ThemedText> is an independent non-governmental collation and research tool. It does not represent or act on behalf of INEC or any government entity. Official election results: inecnigeria.org
            </ThemedText>
          </View>

          <ThemedText
            variant="caption"
            color="#A3B8AC"
            style={{ textAlign: 'center', marginTop: spacing.md }}
          >
            Independent Observer Intelligence System · Secured & Real-time
          </ThemedText>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: sizes.avatar - spacing.xs,
    height: sizes.avatar - spacing.xs,
    borderRadius: radius.lg,
    borderWidth: border.thick,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 99, 56, 0.35)',
    marginBottom: spacing.sm,
    ...Platform.select<object>({
      ios: shadows.lg,
      android: { elevation: 0 },
    }),
  },
  logoImage: {
    width: sizes.icon + spacing.xs + spacing['3xs'],
    height: sizes.icon + spacing.xs + spacing['3xs'],
  },
  brandTitle: {
    letterSpacing: 3,
    fontSize: typography.h2,
  },
  brandSub: {
    letterSpacing: 1.2,
    fontSize: typography.micro,
    textAlign: 'center',
    marginTop: spacing['3xs'],
  },
  formCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    marginBottom: spacing.sm,
  },
  demoSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: border.thin,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - spacing['3xs'],
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: border.thin,
    borderColor: 'rgba(163, 184, 172, 0.25)',
  },
});
