import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, Card, EmptyState, Input, Shimmer, SkeletonCard } from '@/core/components';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, shadows, border } from '@/constants/tokens';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useLiveElectoralAreasQuery } from '@/features/api/hooks';
import { formatServerLabel } from '@/core/utils/formatters';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const ALL_LEVELS = 'ALL';

// Levels the API can return, ordered widest to narrowest. The server exposes the
// parent relationship only in the control plane (`control_electoral_area_id` is a
// pointer into the control table, not the parent row), so entries are grouped by
// level rather than nested — nothing here claims a parent the payload omits.
const LEVEL_ORDER = [
  'country',
  'state',
  'senatorial_district',
  'federal_constituency',
  'state_constituency',
  'lga',
  'ward',
];

export default function LocationsScreen() {
  const { data: areas = [], isLoading } = useLiveElectoralAreasQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>(ALL_LEVELS);

  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });

  const byLevel = useMemo(() => {
    const map = new Map<string, number>();
    for (const area of areas) map.set(area.type, (map.get(area.type) ?? 0) + 1);
    return map;
  }, [areas]);

  const levels = useMemo(
    () =>
      [...byLevel.keys()].sort((a, b) => {
        const rankA = LEVEL_ORDER.indexOf(a);
        const rankB = LEVEL_ORDER.indexOf(b);
        return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
      }),
    [byLevel]
  );

  const visibleAreas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return areas
      .filter((area) => selectedLevel === ALL_LEVELS || area.type === selectedLevel)
      .filter(
        (area) =>
          query.length === 0 ||
          area.name.toLowerCase().includes(query) ||
          (area.code ?? '').toLowerCase().includes(query) ||
          area.type.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [areas, selectedLevel, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLevel(ALL_LEVELS);
  };

  if (isLoading && areas.length === 0) {
    return (
      <ScreenView scrollable={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.skeletonHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Shimmer width={140} height={12} borderRadius={radius.sm} />
          <Shimmer width="65%" height={24} borderRadius={radius.sm} />
          <Shimmer width="80%" height={12} borderRadius={radius.sm} />
        </View>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </ScreenView>
    );
  }

  return (
    <ScreenView scrollable contentContainerStyle={styles.scrollContent}>
      {/* 1. Live hierarchy overview */}
      <LinearGradient
        colors={['#0D6338', '#0A4A2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerHero, shadows.md]}
      >
        <ThemedText variant="label" color="#A3E6C2" fontFamily="bold">
          ELECTORAL GEOGRAPHY
        </ThemedText>
        <ThemedText variant="h2" color="#FFFFFF" fontFamily="bold" style={{ marginTop: spacing['3xs'] }}>
          Your Electoral Areas
        </ThemedText>
        <ThemedText variant="caption" color="#D1FAE5" style={{ marginTop: spacing['3xs'] }}>
          {areas.length} {areas.length === 1 ? 'area is' : 'areas are'} registered for your organisation
        </ThemedText>

        {levels.length > 0 ? (
          <View style={styles.statsStrip}>
            {levels.slice(0, 3).map((level, index) => (
              <React.Fragment key={level}>
                {index > 0 ? <View style={styles.statDivider} /> : null}
                <View style={styles.statCol}>
                  <ThemedText variant="title" color="#FFFFFF" fontFamily="bold">
                    {byLevel.get(level) ?? 0}
                  </ThemedText>
                  <ThemedText variant="label" color="#A3E6C2">
                    {formatServerLabel(level).toUpperCase()}
                  </ThemedText>
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : null}
      </LinearGradient>

      {/* 2. Search across registered areas */}
      <Card style={styles.sectionCard}>
        <ThemedText variant="title" color="text" fontFamily="bold">
          Find a Location
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" style={{ marginBottom: spacing.sm }}>
          Search the electoral areas your organisation has registered.
        </ThemedText>

        <Input
          placeholder="Search a ward, LGA, state or code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          rightIcon={searchQuery ? 'close-circle' : undefined}
          onRightIconPress={() => setSearchQuery('')}
        />
      </Card>

      {/* 3. Level filter + area list */}
      <Card style={styles.sectionCard}>
        <ThemedText variant="title" color="text" fontFamily="bold">
          Browse by Level
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateChipsScroll}>
          {[
            { key: ALL_LEVELS, label: 'All Levels', count: areas.length },
            ...levels.map((level) => ({
              key: level,
              label: formatServerLabel(level),
              count: byLevel.get(level) ?? 0,
            })),
          ].map((chip) => {
            const active = selectedLevel === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedLevel(chip.key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.stateChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceElevated,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  color={active ? '#FFFFFF' : 'text'}
                  fontFamily={active ? 'bold' : 'regular'}
                >
                  {chip.label} ({chip.count})
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {visibleAreas.length === 0 ? (
            <EmptyState
              icon="location-outline"
              title={areas.length === 0 ? 'No Areas Registered' : 'No Matching Areas'}
              subtitle={
                areas.length === 0
                  ? 'Your organisation has no electoral areas on the server yet.'
                  : 'Nothing matches that search. Try a different name, code or level.'
              }
              actionLabel={areas.length === 0 ? undefined : 'Reset'}
              onAction={resetFilters}
            />
          ) : (
            visibleAreas.map((area) => (
              <View key={area.id} style={[styles.lgaItem, { borderColor: colors.border }]}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing['2xs'] + spacing['3xs'], paddingRight: spacing.xs }}>
                  <ThemedText
                    variant="caption"
                    color="text"
                    fontFamily="medium"
                    accessibilityLabel={`${area.name}, ${formatServerLabel(area.type)}`}
                  >
                    {area.name}
                  </ThemedText>
                  {area.code ? (
                    <ThemedText variant="micro" color="textMuted">
                      {area.code}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText variant="label" color="primary" style={{ flexShrink: 0 }}>
                  {formatServerLabel(area.type)}
                </ThemedText>
              </View>
            ))
          )}
        </View>

        {visibleAreas.length > 0 ? (
          <ThemedText variant="micro" color="textMuted" style={{ marginTop: spacing.sm }}>
            Polling units are not yet exposed by the server, so only areas are listed here.
          </ThemedText>
        ) : null}
      </Card>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  skeletonHero: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.thin,
    gap: spacing.sm,
  },
  headerHero: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: border.thin,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: border.thin,
    height: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.xs,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  stateChipsScroll: {
    gap: spacing['2xs'] + spacing['3xs'],
    paddingVertical: spacing['3xs'],
  },
  stateChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.full,
    borderWidth: border.thin,
  },
  lgaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    overflow: 'hidden',
    gap: spacing.xs,
  },
});
