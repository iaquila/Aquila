import React, { useState, useMemo, useCallback, memo } from 'react';
import { Alert, StyleSheet, View, ScrollView, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, EmptyState, Button, Card, SkeletonCard, Badge } from '@/core/components';
import { useIncidentsStore, useAuthStore, IncidentReport } from '@/features/auth/store';
import { getSeverityColor } from '@/constants/incidents';
import { ROUTES } from '@/constants/routes';
import { spacing, radius, shadows, border, sizes } from '@/constants/tokens';
import { listPerf } from '@/constants/lists';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useLiveIncidentCategoriesQuery, useLiveIncidentsQuery, useUpdateIncidentMutation } from '@/features/api/hooks';
import { incidentCategoryForName } from '@/features/api/mappers';
import { loadSession } from '@/core/services/session';
import { FEATURES } from '@/constants/features';
import { useRefreshControl, useForegroundRefresh, useHaptics } from '@/core/hooks';
import { formatServerLabel } from '@/core/utils/formatters';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const ALL_CATEGORIES = 'ALL';

type IncidentCardProps = {
  item: IncidentReport;
  colors: (typeof Colors)['light'];
  scheme: 'light' | 'dark';
  canTriage: boolean;
  isUpdating: boolean;
  impact: ReturnType<typeof useHaptics>['impact'];
  onUpdateStatus: (id: string, status: 'open' | 'close') => void;
};

