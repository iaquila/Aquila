import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, LayoutAnimation, Pressable, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, EmptyState, SkeletonCard, Card, Input, Badge, SectionHeader } from '@/core/components';
import { ROUTES } from '@/constants/routes';
import { spacing, radius, shadows, border, typography, sizes } from '@/constants/tokens';
import { useRefreshControl, useForegroundRefresh, useHaptics } from '@/core/hooks';
import { formatServerLabel } from '@/core/utils/formatters';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useLiveElectionsQuery, useLiveElectionCyclesQuery, useLiveElectionPartiesQuery, useLivePositionsQuery } from '@/features/api/hooks';
import { partyColor } from '@/constants/parties';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

import {
  ELECTION_STATUS_COLORS as STATUS_COLORS,
  ELECTION_STATUS_LABELS as STATUS_LABELS,
  ELECTORAL_AREA_TYPE_ORDER,
} from '@/constants/elections';

const ALL_POSITIONS = 'ALL';



export default function ElectionsScreen() {
  const { data: cycles = [], isLoading: cyclesLoading } = useLiveElectionCyclesQuery();
  const { data: elections = [], isLoading: electionsLoading, refetch: refetchElections } = useLiveElectionsQuery();
  const { data: partiesByElection } = useLiveElectionPartiesQuery();
  const { data: positions = [] } = useLivePositionsQuery();
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>(ALL_POSITIONS);
  const [searchQuery, setSearchQuery] = useState('');

  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { impact } = useHaptics();
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });

  const { refreshControl } = useRefreshControl(
    cyclesLoading || electionsLoading,
    refetchElections
  );
  useForegroundRefresh([['catalogue']], 5 * 60 * 1000);

  const loading = cyclesLoading || electionsLoading;

  useEffect(() => {
    if (cycles.length > 0 && !selectedCycle) {
      setSelectedCycle(cycles[0]!.id);
    }
  }, [cycles, selectedCycle]);

  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.id === selectedCycle) ?? cycles[0] ?? null;
  }, [cycles, selectedCycle]);

  // Chips are the server's own position names, deduped and ordered by the office
  // hierarchy. Matching is an exact class of name, so a newly seeded position
  // appears without a code change and never silently filters to zero rows.
  const positionFilters = useMemo(() => {
    const byName = new Map<string, { key: string; label: string; type: string }>();
    for (const position of positions) {
      const label = position.name.trim();
      const key = label.toLowerCase();
      if (!label || byName.has(key)) continue;
      byName.set(key, { key, label: formatServerLabel(label), type: position.electoralAreaType });
    }
    return [...byName.values()].sort((a, b) => {
      const rankA = ELECTORAL_AREA_TYPE_ORDER[a.type] ?? Number.MAX_SAFE_INTEGER;
      const rankB = ELECTORAL_AREA_TYPE_ORDER[b.type] ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.label.localeCompare(b.label);
    });
  }, [positions]);

  const filteredElections = useMemo(() => {
    return elections.filter((e) => {
      const matchCycle = !selectedCycle || e.cycleId === selectedCycle;
      if (!matchCycle) return false;

      if (selectedPosition !== ALL_POSITIONS && e.position.trim().toLowerCase() !== selectedPosition) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchPos = e.position.toLowerCase().includes(query);
        const matchArea = e.electoralArea.toLowerCase().includes(query);
        const matchType = e.electoralAreaType.toLowerCase().includes(query);
        if (!matchPos && !matchArea && !matchType) return false;
      }

      return true;
    });
  }, [elections, selectedCycle, selectedPosition, searchQuery]);

  const handleCycleSelect = useCallback((id: string) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCycle(id);
  }, [impact]);

  const handlePositionSelect = useCallback((id: string) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPosition(id);
  }, [impact]);

  return (
    <ScreenView
      scrollable
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Title Header */}
      <SectionHeader
        title="Elections & Mandates"
        subtitle="Browse election cycles, contest statuses, and candidate slates"
        showIndicator
        indicatorColor={colors.primary}
        style={{ marginBottom: 0 }}
      />

      {/* Cycle Selector (Segmented Tabs) */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {cycles.map((cycle) => {
          const isSelected = activeCycle?.id === cycle.id;
          const shortName = cycle.name
            .replace(' Election', '')
            .replace('Governorship - ', '')
            .trim();
          return (
            <Pressable
              key={cycle.id}
              onPress={() => handleCycleSelect(cycle.id)}
              style={[
                styles.tabBtn,
                isSelected && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
            >
              <ThemedText
                variant="label"
                color={isSelected ? '#FFFFFF' : 'textSecondary'}
                fontFamily={isSelected ? 'bold' : 'medium'}
                numberOfLines={1}
                style={{ letterSpacing: 0.2 }}
              >
                {shortName}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Active Cycle Programme Overview Card (PRD Cycle Management) */}
      {activeCycle && (
        <Card style={[styles.cycleCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <ThemedText variant="label" style={{ color: colors.primary, fontWeight: '700' }}>
                PROGRAMME SCHEDULE
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    (colors[STATUS_COLORS[activeCycle.status] as keyof typeof Colors.light] || colors.primary) + '18',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{
                  color:
                    colors[STATUS_COLORS[activeCycle.status] as keyof typeof Colors.light] || colors.primary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {STATUS_LABELS[activeCycle.status] || activeCycle.status}
              </ThemedText>
            </View>
          </View>

          <ThemedText variant="body" color="text" fontFamily="bold">
            {activeCycle.name}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['3xs'] }}>
            {activeCycle.description}
          </ThemedText>

          <View style={[styles.cycleMetaRow, { borderTopColor: colors.border + '50' }]}>
            <View style={styles.cycleMetaItem}>
              <ThemedText variant="caption" color="textMuted">Operational Window</ThemedText>
              <ThemedText variant="label" color="text" fontFamily="medium" style={{ marginTop: spacing['3xs'] }}>
                {activeCycle.startDate} → {activeCycle.endDate}
              </ThemedText>
            </View>
            <View style={[styles.cycleMetaItem, { alignItems: 'flex-end' }]}>
              <ThemedText variant="caption" color="textMuted">Cycle Contests</ThemedText>
              <ThemedText variant="label" color="primary" fontFamily="bold" style={{ marginTop: spacing['3xs'] }}>
                {elections.filter((e) => e.cycleId === activeCycle.id).length} Contests
              </ThemedText>
            </View>
          </View>
        </Card>
      )}

      {/* Search Input Bar */}
      <Input
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search contest, state, or jurisdiction..."
        leftIcon="search-outline"
        rightIcon={searchQuery ? 'close-circle' : undefined}
        onRightIconPress={() => setSearchQuery('')}
        containerStyle={{ marginBottom: 0 }}
      />

      {/* Position Filter Chips (Horizontal Scroll) */}
      <View style={styles.filterScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[{ key: ALL_POSITIONS, label: 'All Contests' }, ...positionFilters].map((f) => {
            const active = selectedPosition === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => handlePositionSelect(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceElevated,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  color={active ? '#FFFFFF' : 'textSecondary'}
                  fontFamily={active ? 'bold' : 'regular'}
                >
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Navigation Directory Row */}
      <View style={styles.quickLinksRow}>
        <Card
          pressable
          onPress={() => {
            impact(Haptics.ImpactFeedbackStyle.Light);
            router.push(ROUTES.PARTIES);
          }}
          style={[styles.quickLinkPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ionicons name="people-circle-outline" size={15} color={colors.primary} />
            <ThemedText variant="caption" color="text" fontFamily="medium" style={{ flex: 1, marginLeft: spacing['2xs'] + spacing['3xs'] }}>
              Political Parties
            </ThemedText>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
          </View>
        </Card>

        <Card
          pressable
          onPress={() => {
            impact(Haptics.ImpactFeedbackStyle.Light);
            router.push(ROUTES.LOCATIONS);
          }}
          style={[styles.quickLinkPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ionicons name="map-outline" size={15} color={colors.primary} />
            <ThemedText variant="caption" color="text" fontFamily="medium" style={{ flex: 1, marginLeft: spacing['2xs'] + spacing['3xs'] }}>
              Electoral Hierarchy
            </ThemedText>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
          </View>
        </Card>
      </View>

      {/* Loading Skeleton State */}
      {loading ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : filteredElections.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No Contests Found"
          subtitle={
            searchQuery.length > 0 || selectedPosition !== ALL_POSITIONS
              ? 'No elections match your current search or position filter.'
              : 'No elections scheduled in this cycle yet.'
          }
          actionLabel={searchQuery.length > 0 || selectedPosition !== ALL_POSITIONS ? 'Reset Filters' : undefined}
          onAction={() => {
            setSearchQuery('');
            setSelectedPosition(ALL_POSITIONS);
          }}
        />
      ) : null}

      {/* Contest Cards */}
      <View style={{ gap: spacing.sm }}>
        {filteredElections.map((election) => {
          const statusColorKey = STATUS_COLORS[election.status] || 'textSecondary';
          const statusColor = colors[statusColorKey as keyof typeof Colors.light] as string;
          const statusLabel = STATUS_LABELS[election.status] || election.status;

          return (
            <Card
              key={election.id}
              pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: ROUTES.ELECTION_DETAIL, params: { id: election.id } });
              }}
              style={[shadows.sm, styles.electionCard, { borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm }}>
                <View style={[styles.electionIcon, { backgroundColor: colors.primary + '16' }]}>
                  <ThemedText variant="xl" style={{ color: colors.primary, fontWeight: '800' }}>
                    {formatServerLabel(election.position).charAt(0)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="body" fontFamily="bold">
                    {formatServerLabel(election.position)}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['2xs'] }}>
                    {election.electoralArea} · {formatServerLabel(election.electoralAreaType)}
                  </ThemedText>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                    <ThemedText variant="caption" color="textMuted">
                       {election.electionDate}
                    </ThemedText>
                    <Badge label={statusLabel} color={statusColor} size="sm" />
                  </View>
                </View>
              </View>

              {/* Parties contesting, derived from this election's candidates */}
              <View style={[styles.cardFooter, { borderTopColor: colors.border + '50' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['2xs'], flex: 1, minWidth: 0 }}>
                  {(partiesByElection?.get(election.id) ?? []).slice(0, 4).map((acronym) => (
                    <Badge key={acronym} label={acronym} color={partyColor(acronym)} size="sm" />
                  ))}
                  <ThemedText variant="micro" color="textSecondary" style={{ marginLeft: spacing['2xs'], flexShrink: 1 }}>
                    {election.candidateCount} {election.candidateCount === 1 ? 'Candidate' : 'Candidates'}
                  </ThemedText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['3xs'], flexShrink: 0 }}>
                  <ThemedText variant="caption" color="primary" fontFamily="bold">
                    View Slate
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'web' ? spacing.screen.headerHeight + spacing['2xs'] : spacing.xs,
    paddingBottom: sizes.tabBarClearance,
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    padding: spacing['2xs'],
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  activeTabBtn: {
    ...shadows.sm,
  },
  cycleCard: {
    padding: spacing.md,
    borderWidth: border.thin,
    borderRadius: radius.md,
  },
  cycleMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: border.thin,
  },
  cycleMetaItem: {
    flex: 1,
    minWidth: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.thin,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.caption,
    paddingVertical: spacing['2xs'],
  },
  filterScrollContainer: {},
  filterScroll: {
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: border.thin,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickLinkPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  electionCard: {
    padding: spacing.md,
    borderWidth: border.thin,
    borderRadius: radius.md,
  },
  titleIndicator: {
    width: spacing['2xs'],
    height: spacing.md,
    borderRadius: radius.full,
  },
  electionIcon: {
    width: sizes.icon - (spacing['2xs'] + spacing['3xs']),
    height: sizes.icon - (spacing['2xs'] + spacing['3xs']),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: border.thin,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  partyPill: {
    paddingHorizontal: spacing['2xs'] + spacing['3xs'],
    paddingVertical: spacing['3xs'],
    borderRadius: radius.xs,
    borderWidth: border.thin,
  },
});

