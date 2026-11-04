import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { DebouncedPressable } from '@/core/components/DebouncedPressable';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, Card, LiveStreamMarquee, Shimmer, SkeletonCard, ExpandableText, Input, Badge, SectionHeader, EmptyState } from '@/core/components';
import type { MarqueeItem } from '@/core/components';
import { EntranceView } from '@/core/components/EntranceView';
import { useAuthStore, useResultsStore } from '@/features/auth/store';
import { ROUTES } from '@/constants/routes';
import { spacing, radius, shadows, border, typography, sizes } from '@/constants/tokens';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import {
  useLiveElectionsQuery,
  useLiveCandidatesQuery,
  useLiveIncidentsQuery,
  useLiveTenantPartyQuery,
} from '@/features/api/hooks';
import { useAIProjectionQuery, useLocationSearchQuery } from '@/features/elections/hooks';
import { useRefreshControl, useHaptics, useForegroundRefresh } from '@/core/hooks';
import { formatServerLabel } from '@/core/utils/formatters';
import Colors from '@/constants/colors';
import { partyColor } from '@/constants/parties';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ROLE_LABELS } from '@/constants/roles';
import { FEATURES } from '@/constants/features';


export default function DashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });

  const { data: elections = [], isLoading: electionsLoading, refetch: refetchElections } = useLiveElectionsQuery();
  const { data: incidents = [], isLoading: incidentsLoading, refetch: refetchIncidents } = useLiveIncidentsQuery(
    FEATURES.ENABLE_LIVE_POLLING ? 30_000 : undefined
  );
  const { data: tenantParty } = useLiveTenantPartyQuery();
  const { user } = useAuthStore();
  const { submissions } = useResultsStore();
  const { impact } = useHaptics();

  const isElectionOfficer = user?.role === 'ELECTION_OFFICER';
  const isPollingAgent = user?.role === 'POLLING_AGENT';
  const isAgent = isPollingAgent || user?.role === 'FIELD_AGENT';

  // Agents see their own identity instead of the Situation Room brand.
  const headerIdentityLabel =
    user?.role && isAgent ? ROLE_LABELS[user.role] : (user?.organizationName ?? 'iAQUILA Situation Room');

  // Active drafts count from persistent store (Audio Part 3)
  const draftSubmissions = useMemo(() => {
    return submissions.filter((s) => s.status === 'DRAFT');
  }, [submissions]);

  // The console reports on the contest the server publishes with a slate, falling
  // back to the first one when none has candidates yet.
  const activeElection = useMemo(
    () => elections.find((e) => e.candidateCount > 0) ?? elections[0] ?? null,
    [elections]
  );
  const { data: candidates = [], isLoading: candidatesLoading } = useLiveCandidatesQuery(activeElection?.id);

  // The pinned candidate is the one fielded by the tenant's own party, as the
  // server reports it. There is no local watch list and no hardcoded id.
  const { myCandidate, otherCandidates } = useMemo(() => {
    const list = candidates;
    const mine = tenantParty
      ? list.find((c) => c.partyAcronym.toUpperCase() === tenantParty.acronym.toUpperCase())
      : undefined;
    if (!mine) return { myCandidate: list[0] ?? null, otherCandidates: list.slice(1, 4) };
    return { myCandidate: mine, otherCandidates: list.filter((c) => c.id !== mine.id).slice(0, 3) };
  }, [candidates, tenantParty]);

  // AI projection: the endpoint is still being built, so this block keeps its
  // shape and reads from the projection source until the route lands.
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [pastDataEnum, setPastDataEnum] = useState<0 | 1 | 2>(0);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string; qualification: string } | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const currentDataSwitch = true;

  // Start the projection on the server's pinned candidate rather than a local id.
  useEffect(() => {
    if (!selectedCandidateId && myCandidate) setSelectedCandidateId(myCandidate.id);
  }, [myCandidate, selectedCandidateId]);

  const { data: searchResults = [], isLoading: searchingLocations } = useLocationSearchQuery(locationSearchQuery);

  const { data: projection } = useAIProjectionQuery({
    candidateId: selectedCandidateId,
    currentData: currentDataSwitch,
    pastData: pastDataEnum,
    locationId: selectedLocation?.id,
    locationText: selectedLocation ? `${selectedLocation.name}, ${selectedLocation.qualification}` : undefined,
  });

  const { refreshControl } = useRefreshControl(
    electionsLoading || incidentsLoading,
    () => Promise.all([refetchElections(), refetchIncidents()])
  );
  useForegroundRefresh([['catalogue'], ['incidents', 'live']], 5 * 60 * 1000);

  // Incidents are the only live feed: no results endpoint exists, so nothing is
  // synthesised from local submissions.
  const liveFeedItems = useMemo<MarqueeItem[]>(
    () =>
      incidents.slice(0, 8).map((i) => ({
        id: i.id,
        kind: 'incident',
        label: formatServerLabel(i.category),
        area: i.electoralArea || (i.pollingUnitId ? `PU ${i.pollingUnitId}` : ''),
        detail: i.description.slice(0, 48),
        timestamp: i.reportedAt,
      })),
    [incidents]
  );

  if (electionsLoading && !activeElection) {
    return (
      <ScreenView scrollable={false} contentContainerStyle={styles.scrollContent}>
        {/* Situation Console Header Skeleton */}
        <View style={[styles.consoleHeader, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.md, gap: spacing.sm }]}>
          <Shimmer width={180} height={12} borderRadius={radius.sm} />
          <Shimmer width="60%" height={24} borderRadius={radius.sm} style={{ marginTop: spacing['2xs'] }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
            <Shimmer width="28%" height={32} borderRadius={radius.sm} />
            <Shimmer width="28%" height={32} borderRadius={radius.sm} />
            <Shimmer width="28%" height={32} borderRadius={radius.sm} />
          </View>
        </View>

        {/* Contest Skeleton Cards */}
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </View>
      </ScreenView>
    );
  }

  return (
    <ScreenView
      scrollable
      refreshControl={refreshControl}
      contentContainerStyle={styles.scrollContent}
    >
      {/* 1. Station Console Header */}
      <EntranceView delay={50}>
        <View style={[styles.consoleHeader, { borderColor: colors.border }]}>
          <View>
            <View style={[styles.orgTagRow, { flex: 1, minWidth: 0, marginBottom: spacing['3xs'], marginRight: 0 }]}>
              <View style={[styles.orgDot, { backgroundColor: colors.primary, flexShrink: 0 }]} />
              <ThemedText variant="label" color="primary" fontFamily="bold" style={{ flexShrink: 1, textTransform: 'none' }} accessibilityLabel={headerIdentityLabel}>
                {headerIdentityLabel}
              </ThemedText>
            </View>

            <ThemedText variant="title" color="text" fontFamily="bold" style={{ marginTop: spacing['3xs'] }}>
              {activeElection ? formatServerLabel(activeElection.position) : 'No Active Contest'}
            </ThemedText>
            {activeElection ? (
              <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['3xs'] }}>
                {activeElection.electoralArea} · {activeElection.electionDate}
              </ThemedText>
            ) : null}
          </View>

          {/* Contesting candidates, as the server counts them */}
          {activeElection ? (
            <View style={styles.tickerStatsRow}>
              <View style={styles.tickerStatItem}>
                <ThemedText variant="caption" color="textMuted">CANDIDATES</ThemedText>
                <ThemedText variant="h3" color="primary" fontFamily="bold">
                  {activeElection.candidateCount}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      </EntranceView>

      {/* 2. Drafts Alert Banner (Audio Part 3) */}
      {!isElectionOfficer && draftSubmissions.length > 0 && (
        <EntranceView delay={100}>
          <Card
            pressable
            onPress={() => {
              impact(Haptics.ImpactFeedbackStyle.Medium);
              router.push(ROUTES.RESULT_DRAFTS);
            }}
            style={[styles.draftAlertCard, { backgroundColor: colors.warningSubtle, borderColor: colors.warning }]}
          >
            <View style={styles.draftAlertContent}>
              <View style={[styles.draftAlertIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="document-text" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" color="text" fontFamily="bold">
                  {draftSubmissions.length} Pending Result Draft{draftSubmissions.length > 1 ? 's' : ''}
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  You have saved drafts awaiting review and final publication.
                </ThemedText>
              </View>
              <View style={[styles.actionPill, { backgroundColor: colors.warning }]}>
                <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">
                  Resume
                </ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
          </Card>
        </EntranceView>
      )}

      {/* 3. Contesting Candidates (live slate; tallies await the results feed) */}
      {!isPollingAgent && (
        <EntranceView delay={150}>
          <Card style={styles.sectionCard}>
            <SectionHeader
              title="Contesting Candidates"
              subtitle={
                activeElection
                  ? `${formatServerLabel(activeElection.position)} · ${activeElection.electoralArea}`
                  : 'No active contest is published yet'
              }
            />

            {candidatesLoading ? (
              <SkeletonCard lines={3} />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Candidates Filed"
                subtitle="The server has not published any candidates for this contest."
              />
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {myCandidate ? (
                  <View style={[styles.candidateRowCard, { borderColor: colors.primary, borderWidth: border.thick }]}>
                    <View style={styles.candHeader}>
                      <View style={styles.candLeft}>
                        <View style={[styles.rankTag, { backgroundColor: partyColor(myCandidate.partyAcronym) }]}>
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">
                            {myCandidate.partyAcronym.slice(0, 2)}
                          </ThemedText>
                        </View>
                        <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['2xs'] + spacing['3xs'], flexWrap: 'wrap' }}>
                            <ThemedText variant="body" color="text" fontFamily="bold">
                              {myCandidate.fullName}
                            </ThemedText>
                            <View style={[styles.myCandidatePill, { backgroundColor: colors.primarySubtle }]}>
                              <ThemedText variant="label" color="primary" fontFamily="bold">
                                {tenantParty ? tenantParty.acronym : 'MY PARTY'}
                              </ThemedText>
                            </View>
                          </View>
                          <View style={styles.partyBadgeRow}>
                            <Badge label={myCandidate.partyAcronym} color={partyColor(myCandidate.partyAcronym)} size="sm" />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}

                {otherCandidates.map((cand) => (
                  <View key={cand.id} style={[styles.candidateRowCard, { borderColor: colors.border }]}>
                    <View style={styles.candHeader}>
                      <View style={styles.candLeft}>
                        <View style={[styles.rankTag, { backgroundColor: partyColor(cand.partyAcronym) }]}>
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">
                            {cand.partyAcronym.slice(0, 2)}
                          </ThemedText>
                        </View>
                        <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                          <ThemedText variant="body" color="text" fontFamily="bold">
                            {cand.fullName}
                          </ThemedText>
                          <View style={styles.partyBadgeRow}>
                            <Badge label={cand.partyAcronym} color={partyColor(cand.partyAcronym)} size="sm" />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                <ThemedText variant="caption" color="textMuted" style={{ marginTop: spacing['2xs'] }}>
                  Vote tallies will appear here once the results feed is available.
                </ThemedText>
              </View>
            )}
          </Card>
        </EntranceView>
      )}

      {/* 4. AI Election Projection Engine (Officers only - Hidden for Field Agent and Polling Agent) */}
      {isElectionOfficer && (
        <EntranceView delay={200}>
          <Card style={[styles.aiCard, { borderColor: colors.primary }]}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiTitleBlock}>
              <View style={[styles.aiIconBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: spacing.xs }}>
                <ThemedText variant="title" color="text" fontFamily="bold">
                  iAQUILA AI Projection
                </ThemedText>
                <ThemedText variant="label" color="primary" fontFamily="medium">
                  NEURAL ELECTION SIMULATION MODEL
                </ThemedText>
              </View>
            </View>

            {projection && (
              <View style={[styles.probBadge, { backgroundColor: colors.primarySubtle }]}>
                <ThemedText variant="caption" color="primary" fontFamily="bold">
                  {projection.winProbability}% Win Prob
                </ThemedText>
              </View>
            )}
          </View>

          {/* Candidate Switcher Chips */}
          <ThemedText variant="label" color="textSecondary" fontFamily="bold" style={{ marginTop: spacing.sm, marginBottom: spacing['2xs'] }}>
            SELECT CANDIDATE TO PROJECT
          </ThemedText>
          <View style={styles.candChipsRow}>
            {candidates.map((c) => {
              const active = selectedCandidateId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCandidateId(c.id);
                  }}
                  style={[
                    styles.candChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color={active ? '#FFFFFF' : 'text'}
                    fontFamily={active ? 'bold' : 'regular'}
                  >
                    {c.shortName ?? c.fullName.split(' ')[0]} ({c.partyAcronym})
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Historical Baseline Dataset Tabs (Audio Part 9: 0: 2023, 1: 2019, 2: Combined) */}
          <ThemedText variant="label" color="textSecondary" fontFamily="bold" style={{ marginTop: spacing.sm, marginBottom: spacing['2xs'] }}>
            HISTORICAL BASELINE DATASET
          </ThemedText>
          <View style={styles.datasetTabs}>
            {[
              { enumVal: 0 as const, label: '2023 Election' },
              { enumVal: 1 as const, label: '2019 Election' },
              { enumVal: 2 as const, label: 'Combined 19+23' },
            ].map((tab) => {
              const active = pastDataEnum === tab.enumVal;
              return (
                <Pressable
                  key={tab.enumVal}
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setPastDataEnum(tab.enumVal);
                  }}
                  style={[
                    styles.datasetTab,
                    {
                      backgroundColor: active ? colors.primarySubtle : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color={active ? 'primary' : 'textSecondary'}
                    fontFamily={active ? 'bold' : 'regular'}
                  >
                    {tab.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Location Scope Search & Dropdown Autocomplete (Audio Part 8) */}
          <View style={{ marginTop: spacing.sm, zIndex: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xs'] + spacing['3xs'] }}>
              <ThemedText variant="label" color="textSecondary" fontFamily="bold">
                GEOGRAPHIC PROJECTION SCOPE
              </ThemedText>
              {selectedLocation && (
                <Pressable
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLocation(null);
                    setLocationSearchQuery('');
                    setShowLocationDropdown(false);
                  }}
                >
                  <ThemedText variant="label" color="primary" fontFamily="bold">
                    Reset to National
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Active Selected Location Scope Banner */}
            {selectedLocation && (
              <View
                style={[
                  styles.activeScopeBox,
                  {
                    backgroundColor: colors.primarySubtle + '40',
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="location" size={16} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="caption" color="text" fontFamily="bold">
                    {selectedLocation.name}
                  </ThemedText>
                  <ThemedText variant="label" color="textSecondary">
                    {selectedLocation.qualification}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLocation(null);
                    setLocationSearchQuery('');
                    setShowLocationDropdown(false);
                  }}
                  hitSlop={spacing.xs}
                  style={{ padding: spacing['2xs'] }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* Search Input Box using shared Input */}
            <Input
              value={locationSearchQuery}
              onChangeText={(text) => {
                setLocationSearchQuery(text);
                setShowLocationDropdown(true);
              }}
              onFocus={() => setShowLocationDropdown(true)}
              placeholder="Search State, LGA, Ward, or PU to simulate..."
              leftIcon="search-outline"
              rightIcon={locationSearchQuery ? 'close-circle' : undefined}
              onRightIconPress={() => {
                setLocationSearchQuery('');
                setShowLocationDropdown(false);
              }}
              containerStyle={{ marginBottom: spacing['2xs'] }}
            />

            {/* Dropdown Results Box */}
            {showLocationDropdown && (
              <View style={[styles.locDropdown, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                {!locationSearchQuery.trim() && (
                  <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing['2xs'] + spacing['3xs'], backgroundColor: colors.borderSubtle }}>
                    <ThemedText variant="label" color="textSecondary" fontFamily="bold">
                      FEATURED / POPULAR SCOPES
                    </ThemedText>
                  </View>
                )}
                {searchingLocations ? (
                  <View style={{ padding: spacing.sm, gap: spacing.xs }}>
                    <Shimmer width="70%" height={12} borderRadius={radius.sm} />
                    <Shimmer width="45%" height={10} borderRadius={radius.sm} />
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={{ padding: spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color="textSecondary">
                      No matching locations found.
                    </ThemedText>
                  </View>
                ) : (
                  searchResults.slice(0, 6).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedLocation({ id: item.id, name: item.name, qualification: item.qualification });
                        setLocationSearchQuery('');
                        setShowLocationDropdown(false);
                      }}
                      style={[styles.locDropdownItem, { borderBottomColor: colors.borderSubtle }]}
                    >
                      <View style={[styles.locTypeBadge, { backgroundColor: colors.primaryLight + '22' }]}>
                        <ThemedText variant="label" color="primary" fontFamily="bold">
                          {item.type}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.xs }}>
                        <ThemedText variant="body" color="text" fontFamily="bold">
                          {item.name}
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['3xs'] }}>
                          {item.qualification}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          {/* AI Projection Output Metrics */}
          {projection && (
            <View style={[styles.aiMetricsBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {/* Location Scope Banner */}
              <View style={[styles.scopeBanner, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <ThemedText variant="caption" color="textSecondary" style={{ flex: 1, marginLeft: spacing['2xs'] }}>
                  Scope: <ThemedText variant="caption" color="text" fontFamily="bold">{projection.locationScope}</ThemedText>
                </ThemedText>
              </View>

              <View style={styles.aiMetricRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="textSecondary">PROJECTED SHARE</ThemedText>
                  <ThemedText variant="h2" color="primary" fontFamily="bold">
                    {projection.projectedVoteShare}%
                  </ThemedText>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <ThemedText variant="caption" color="textSecondary">HISTORICAL PARTY</ThemedText>
                  <ThemedText variant="body" color="text" fontFamily="bold">
                    {projection.historicalParty}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.insightBox, { backgroundColor: colors.primarySubtle + '40', borderColor: colors.primary + '25' }]}>
                <Ionicons name="analytics-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing['2xs'] + spacing['3xs'] }}>
                  <ExpandableText variant="caption" color="text" collapsedLines={3}>
                    {projection.keyInsights[0] ?? ''}
                  </ExpandableText>
                </View>
              </View>

              {/* Mandatory AI Disclaimer (Audio Part 8) */}
              <View style={styles.disclaimerRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <ThemedText variant="label" color="textMuted" style={{ flex: 1, marginLeft: spacing['2xs'] }}>
                  {projection.disclaimer}
                </ThemedText>
              </View>
            </View>
          )}
        </Card>
      </EntranceView>
      )}

      {/* 5. Assigned Polling Units (PRD: PU Agent = 1 PU, Field Agent = 3 PUs, Officer = Supervisory) */}
      <EntranceView delay={250}>
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Polling Unit Assignments"
            subtitle={
              isPollingAgent
                ? 'Polling unit agent assignment'
                : isElectionOfficer
                  ? 'Supervisory overview'
                  : 'Your field jurisdiction'
            }
            action={
              <DebouncedPressable
                onPress={() => {
                  impact(Haptics.ImpactFeedbackStyle.Light);
                  router.push(ROUTES.LOCATIONS);
                }}
                style={styles.viewAllBtn}
              >
                <ThemedText variant="caption" color="primary" fontFamily="bold">
                  View All
                </ThemedText>
              </DebouncedPressable>
            }
          />

          {/* Assignments come from a polling-unit endpoint that does not exist yet,
              so nothing is invented here. The section stays for when it lands. */}
          <EmptyState
            icon="location-outline"
            title="Assignments Not Available Yet"
            subtitle="Polling unit assignments are not yet exposed by the control room. You can still file an incident with a unit id."
            actionLabel="Browse Locations"
            onAction={() => {
              impact(Haptics.ImpactFeedbackStyle.Light);
              router.push(ROUTES.LOCATIONS);
            }}
          />
        </View>
      </EntranceView>

      {/* 6. Quick Actions Grid */}
      <EntranceView delay={300}>
        <View style={styles.quickGrid}>
          <View style={styles.quickRow}>
            {isElectionOfficer ? (
              <Card
                pressable
                onPress={() => {
                  impact(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(ROUTES.RESULT_SEARCH);
                }}
                style={[styles.quickCard, { borderColor: colors.border }]}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="search" size={22} color={colors.primary} />
                </View>
                <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
                  Search Results
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  Audit returns
                </ThemedText>
              </Card>
            ) : (
              <Card
                pressable
                onPress={() => {
                  impact(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(ROUTES.RESULT_SUBMIT);
                }}
                style={[styles.quickCard, { borderColor: colors.border }]}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                </View>
                <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
                  Enter Results
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  PU ballot return
                </ThemedText>
              </Card>
            )}

            <Card
              pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push(ROUTES.INCIDENT_REPORT);
              }}
              style={[styles.quickCard, { borderColor: colors.border }]}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: colors.critical + '18' }]}>
                <Ionicons name="warning" size={22} color={colors.critical} />
              </View>
              <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
                Report Incident
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Live covert filing
              </ThemedText>
            </Card>
          </View>

          {/* Collation & Locations are Situation Room surfaces - not part of the field agent workflow */}
          {isElectionOfficer && (
          <View style={styles.quickRow}>
            <Card
              pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push(ROUTES.RESULT_COLLATION);
              }}
              style={[styles.quickCard, { borderColor: colors.border }]}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: colors.accent + '18' }]}>
                <Ionicons name="bar-chart" size={22} color={colors.accentDark} />
              </View>
              <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
                Collation Room
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Wards & LGA summary
              </ThemedText>
            </Card>

            <Card
              pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push(ROUTES.LOCATIONS);
              }}
              style={[styles.quickCard, { borderColor: colors.border }]}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="map" size={22} color={colors.primary} />
              </View>
              <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: spacing.xs }}>
                Locations
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                National registry
              </ThemedText>
            </Card>
          </View>
          )}
        </View>
      </EntranceView>

      {/* 7. Live feed: incidents (agents) or incidents + published returns (Situation Room) */}
      {liveFeedItems.length > 0 && (
        <EntranceView delay={350}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <ThemedText variant="title" color="text" fontFamily="bold">
                  {isElectionOfficer ? 'Live Situation Feed' : 'Field Incident Stream'}
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  {isElectionOfficer
                    ? `${incidents.length} incidents in the live feed`
                    : `${incidents.length} security & logistical issues logged`}
                </ThemedText>
              </View>
              <DebouncedPressable
                onPress={() => {
                  impact(Haptics.ImpactFeedbackStyle.Light);
                  router.push(ROUTES.INCIDENTS_TAB);
                }}
                style={styles.viewAllBtn}
              >
                <ThemedText variant="caption" color="primary" fontFamily="bold">
                  View All
                </ThemedText>
              </DebouncedPressable>
            </View>
            <View style={{ marginTop: spacing.xs }}>
              <LiveStreamMarquee items={liveFeedItems} />
            </View>
          </Card>
        </EntranceView>
      )}
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: sizes.tabBarClearance,
    gap: spacing.md,
  },
  consoleHeader: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.thin,
    backgroundColor: 'rgba(13, 99, 56, 0.04)',
    ...Platform.select<object>({
      ios: shadows.sm,
      android: { elevation: 0 },
    }),
  },
  consoleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  orgTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'] + spacing['3xs'],
  },
  orgDot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.full,
  },
  tickerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: border.thin,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  tickerStatItem: {
    flex: 1,
  },
  draftAlertCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.thick,
    ...shadows.md,
  },
  draftAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftAlertIcon: {
    width: sizes.rankBadge + spacing.xs,
    height: sizes.rankBadge + spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.full,
    gap: spacing['2xs'],
  },
  sectionContainer: {
    marginBottom: spacing.xs,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  scoreSourceToggle: {
    flexDirection: 'row',
    padding: spacing['3xs'],
    borderRadius: radius.full,
    borderWidth: border.thin,
    marginTop: spacing.sm,
  },
  scoreSourceItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.full,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sectionHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  viewAllBtn: {
    flexShrink: 0,
    paddingVertical: spacing['2xs'],
    paddingHorizontal: spacing['2xs'] + spacing['3xs'],
  },
  candidateRowCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  candHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  candLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  rankTag: {
    width: sizes.rankBadge - spacing['2xs'],
    height: sizes.rankBadge - spacing['2xs'],
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing['3xs'],
  },
  partyPill: {
    paddingHorizontal: spacing['2xs'] + spacing['3xs'],
    paddingVertical: spacing['3xs'],
    borderRadius: radius.xs,
  },
  progressBarTrack: {
    height: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  aiCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.thick,
    ...shadows.md,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  aiTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  aiIconBadge: {
    width: sizes.rankBadge,
    height: sizes.rankBadge,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  probBadge: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
  },
  candChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2xs'] + spacing['3xs'],
  },
  candChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
    borderWidth: border.thin,
  },
  datasetTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2xs'] + spacing['3xs'],
  },
  datasetTab: {
    flex: 1,
    minWidth: sizes.avatar + spacing['3xs'],
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    paddingHorizontal: spacing['2xs'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: border.thin,
  },
  myCandidatePill: {
    paddingHorizontal: spacing['2xs'] + spacing['3xs'],
    paddingVertical: spacing['3xs'],
    borderRadius: radius.full,
  },
  winnerMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xs'] + border.thin,
    paddingVertical: spacing['3xs'],
    borderRadius: radius.full,
  },
  aiMetricsBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  aiMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    marginTop: spacing.xs,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  puCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
    overflow: 'hidden',
  },
  puTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  puStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
    flexShrink: 0,
  },
  puBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: border.thin,
    gap: spacing.xs,
  },
  puActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm - spacing['3xs'],
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
    gap: spacing['3xs'],
    flexShrink: 0,
  },
  quickGrid: {
    gap: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.thin,
    ...shadows.sm,
  },
  quickIconWrap: {
    width: sizes.icon - spacing['2xs'],
    height: sizes.icon - spacing['2xs'],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  activeScopeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: border.thin,
    marginBottom: spacing.xs,
  },
  locSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: border.thin,
    gap: spacing.xs,
  },
  locTextInput: {
    flex: 1,
    fontSize: typography.caption,
    padding: 0,
  },
  locDropdown: {
    marginTop: spacing['2xs'],
    borderRadius: radius.md,
    borderWidth: border.thin,
    overflow: 'hidden',
    ...shadows.md,
  },
  locDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + spacing['3xs'],
    borderBottomWidth: border.thin,
  },
  locTypeBadge: {
    paddingHorizontal: spacing['2xs'] + spacing['3xs'],
    paddingVertical: spacing['3xs'],
    borderRadius: radius.xs,
  },
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.sm,
    borderWidth: border.thin,
    marginBottom: spacing.xs,
  },
});