// Memoized row: FlatList re-renders every row on each parent render unless
// rows are memo/Pure (VirtualizedList slow-update warning).
const IncidentCard = memo(function IncidentCard({ item, colors, scheme, canTriage, isUpdating, impact, onUpdateStatus }: IncidentCardProps) {
  const isHigh = item.severity === 'HIGH' || item.severity === 'CRITICAL';
  const isClosed = item.status === 'CLOSED';
  const statusLabel =
    item.status === 'CLOSED'
      ? 'CLOSED'
      : item.status === 'OPEN'
        ? 'OPEN'
        : item.status;
  const sevColor = getSeverityColor(item.severity, scheme);

  return (
    <Card
      pressable
      style={styles.incidentCard}
      onPress={() => {
        impact(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: ROUTES.INCIDENT_DETAIL, params: { id: item.id } });
      }}
    >
      {/* Severity & Status Header */}
      <View style={styles.cardHeader}>
        <Badge
          label={`${item.severity} SEVERITY`}
          color={sevColor}
          size="sm"
          icon={
            <Ionicons
              name={isHigh ? 'warning' : 'alert-circle-outline'}
              size={13}
              color={sevColor}
            />
          }
        />

        <Badge
          label={statusLabel}
          variant={isClosed ? 'success' : 'neutral'}
          size="sm"
        />
      </View>

      {/* Category & Description */}
      <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
        {formatServerLabel(item.category)}
      </ThemedText>
      <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['3xs'] }}>
        {item.description}
      </ThemedText>

      {/* Location & Metadata Tag */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.primary} />
          <ThemedText variant="label" color="primary" fontFamily="medium" style={{ marginLeft: spacing['2xs'] }}>
            {item.electoralArea || (item.pollingUnitId ? `PU ${item.pollingUnitId}` : 'Area unavailable')}
          </ThemedText>
        </View>

        {item.latitude && item.longitude ? (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={12} color={colors.textMuted} />
            <ThemedText variant="label" color="textMuted" style={{ marginLeft: spacing['2xs'] }}>
              {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
            </ThemedText>
          </View>
        ) : null}

        {item.mediaUrls?.length ? (
          <View style={styles.metaItem}>
            <Ionicons name="camera-outline" size={12} color={colors.accentDark} />
            <ThemedText variant="label" color="accent" style={{ marginLeft: spacing['2xs'] }}>
              {item.mediaUrls.length} live evidence
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Triage Actions: Officer Only (Audio Part 4 & 7) */}
      <View style={styles.cardActionsRow}>
        <ThemedText variant="label" color="textMuted">
          {new Date(item.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>

        {canTriage ? (
          <Button
            label={isClosed ? 'Reopen' : 'Close'}
            variant={isClosed ? 'outline' : 'primary'}
            size="sm"
            leftIcon={isClosed ? 'refresh-outline' : 'checkmark-circle-outline'}
            loading={isUpdating}
            onPress={() => onUpdateStatus(item.id, isClosed ? 'open' : 'close')}
          />
        ) : (
          <View style={[styles.fieldAgentPill, { backgroundColor: isClosed ? colors.successSubtle : colors.warningSubtle }]}>
            <ThemedText
              variant="label"
              color={isClosed ? 'success' : 'warning'}
              fontFamily="bold"
            >
              {statusLabel}
            </ThemedText>
          </View>
        )}
      </View>
    </Card>
  );
});

export default function IncidentsScreen() {
  const { data: apiIncidents = [], isLoading: loading, refetch: refetchIncidents } = useLiveIncidentsQuery(
    FEATURES.ENABLE_LIVE_POLLING ? 30_000 : undefined
  );
  const { incidents: storeIncidents, updateIncident: updateLocalIncident } = useIncidentsStore();
  const { user } = useAuthStore();
  const { data: liveCategories = [] } = useLiveIncidentCategoriesQuery();
  const updateIncidentMutation = useUpdateIncidentMutation();
  // PATCH /incident/edit admits field and polling-unit agents only, and refuses a
  // tenant admin. Demo accounts have no session, so their edits stay on device.
  const canTriage = user?.role === 'FIELD_AGENT' || user?.role === 'POLLING_AGENT';
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');

  // Chips come from the live category list, so a category the server adds shows
  // up without a code change. Names map to the app enum through the one mapper
  // that owns that translation; names it does not know fall under OTHER.
  const categoryFilters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const category of liveCategories) {
      const key = incidentCategoryForName(category.name) ?? 'OTHER';
      if (key !== 'OTHER' && !seen.has(key)) seen.set(key, category.name);
    }
    return [
      { key: ALL_CATEGORIES, label: 'All' },
      ...[...seen.entries()].map(([key, name]) => ({ key, label: name })),
    ];
  }, [liveCategories]);

  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });
  const { refreshControl } = useRefreshControl(loading, refetchIncidents);
  useForegroundRefresh([['incidents', 'live']], 5 * 60 * 1000);
  const { impact } = useHaptics();

  // Combine store incidents with API incidents
  const allIncidents = useMemo(() => {
    const ids = new Set(storeIncidents.map((i) => i.id));
    const remoteUnique = apiIncidents.filter((i) => !ids.has(i.id));
    return [...storeIncidents, ...remoteUnique];
  }, [storeIncidents, apiIncidents]);

  // Filter by category and resolution status (Audio Part 4 & 7)
  const filtered = useMemo(() => {
    return allIncidents.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'RESOLVED'
            ? item.status === 'RESOLVED' || item.status === 'CLOSED'
            : item.status !== 'RESOLVED' && item.status !== 'CLOSED';
      return matchCat && matchStatus;
    });
  }, [allIncidents, selectedCategory, statusFilter]);

  const handleUpdateStatus = useCallback(
    async (id: string, next: 'open' | 'close') => {
      impact(Haptics.ImpactFeedbackStyle.Medium);
      if (!(await loadSession())) {
        updateLocalIncident(id, { status: next === 'close' ? 'CLOSED' : 'OPEN' });
        return;
      }
      const incidentId = Number(id);
      if (!Number.isFinite(incidentId)) return;
      try {
        await updateIncidentMutation.mutateAsync({ id: incidentId, status: next });
      } catch (error) {
        if (__DEV__) console.warn('[incident] status update failed', error);
        Alert.alert('Status not saved', 'The incident could not be updated. Check your connection and try again.');
      }
    },
    [impact, updateIncidentMutation, updateLocalIncident]
  );

  const renderIncidentCard = useCallback(({ item }: { item: IncidentReport }) => (
    <IncidentCard
      item={item}
      colors={colors}
      scheme={scheme}
      canTriage={canTriage}
      isUpdating={updateIncidentMutation.isPending}
      impact={impact}
      onUpdateStatus={handleUpdateStatus}
    />
  ), [canTriage, colors, scheme, handleUpdateStatus, impact, updateIncidentMutation.isPending]);

  return (
    <ScreenView scrollable={false} noScrollPadding>
      <View style={styles.container}>
        {/* Top Control Bar with File Incident CTA */}
        <View style={styles.topControlBar}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" color="text" fontFamily="bold">
              Incident Control Room
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              {allIncidents.length} total logged incidents across operational sectors
            </ThemedText>
          </View>

          <Button
            label="+ File Incident"
            variant="primary"
            size="sm"
            onPress={() => {
              impact(Haptics.ImpactFeedbackStyle.Medium);
              router.push(ROUTES.INCIDENT_REPORT);
            }}
          />
        </View>

        {/* Status Filter Toggle: All vs Unresolved vs Resolved (Audio Part 4) */}
        <View style={[styles.statusToggleBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {(['ALL', 'UNRESOLVED', 'RESOLVED'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(s);
              }}
              style={[
                styles.statusToggleBtn,
                statusFilter === s && [styles.activeStatusToggle, { backgroundColor: colors.primary }],
              ]}
            >
              <ThemedText
                variant="caption"
                color={statusFilter === s ? '#FFFFFF' : 'textSecondary'}
                fontFamily={statusFilter === s ? 'bold' : 'medium'}
              >
                {s}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Category Filter Chips Horizontal Scroll (Audio Part 4) */}
        <View style={styles.catChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScrollContent}
          >
            {categoryFilters.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color={active ? '#FFFFFF' : 'textSecondary'}
                    fontFamily={active ? 'bold' : 'regular'}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Native FlatList */}
        <FlatList
          {...listPerf}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderIncidentCard}
          refreshControl={refreshControl}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            loading ? (
              <View style={{ gap: spacing.sm }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="No Incidents Reported"
                subtitle="All polling units in this category are operating normally without security disruption."
                actionLabel="+ Report Incident"
                onAction={() => router.push(ROUTES.INCIDENT_REPORT)}
              />
            )
          }
        />
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  statusToggleBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing['3xs'],
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  activeStatusToggle: {
    ...shadows.sm,
  },
  catChipsWrapper: {
    paddingVertical: spacing.xs,
  },
  catScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing['2xs'] + spacing['3xs'],
  },
  catChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.full,
    borderWidth: border.thin,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: sizes.tabBarClearance,
  },
  incidentCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['3xs'],
    borderRadius: radius.full,
    borderWidth: border.thin,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['3xs'],
    borderRadius: radius.full,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: border.thin,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: border.thin,
    borderTopColor: 'rgba(0,0,0,0.04)',
    gap: spacing.xs,
  },
  fieldAgentPill: {
    paddingHorizontal: spacing.sm - spacing['3xs'],
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
  },
});
