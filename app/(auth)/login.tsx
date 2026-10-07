import React, { useState, useMemo } from 'react';
import { Platform, KeyboardAvoidingView, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText, Input, Button, Card } from '@/core/components';
import { spacing, radius, shadows } from '@/constants/tokens';
import { useLoginMutation } from '@/features/auth/hooks';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const ORG_PRESETS = [
  { id: 'org-iaquila', name: 'iAQUILA Situation Room' },
  { id: 'org-cpa', name: 'CPA Situation Room' },
  { id: 'org-dpp', name: 'DPP Situation Room' },
  { id: 'org-pl', name: 'PL Situation Room' },
  { id: 'org-ppnf', name: 'PPNF Situation Room' },
  { id: 'org-adp', name: 'ADP Situation Room' },
  { id: 'org-cdd', name: 'CDD West Africa' },
  { id: 'org-yiaga', name: 'YIAGA Africa Watching The Vote' },
  { id: 'org-ind-obs', name: 'Accredited Observer Mission' },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: 'light', hidden: false });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(ORG_PRESETS[0]!);
  const [orgSearch, setOrgSearch] = useState(ORG_PRESETS[0]!.name);
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const loginMutation = useLoginMutation();

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return ORG_PRESETS;
    return ORG_PRESETS.filter((org) => org.name.toLowerCase().includes(q));
  }, [orgSearch]);

  const handleLogin = async () => {
    const orgId = selectedOrg?.id ?? 'org-iaquila';
    const orgName = orgSearch.trim() || selectedOrg.name;

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    try {
      await loginMutation.mutateAsync({
        email: email.trim(),
        password,
        organizationId: orgId,
        organizationName: orgName,
      });
      if (__DEV__) console.log('[login] success', email.trim(), orgName);
    } catch (e) {
      console.warn('[login] failed', e);
      setError('Authentication failed. Please verify credentials.');
    }
  };

  const launchDemo = async (role: 'agent' | 'polling' | 'officer') => {
    setError('');
    try {
      let demoEmail = 'agent@iaquila.com.ng';
      let org = ORG_PRESETS.find((o) => o.id === 'org-iaquila') ?? ORG_PRESETS[0]!;
      if (role === 'polling') {
        demoEmail = 'polling@iaquila.com.ng';
        org = ORG_PRESETS.find((o) => o.id === 'org-yiaga') ?? ORG_PRESETS[7]!;
      } else if (role === 'officer') {
        demoEmail = 'officer@iaquila.com.ng';
        org = ORG_PRESETS.find((o) => o.id === 'org-iaquila') ?? ORG_PRESETS[0]!;
      }

      await loginMutation.mutateAsync({
        email: demoEmail,
        password: 'demo',
        organizationId: org.id,
        organizationName: org.name,
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
        <KeyboardAvoidingView
          enabled={Platform.OS === 'ios'}
          behavior="padding"
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
                Enter credentials to connect to your assigned situation room.
              </ThemedText>

              {/* Organization Selector */}
              <View style={{ marginBottom: spacing.md }}>
                <View style={styles.labelRow}>
                  <Ionicons name="business-outline" size={14} color={colors.primary} />
                  <ThemedText variant="label" color="textSecondary" fontFamily="medium" style={{ marginLeft: 4 }}>
                    ORGANIZATION
                  </ThemedText>
                </View>
                <Input
                  placeholder="Search organization (e.g. iAQUILA Situation Room)"
                  value={orgSearch}
                  onChangeText={(text) => {
                    setOrgSearch(text);
                    setShowOrgSuggestions(true);
                  }}
                  onFocus={() => setShowOrgSuggestions(true)}
                  leftIcon="search-outline"
                  containerStyle={{ marginBottom: showOrgSuggestions && filteredOrgs.length > 0 ? spacing.xs : 0 }}
                />

                {showOrgSuggestions && filteredOrgs.length > 0 && (
                  <View style={[styles.orgDropdown, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    {filteredOrgs.map((org) => {
                      const active = selectedOrg.id === org.id && orgSearch.trim().toLowerCase() === org.name.toLowerCase();
                      return (
                        <Pressable
                          key={org.id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedOrg(org);
                            setOrgSearch(org.name);
                            setShowOrgSuggestions(false);
                          }}
                          style={[
                            styles.orgOption,
                            {
                              backgroundColor: active ? colors.primary + '16' : 'transparent',
                              borderColor: active ? colors.primary : 'transparent',
                            },
                          ]}
                          accessibilityLabel={org.name}
                        >
                          <ThemedText
                            variant="body"
                            color="text"
                            fontFamily={active ? 'bold' : 'regular'}
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {org.name}
                          </ThemedText>
                          {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <Input
                label="Email"
                placeholder="agent@iaquila.com.ng"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon="mail-outline"
                containerStyle={{ marginBottom: spacing.sm }}
              />

              <Input
                label="Password"
                placeholder="Enter your security passkey"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                secureToggle
                visible={showPassword}
                onToggleSecure={() => setShowPassword((prev) => !prev)}
                leftIcon="lock-closed-outline"
                containerStyle={{ marginBottom: spacing.md }}
              />

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorSubtle, borderColor: colors.error }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <ThemedText variant="caption" color="error" style={{ marginLeft: 6, flex: 1 }}>
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
                    loading={loginMutation.isPending}
                    fullWidth
                    size="sm"
                  />
                  <Button
                    label="PU Agent"
                    variant="outline"
                    onPress={() => launchDemo('polling')}
                    loading={loginMutation.isPending}
                    fullWidth
                    size="sm"
                  />
                  <Button
                    label="Election Officer"
                    variant="outline"
                    onPress={() => launchDemo('officer')}
                    loading={loginMutation.isPending}
                    fullWidth
                    size="sm"
                  />
                </View>
              </View>
            </Card>

            {/* Government Non-Affiliation Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={16} color="#A3B8AC" style={{ marginTop: 1 }} />
              <ThemedText variant="label" color="#A3B8AC" style={{ flex: 1, fontSize: 10, lineHeight: 14 }}>
                iAquila is an independent non-governmental collation and research tool. It does not represent or act on behalf of INEC or any government entity. Official election results: inecnigeria.org
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
        </KeyboardAvoidingView>
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
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1.5,
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
    width: 58,
    height: 58,
  },
  brandTitle: {
    letterSpacing: 3,
    fontSize: 28,
  },
  brandSub: {
    letterSpacing: 1.2,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  formCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orgDropdown: {
    marginTop: 6,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  orgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  demoSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 172, 0.25)',
  },
});
