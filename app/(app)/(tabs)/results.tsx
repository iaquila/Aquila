import React, { useState, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, Pressable, FlatList, ScrollView, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, Card, EmptyState, Button, SkeletonCard } from '@/core/components';
import { ROUTES } from '@/constants/routes';
import { spacing, radius, shadows, border, typography } from '@/constants/tokens';
import { listPerf } from '@/constants/lists';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useResultsQuery, useCandidatesQuery } from '@/features/elections/hooks';
import { useRefreshControl, useForegroundRefresh, useHaptics } from '@/core/hooks';
import Colors from '@/constants/colors';
import { PARTY_COLORS } from '@/constants/parties';
import { useResultsStore, useAuthStore, ResultSubmission, Candidate } from '@/features/auth/store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path, G, Circle, Rect, Text as SvgText } from 'react-native-svg';
import {
  NIGERIA_STATE_GEOMETRIES,
  NIGERIA_MAP_VIEWBOX,
  NIGERIA_RIVERS,
  NigeriaStateGeometry,
} from '@/constants/nigeriaMapData';
import {
  NIGERIA_OFFICIAL_LGAS,
  getOfficialLgasForState,
  TOTAL_OFFICIAL_LGAS_COUNT,
} from '@/constants/nigeriaLgasData';

const LGA_MAP_POLYGONS: Record<string, { path: string; labelX: number; labelY: number; label: string }> = {
  // Lagos LGAs (Scoped to 380x250 viewport)
  'lga-alimosho': {
    path: 'M 30 45 L 125 35 L 135 110 L 70 130 L 25 95 Z',
    labelX: 75,
    labelY: 80,
    label: 'Alimosho',
  },
  'lga-ikeja': {
    path: 'M 125 35 L 220 30 L 225 100 L 135 110 Z',
    labelX: 172,
    labelY: 65,
    label: 'Ikeja',
  },
  'lga-kosofe': {
    path: 'M 220 30 L 345 25 L 355 105 L 225 100 Z',
    labelX: 285,
    labelY: 62,
    label: 'Kosofe',
  },
  'lga-mainland': {
    path: 'M 135 110 L 225 100 L 230 160 L 150 170 Z',
    labelX: 180,
    labelY: 132,
    label: 'Mainland',
  },
  'lga-surulere': {
    path: 'M 70 130 L 150 170 L 135 210 L 55 180 Z',
    labelX: 102,
    labelY: 170,
    label: 'Surulere',
  },
  'lga-etiosa': {
    path: 'M 150 170 L 230 160 L 360 145 L 355 195 L 240 205 L 135 210 Z',
    labelX: 250,
    labelY: 178,
    label: 'Eti-Osa',
  },
  // Kano LGAs (Scoped to 380x250 viewport)
  'lga-fagge': {
    path: 'M 40 40 L 195 40 L 180 128 L 40 128 Z',
    labelX: 115,
    labelY: 82,
    label: 'Fagge',
  },
  'lga-tarauni': {
    path: 'M 195 40 L 340 40 L 340 128 L 180 128 Z',
    labelX: 260,
    labelY: 82,
    label: 'Tarauni',
  },
  'lga-nassarawa-kn': {
    path: 'M 40 128 L 340 128 L 320 215 L 60 215 Z',
    labelX: 190,
    labelY: 170,
    label: 'Nassarawa',
  },
  // Rivers LGAs (Scoped to 380x250 viewport)
  'lga-obio-akpor': {
    path: 'M 45 45 L 335 45 L 335 125 L 45 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Obio-Akpor',
  },
  'lga-phalga': {
    path: 'M 45 125 L 335 125 L 310 210 L 70 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'Port Harcourt',
  },
  // FCT Councils (Scoped to 380x250 viewport)
  'lga-bwari': {
    path: 'M 50 45 L 330 45 L 310 125 L 70 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Bwari',
  },
  'lga-amac': {
    path: 'M 70 125 L 310 125 L 285 210 L 95 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'AMAC',
  },
  // Kaduna LGAs (Scoped to 380x250 viewport)
  'lga-kaduna-north': {
    path: 'M 50 45 L 330 45 L 310 125 L 70 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Kaduna North',
  },
  'lga-kaduna-south': {
    path: 'M 70 125 L 310 125 L 290 210 L 90 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'Kaduna South',
  },
  // Oyo LGAs (Scoped to 380x250 viewport)
  'lga-ibadan-north': {
    path: 'M 50 45 L 330 45 L 310 125 L 70 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Ibadan North',
  },
  'lga-ibadan-sw': {
    path: 'M 70 125 L 310 125 L 290 210 L 90 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'Ibadan South-West',
  },
  // Enugu LGAs (Scoped to 380x250 viewport)
  'lga-nsukka': {
    path: 'M 50 45 L 330 45 L 310 125 L 70 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Nsukka',
  },
  'lga-enugu-north': {
    path: 'M 70 125 L 310 125 L 290 210 L 90 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'Enugu North',
  },
  // Borno LGAs (Scoped to 380x250 viewport)
  'lga-maiduguri': {
    path: 'M 50 45 L 330 45 L 310 125 L 70 125 Z',
    labelX: 190,
    labelY: 82,
    label: 'Maiduguri',
  },
  'lga-jere': {
    path: 'M 70 125 L 310 125 L 290 210 L 90 210 Z',
    labelX: 190,
    labelY: 168,
    label: 'Jere',
  },
};

// Authentic 37-State Federation Map Geometries (36 States + FCT)
const STATE_MAP_POLYGONS = NIGERIA_STATE_GEOMETRIES;

export type LgaCollation = {
  id: string;
  name: string;
  state: string;
  totalPus: number;
  baseCollated: number;
  totalVotes: number;
  reportingPct: number;
  leadingParty: 'CPA' | 'DPP' | 'PL' | 'PPNF';
  leadingCandidate: string;
  leadingPct: string;
  margin: string;
  shares: Array<{ party: 'CPA' | 'DPP' | 'PL' | 'PPNF'; votes: number; pct: number }>;
};

export type StateCollation = {
  id: string;
  name: string;
  zone: string;
  code: string;
  lgaCount: number;
  totalPus: number;
  baseCollated: number;
  totalVotes: number;
  reportingPct: number;
  leadingParty: 'CPA' | 'DPP' | 'PL' | 'PPNF';
  leadingCandidate: string;
  leadingPct: string;
  margin: string;
  shares: Array<{ party: 'CPA' | 'DPP' | 'PL' | 'PPNF'; votes: number; pct: number }>;
};

type ReturnCardProps = {
  item: ResultSubmission;
  candMap: Map<string, Candidate>;
  colors: (typeof Colors)['light'];
  impact: ReturnType<typeof useHaptics>['impact'];
};

// Memoized row: FlatList re-renders every row on each parent render unless
// rows are memo/Pure (VirtualizedList slow-update warning).
const ReturnCard = memo(function ReturnCard({ item, candMap, colors, impact }: ReturnCardProps) {
  const isPublished = item.status === 'PUBLISHED';
  const totalCast = item.totalVotesCast || 1;

  // Find leading candidate in this PU
  let topCandId = '';
  let topCandVotes = 0;
  Object.entries(item.candidateVotes || {}).forEach(([cId, v]) => {
    const val = typeof v === 'number' ? v : 0;
    if (val > topCandVotes) {
      topCandVotes = val;
      topCandId = cId;
    }
  });

  const leadCand = candMap.get(topCandId);
  const leadPct = ((topCandVotes / totalCast) * 100).toFixed(1);

  return (
    <Card
      pressable
      style={styles.itemCard}
      onPress={() => {
        impact(Haptics.ImpactFeedbackStyle.Light);
        if (isPublished) {
          router.push({ pathname: ROUTES.RESULT_DETAIL, params: { id: item.id } });
        } else {
          router.push(ROUTES.RESULT_DRAFTS);
        }
      }}
    >
      <View style={styles.itemHeader}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.xs }}>
          <ThemedText variant="body" color="text" fontFamily="bold">
            {item.pollingUnitName}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
            {isPublished ? 'Uploaded by observer' : 'Draft Return'} · {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: isPublished ? colors.successSubtle : colors.warningSubtle,
              borderColor: isPublished ? colors.success : colors.warning,
              flexShrink: 0,
            },
          ]}
        >
          <Ionicons
            name={isPublished ? 'checkmark-circle' : 'time-outline'}
            size={12}
            color={isPublished ? colors.success : colors.warning}
          />
          <ThemedText
            variant="label"
            fontFamily="bold"
            style={{
              marginLeft: 4,
              color: isPublished ? colors.success : colors.warning,
            }}
          >
            {item.status}
          </ThemedText>
        </View>
      </View>

      {/* Leading Candidate Strip */}
      <View style={[styles.leadStrip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.xs }}>
          <ThemedText variant="label" color="textMuted">LEADING CANDIDATE</ThemedText>
          <ThemedText variant="body" color="text" fontFamily="bold" numberOfLines={1}>
            {leadCand?.fullName ?? (topCandId ? `Candidate ${topCandId}` : 'Awaiting breakdown')}
          </ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <ThemedText variant="title" color="primary" fontFamily="bold">
            {topCandVotes.toLocaleString()}
          </ThemedText>
          <ThemedText variant="label" color="textSecondary" uppercase={false}>
            {leadPct}% of ballots
          </ThemedText>
        </View>
      </View>

      {/* Bottom Accreditation & Ballot summary bar */}
      <View style={styles.itemFooter}>
        <ThemedText variant="caption" color="textSecondary" style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
          Accredited: {item.totalAccreditedVoters.toLocaleString()} · Ballots: {item.totalVotesCast.toLocaleString()}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: spacing.xs }}>
          <ThemedText variant="caption" color="primary" fontFamily="bold">
            {isPublished ? 'View Details' : 'Continue Draft'}
          </ThemedText>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Card>
  );
});


type CollationLeaderboardRowProps = {
  rank: number;
  name: string;
  subTitle: string;
  zoneOrState?: string;
  reportingPct: number;
  leadingParty: 'CPA' | 'DPP' | 'PL' | 'PPNF';
  leadingCandidate: string;
  margin: string;
  shares: Array<{ party: 'CPA' | 'DPP' | 'PL' | 'PPNF'; votes: number; pct: number }>;
  isSelected: boolean;
  colors: (typeof Colors)['light'];
  onPress: () => void;
  onAction?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

const CollationLeaderboardRow = memo(function CollationLeaderboardRow({
  rank,
  name,
  subTitle,
  zoneOrState,
  reportingPct,
  leadingParty,
  leadingCandidate,
  margin,
  shares,
  isSelected,
  colors,
  onPress,
  onAction,
  actionIcon = 'chevron-forward',
}: CollationLeaderboardRowProps) {
  const leadColor = PARTY_COLORS[leadingParty] ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.leaderboardRow,
        {
          backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      {/* Rank Indicator */}
      <View style={[styles.rowRankBox, { backgroundColor: isSelected ? colors.primary : colors.borderSubtle }]}>
        <ThemedText variant="label" color={isSelected ? '#FFFFFF' : 'textSecondary'} fontFamily="bold">
          #{rank}
        </ThemedText>
      </View>

      {/* Main Info */}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        {/* Row 1: Name + Zone/State tag + Margin */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ThemedText variant="body" color="text" fontFamily="bold">
            {name}
          </ThemedText>
          {zoneOrState && (
            <View style={[styles.zoneBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
              <ThemedText variant="label" color="textSecondary" fontFamily="bold">
                {zoneOrState}
              </ThemedText>
            </View>
          )}
          <View style={[styles.marginBadge, { backgroundColor: leadColor + '18', paddingVertical: 1, paddingHorizontal: 6 }]}>
            <ThemedText variant="label" style={{ color: leadColor }} fontFamily="bold">
              +{margin}%
            </ThemedText>
          </View>
        </View>

        {/* Row 2: Candidate + Party pill + Subtitle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.partyPill, { backgroundColor: leadColor, paddingVertical: 1, paddingHorizontal: 6 }]}>
            <ThemedText variant="label" color="#FFFFFF" fontFamily="bold">
              {leadingParty}
            </ThemedText>
          </View>
          <ThemedText variant="caption" color="textSecondary" style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
            {leadingCandidate} · {subTitle}
          </ThemedText>
        </View>

        {/* Row 3: Mini proportional share bar */}
        <View style={[styles.miniStackedBar, { backgroundColor: colors.borderSubtle }]}>
          {shares.map((s) => (
            <View
              key={s.party}
              style={{
                width: `${Math.min(100, Math.max(0, s.pct))}%` as `${number}%`,
                height: '100%',
                backgroundColor: PARTY_COLORS[s.party] ?? colors.border,
              }}
            />
          ))}
        </View>
      </View>

      {/* Right: Reporting Badge & Action */}
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
        <View style={[styles.rowReportingBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText variant="label" color="primary" fontFamily="bold">
            {reportingPct}% PUs
          </ThemedText>
        </View>
        {onAction && (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            style={styles.rowActionBtn}
          >
            <Ionicons name={actionIcon} size={15} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

export default function ResultsScreen() {
  const { user } = useAuthStore();
  const { data: apiResults = [], isLoading: loading, refetch: refetchResults } = useResultsQuery();
  const { submissions } = useResultsStore();
  const { data: candidates = [] } = useCandidatesQuery('e1');
  const { refreshControl } = useRefreshControl(loading, refetchResults);
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });
  useForegroundRefresh([['results', 'list']], 5 * 60 * 1000);
  const { impact } = useHaptics();

  // Active tab: 'published' vs 'drafts' (Audio Part 3)
  const [activeTab, setActiveTab] = useState<'published' | 'drafts'>('published');

  // Combined published results (API + local published)
  const publishedResults = useMemo(() => {
    const localPublished = submissions.filter((s) => s.status === 'PUBLISHED');
    const ids = new Set(localPublished.map((s) => s.id));
    const remoteUnique = apiResults.filter((r) => !ids.has(r.id));
    return [...localPublished, ...remoteUnique];
  }, [submissions, apiResults]);

  // Local draft submissions awaiting publication
  const draftResults = useMemo(() => {
    return submissions.filter((s) => s.status === 'DRAFT');
  }, [submissions]);

  const isOfficer = user?.role === 'ELECTION_OFFICER';
  const isFieldAgent = user?.role === 'FIELD_AGENT';
  const activeList = isOfficer || activeTab === 'published' ? publishedResults : draftResults;

  const totalVotes = publishedResults.reduce((sum, r) => sum + (r.totalVotesCast || 0), 0);

  const candMap = useMemo(() => {
    const m = new Map<string, (typeof candidates)[0]>();
    candidates.forEach((c) => m.set(c.id, c));
    return m;
  }, [candidates]);

  const renderResultItem = useCallback(({ item }: { item: ResultSubmission }) => (
    <ReturnCard item={item} candMap={candMap} colors={colors} impact={impact} />
  ), [candMap, colors, impact]);

  // View Mode: 'returns' vs 'heatmap'
  const [viewMode, setViewMode] = useState<'returns' | 'heatmap'>('returns');
  const effectiveViewMode = isFieldAgent ? 'returns' : viewMode;
  // Geography Level: 'state' aggregates LGAs by state, 'lga' shows LGA detail.
  // LGA rows are the source of truth (inline collation bases + live submissions);
  // state rows are derived by summing their LGAs, so the two levels always agree.
  const [geoLevel, setGeoLevel] = useState<'state' | 'lga'>('state');
  const [filterLga, setFilterLga] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<'ALL' | 'CPA' | 'DPP' | 'PL' | 'PPNF'>('ALL');
  const [inspectModalUnit, setInspectModalUnit] = useState<LgaCollation | StateCollation | null>(null);

  // Filtered active list for PU returns
  const displayedReturns = useMemo(() => {
    let list = activeList;
    if (filterLga) {
      list = list.filter((r) =>
        r.pollingUnitName?.toLowerCase().includes(filterLga.toLowerCase()) ||
        (r as unknown as { lgaName?: string }).lgaName?.toLowerCase().includes(filterLga.toLowerCase())
      );
    }
    return list;
  }, [activeList, filterLga]);

  // Tactical Search Query for Quick Jump across States and LGAs
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // Aggregate Comprehensive 37-State Baseline LGA Data (Official 774 Canonical LGAs)
  // ---------------------------------------------------------------------------
  const lgaHeatmapData = useMemo(() => {
    const primaryHubOverrides: Record<
      string,
      { totalPus: number; baseCollated: number; baseVotes: Record<'CPA' | 'DPP' | 'PL' | 'PPNF', number> }
    > = {
      'ikeja': { totalPus: 450, baseCollated: 412, baseVotes: { CPA: 42350, DPP: 28140, PL: 21980, PPNF: 3200 } },
      'lagos mainland': { totalPus: 380, baseCollated: 345, baseVotes: { CPA: 27800, DPP: 35900, PL: 18450, PPNF: 2800 } },
      'alimosho': { totalPus: 620, baseCollated: 540, baseVotes: { CPA: 41200, DPP: 22400, PL: 53100, PPNF: 4600 } },
      'eti-osa': { totalPus: 340, baseCollated: 298, baseVotes: { CPA: 24600, DPP: 14200, PL: 39800, PPNF: 2100 } },
      'surulere': { totalPus: 395, baseCollated: 360, baseVotes: { CPA: 36400, DPP: 19800, PL: 31200, PPNF: 3100 } },
      'kosofe': { totalPus: 310, baseCollated: 275, baseVotes: { CPA: 30100, DPP: 24500, PL: 19400, PPNF: 2950 } },
      'fagge': { totalPus: 320, baseCollated: 292, baseVotes: { CPA: 18400, DPP: 9600, PL: 3100, PPNF: 58700 } },
      'tarauni': { totalPus: 280, baseCollated: 241, baseVotes: { CPA: 15200, DPP: 8100, PL: 2600, PPNF: 46300 } },
      'nasarawa': { totalPus: 350, baseCollated: 305, baseVotes: { CPA: 22100, DPP: 11400, PL: 3900, PPNF: 54200 } },
      'obio-akpor': { totalPus: 420, baseCollated: 381, baseVotes: { CPA: 19800, DPP: 47200, PL: 24600, PPNF: 1800 } },
      'port harcourt': { totalPus: 300, baseCollated: 256, baseVotes: { CPA: 16400, DPP: 28900, PL: 24700, PPNF: 1400 } },
      'municipal': { totalPus: 380, baseCollated: 340, baseVotes: { CPA: 22100, DPP: 18400, PL: 34900, PPNF: 3200 } },
      'bwari': { totalPus: 220, baseCollated: 186, baseVotes: { CPA: 9800, DPP: 11200, PL: 28600, PPNF: 1100 } },
      'kaduna north': { totalPus: 340, baseCollated: 295, baseVotes: { CPA: 38200, DPP: 29400, PL: 12100, PPNF: 11200 } },
      'kaduna south': { totalPus: 310, baseCollated: 260, baseVotes: { CPA: 31500, DPP: 33800, PL: 15400, PPNF: 8900 } },
      'ibadan north': { totalPus: 410, baseCollated: 375, baseVotes: { CPA: 39100, DPP: 36200, PL: 18700, PPNF: 2400 } },
      'ibadan south-west': { totalPus: 360, baseCollated: 318, baseVotes: { CPA: 34800, DPP: 31200, PL: 16900, PPNF: 1900 } },
      'enugu north': { totalPus: 290, baseCollated: 270, baseVotes: { CPA: 4200, DPP: 12800, PL: 58400, PPNF: 800 } },
      'nsukka': { totalPus: 320, baseCollated: 285, baseVotes: { CPA: 5100, DPP: 14200, PL: 61200, PPNF: 950 } },
      'maiduguri': { totalPus: 380, baseCollated: 340, baseVotes: { CPA: 54200, DPP: 19800, PL: 4100, PPNF: 8300 } },
      'jere': { totalPus: 290, baseCollated: 245, baseVotes: { CPA: 41800, DPP: 16200, PL: 3200, PPNF: 6400 } },
    };

    const allBases: Array<{
      id: string;
      name: string;
      state: string;
      totalPus: number;
      baseCollated: number;
      baseVotes: Record<'CPA' | 'DPP' | 'PL' | 'PPNF', number>;
    }> = [];

    Object.values(NIGERIA_STATE_GEOMETRIES).forEach((geom) => {
      const stateLgas = getOfficialLgasForState(geom.name);
      const zone = geom.zone;

      let defaultRatio: { CPA: number; DPP: number; PL: number; PPNF: number };
      if (zone === 'North West') {
        defaultRatio = { CPA: 0.44, DPP: 0.28, PL: 0.08, PPNF: 0.20 };
      } else if (zone === 'North East') {
        defaultRatio = { CPA: 0.48, DPP: 0.38, PL: 0.06, PPNF: 0.08 };
      } else if (zone === 'North Central') {
        defaultRatio = { CPA: 0.36, DPP: 0.34, PL: 0.25, PPNF: 0.05 };
      } else if (zone === 'South West') {
        defaultRatio = { CPA: 0.46, DPP: 0.24, PL: 0.27, PPNF: 0.03 };
      } else if (zone === 'South East') {
        defaultRatio = { CPA: 0.08, DPP: 0.22, PL: 0.68, PPNF: 0.02 };
      } else {
        defaultRatio = { CPA: 0.28, DPP: 0.42, PL: 0.27, PPNF: 0.03 };
      }

      stateLgas.forEach((lgaName) => {
        const cleanName = lgaName.trim();
        const lowerName = cleanName.toLowerCase();
        const baseId = `lga-${geom.name.toLowerCase().replace(/\s+/g, '-')}-${lowerName.replace(/[^a-z0-9]+/g, '-')}`;
        const legacySimpleId = `lga-${lowerName.replace(/[^a-z0-9]+/g, '-')}`;
        const override = primaryHubOverrides[lowerName] || primaryHubOverrides[cleanName];

        if (override) {
          allBases.push({
            id: legacySimpleId in LGA_MAP_POLYGONS ? legacySimpleId : baseId,
            name: cleanName.endsWith('LGA') || cleanName.endsWith('Council') ? cleanName : `${cleanName} LGA`,
            state: geom.name,
            totalPus: override.totalPus,
            baseCollated: override.baseCollated,
            baseVotes: { ...override.baseVotes },
          });
          return;
        }

        const seed = (geom.name + '_' + cleanName)
          .split('')
          .reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0);
        const hash = Math.abs(seed);

        const pus = 175 + (hash % 210);
        const collatedPct = 0.85 + ((hash % 12) / 100);
        const collated = Math.round(pus * collatedPct);
        const totalV = collated * (110 + (hash % 30));

        const deltaCPA = ((hash % 7) - 3) / 100;
        const deltaDPP = (((hash >> 2) % 7) - 3) / 100;
        const ratioCPA = Math.max(0.04, defaultRatio.CPA + deltaCPA);
        const ratioDPP = Math.max(0.04, defaultRatio.DPP + deltaDPP);
        const rem = 1 - (ratioCPA + ratioDPP);
        const ratioPL = Math.max(0.02, (defaultRatio.PL * rem) / (defaultRatio.PL + defaultRatio.PPNF));
        const ratioPPNF = Math.max(0.02, 1 - (ratioCPA + ratioDPP + ratioPL));

        allBases.push({
          id: legacySimpleId in LGA_MAP_POLYGONS ? legacySimpleId : baseId,
          name: cleanName.endsWith('LGA') || cleanName.endsWith('Council') ? cleanName : `${cleanName} LGA`,
          state: geom.name,
          totalPus: pus,
          baseCollated: collated,
          baseVotes: {
            CPA: Math.round(totalV * ratioCPA),
            DPP: Math.round(totalV * ratioDPP),
            PL: Math.round(totalV * ratioPL),
            PPNF: Math.round(totalV * ratioPPNF),
          },
        });
      });
    });

    const candidateNames: Record<string, string> = {
      CPA: 'Bawa Nassiru',
      DPP: 'Farouk Haruna',
      PL: 'Nassiru Bawa',
      PPNF: 'Ibrahim Shehu',
    };

    return allBases.map((base) => {
      const dynamicVotes = { ...base.baseVotes };
      let extraCollated = 0;

      publishedResults.forEach((sub) => {
        const pName = sub.pollingUnitName?.toLowerCase() || '';
        if (pName.includes(base.state.toLowerCase()) || pName.includes(base.name.toLowerCase().split(' ')[0]!)) {
          extraCollated += 1;
          if (sub.candidateVotes) {
            dynamicVotes.CPA += sub.candidateVotes['cand1'] || 0;
            dynamicVotes.DPP += sub.candidateVotes['cand2'] || 0;
            dynamicVotes.PL += sub.candidateVotes['cand3'] || 0;
            dynamicVotes.PPNF += sub.candidateVotes['cand4'] || 0;
          }
        }
      });

      const totalVotes =
        (dynamicVotes.CPA || 0) +
        (dynamicVotes.DPP || 0) +
        (dynamicVotes.PL || 0) +
        (dynamicVotes.PPNF || 0);

      const shares: Array<{ party: 'CPA' | 'DPP' | 'PL' | 'PPNF'; votes: number; pct: number }> = [
        { party: 'CPA' as const, votes: dynamicVotes.CPA, pct: totalVotes > 0 ? (dynamicVotes.CPA / totalVotes) * 100 : 0 },
        { party: 'DPP' as const, votes: dynamicVotes.DPP, pct: totalVotes > 0 ? (dynamicVotes.DPP / totalVotes) * 100 : 0 },
        { party: 'PL' as const, votes: dynamicVotes.PL, pct: totalVotes > 0 ? (dynamicVotes.PL / totalVotes) * 100 : 0 },
        { party: 'PPNF' as const, votes: dynamicVotes.PPNF, pct: totalVotes > 0 ? (dynamicVotes.PPNF / totalVotes) * 100 : 0 },
      ].sort((a, b) => b.votes - a.votes);

      const leader = shares[0]!;
      const runnerUp = shares[1]!;
      const margin = (leader.pct - runnerUp.pct).toFixed(1);
      const reportingPct = Math.min(100, Math.round(((base.baseCollated + extraCollated) / base.totalPus) * 100));

      return {
        id: base.id,
        name: base.name,
        state: base.state,
        totalPus: base.totalPus,
        baseCollated: base.baseCollated + extraCollated,
        totalVotes,
        reportingPct,
        leadingParty: leader.party,
        leadingCandidate: candidateNames[leader.party] ?? leader.party,
        leadingPct: leader.pct.toFixed(1),
        margin,
        shares,
      };
    });
  }, [publishedResults]);

  // State aggregation: derived from all 774 LGA rows grouped by state
  const stateHeatmapData: StateCollation[] = useMemo(() => {
    const candidateNames: Record<string, string> = {
      CPA: 'Bawa Nassiru',
      DPP: 'Farouk Haruna',
      PL: 'Nassiru Bawa',
      PPNF: 'Ibrahim Shehu',
    };

    const byState = new Map<
      string,
      {
        totalPus: number;
        baseCollated: number;
        votes: Record<'CPA' | 'DPP' | 'PL' | 'PPNF', number>;
        lgaCount: number;
      }
    >();

    lgaHeatmapData.forEach((lga) => {
      const entry = byState.get(lga.state) ?? {
        totalPus: 0,
        baseCollated: 0,
        votes: { CPA: 0, DPP: 0, PL: 0, PPNF: 0 },
        lgaCount: 0,
      };
      entry.totalPus += lga.totalPus;
      entry.baseCollated += lga.baseCollated;
      (['CPA', 'DPP', 'PL', 'PPNF'] as const).forEach((p) => {
        const share = lga.shares.find((s) => s.party === p);
        entry.votes[p] += share?.votes ?? 0;
      });
      entry.lgaCount += 1;
      byState.set(lga.state, entry);
    });

    return [...byState.entries()]
      .map(([state, entry]) => {
        const totalVotes = entry.votes.CPA + entry.votes.DPP + entry.votes.PL + entry.votes.PPNF;
        const shares = (['CPA', 'DPP', 'PL', 'PPNF'] as const)
          .map((party) => {
            const votes = entry.votes[party];
            return {
              party,
              votes,
              pct: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
            };
          })
          .sort((a, b) => b.votes - a.votes);

        const leader = shares[0]!;
        const runnerUp = shares[1]!;
        const stateKey = `state-${state.toLowerCase().replace(/\s+/g, '-')}`;
        const geom = NIGERIA_STATE_GEOMETRIES[stateKey];

        return {
          id: stateKey,
          name: state,
          zone: geom?.zone ?? 'Federation Zone',
          code: geom?.code ?? state.substring(0, 3).toUpperCase(),
          lgaCount: entry.lgaCount,
          totalPus: entry.totalPus,
          baseCollated: entry.baseCollated,
          totalVotes,
          reportingPct:
            entry.totalPus > 0
              ? Number(Math.min(100, (entry.baseCollated / entry.totalPus) * 100).toFixed(0))
              : 0,
          leadingParty: leader.party,
          leadingCandidate: candidateNames[leader.party] ?? leader.party,
          leadingPct: leader.pct.toFixed(1),
          margin: (leader.pct - runnerUp.pct).toFixed(1),
          shares,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lgaHeatmapData]);

  const filteredStates = useMemo(() => {
    let list = stateHeatmapData;
    if (partyFilter !== 'ALL') {
      list = list.filter((s) => s.leadingParty === partyFilter);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    return list;
  }, [stateHeatmapData, partyFilter, searchQuery]);

  // Geographic SVG Map State
  const [selectedMapLgaId, setSelectedMapLgaId] = useState<string>('lga-ikeja');
  const [selectedMapStateId, setSelectedMapStateId] = useState<string>('state-lagos');
  const [mapHeatMode, setMapHeatMode] = useState<'party' | 'density'>('party');
  const [activeLgaState, setActiveLgaState] = useState<string>('Lagos');

  const effectiveLgaState = filterState ?? activeLgaState ?? 'Lagos';

  const filteredLgas = useMemo(() => {
    let list = lgaHeatmapData;
    const targetState = (filterState || activeLgaState || 'Lagos').toLowerCase();
    list = list.filter((l) => (l.state || '').toLowerCase() === targetState);
    if (partyFilter !== 'ALL') {
      list = list.filter((l) => l.leadingParty === partyFilter);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => (l.name || '').toLowerCase().includes(q) || (l.state || '').toLowerCase().includes(q));
    }
    return list;
  }, [lgaHeatmapData, filterState, activeLgaState, partyFilter, searchQuery]);

  const totalCollatedAcrossLgas = useMemo(() => {
    return lgaHeatmapData.reduce((acc, l) => acc + l.baseCollated, 0);
  }, [lgaHeatmapData]);

  const totalPusAcrossLgas = useMemo(() => {
    return lgaHeatmapData.reduce((acc, l) => acc + l.totalPus, 0);
  }, [lgaHeatmapData]);

  const overallReportingPct = ((totalCollatedAcrossLgas / totalPusAcrossLgas) * 100).toFixed(1);

  // Distinct states present in the current LGA base set (drives map header scope).
  const statesInView = useMemo(() => {
    return [...new Set(lgaHeatmapData.map((l) => l.state))];
  }, [lgaHeatmapData]);

  const mapLgas = useMemo(() => {
    const target = (effectiveLgaState || 'Lagos').toLowerCase();
    return lgaHeatmapData.filter((l) => (l.state || '').toLowerCase() === target);
  }, [lgaHeatmapData, effectiveLgaState]);

  const selectedMapLga = useMemo(() => {
    return lgaHeatmapData.find((l) => l.id === selectedMapLgaId) ?? mapLgas[0] ?? lgaHeatmapData[0]!;
  }, [lgaHeatmapData, selectedMapLgaId, mapLgas]);

  const selectedMapState = useMemo(() => {
    return stateHeatmapData.find((s) => s.id === selectedMapStateId) ?? stateHeatmapData[0]!;
  }, [stateHeatmapData, selectedMapStateId]);

  const handleOpenSatelliteMap = async () => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await WebBrowser.openBrowserAsync('https://www.openstreetmap.org/#map=11/6.5244/3.3792', {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (e) {
      console.warn('[results] open satellite map failed', e);
    }
  };

  const getLgaFillColor = useCallback((lga: { reportingPct: number; leadingParty: string }) => {
    if (mapHeatMode === 'density') {
      if (lga.reportingPct >= 90) return '#DC2626'; // High reporting heat
      if (lga.reportingPct >= 80) return '#EA580C'; // Medium-high
      if (lga.reportingPct >= 65) return '#D97706'; // Medium
      return '#16A34A'; // Initial
    }
    return PARTY_COLORS[lga.leadingParty] ?? '#0D6338';
  }, [mapHeatMode]);

  const handleInspectLga = useCallback((lgaName: string) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    setFilterLga(lgaName.replace(' LGA', ''));
    setViewMode('returns');
  }, [impact]);

  const handleDrillToState = useCallback((stateName?: string) => {
    if (!stateName) return;
    impact(Haptics.ImpactFeedbackStyle.Light);
    setActiveLgaState(stateName);
    setFilterState(stateName);
    const firstLga = lgaHeatmapData.find((l) => (l.state || '').toLowerCase() === stateName.toLowerCase());
    if (firstLga) setSelectedMapLgaId(firstLga.id);
    setGeoLevel('lga');
  }, [impact, lgaHeatmapData]);

  const handleFocusMapState = useCallback((stateId: string) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMapStateId(stateId);
  }, [impact]);

  const renderGeoItem = useCallback(
    ({ item, index }: { item: LgaCollation | StateCollation; index: number }) => {
      if (geoLevel === 'state') {
        const st = item as StateCollation;
        const isSelected = selectedMapStateId === st.id;
        return (
          <CollationLeaderboardRow
            rank={index + 1}
            name={`${st.name} State`}
            subTitle={`${st.totalVotes.toLocaleString()} votes`}
            zoneOrState={st.zone}
            reportingPct={st.reportingPct}
            leadingParty={st.leadingParty}
            leadingCandidate={st.leadingCandidate}
            margin={st.margin}
            shares={st.shares}
            isSelected={isSelected}
            colors={colors}
            onPress={() => {
              impact(Haptics.ImpactFeedbackStyle.Light);
              handleFocusMapState(st.id);
              setInspectModalUnit(st);
            }}
            onAction={() => handleDrillToState(st.name)}
            actionIcon="chevron-forward"
          />
        );
      }
      const lga = item as LgaCollation;
      const isSelected = selectedMapLgaId === lga.id;
      return (
        <CollationLeaderboardRow
          rank={index + 1}
          name={lga.name}
          subTitle={`${lga.baseCollated} of ${lga.totalPus} PUs`}
          zoneOrState={lga.state}
          reportingPct={lga.reportingPct}
          leadingParty={lga.leadingParty}
          leadingCandidate={lga.leadingCandidate}
          margin={lga.margin}
          shares={lga.shares}
          isSelected={isSelected}
          colors={colors}
          onPress={() => {
            impact(Haptics.ImpactFeedbackStyle.Light);
            setSelectedMapLgaId(lga.id);
            setInspectModalUnit(lga);
          }}
          onAction={() => handleInspectLga(lga.name)}
          actionIcon="arrow-forward"
        />
      );
    },
    [geoLevel, selectedMapStateId, selectedMapLgaId, colors, impact, handleFocusMapState, handleDrillToState, handleInspectLga, setInspectModalUnit]
  );

  return (
    <ScreenView scrollable={false} noScrollPadding>
      <View style={styles.container}>
        {/* Top Control Bar */}
        <View style={styles.topControlBar}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.xs }}>
            <ThemedText variant="title" color="text" fontFamily="bold">
              Election Results
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              {effectiveViewMode === 'returns'
                ? `Total ${totalVotes.toLocaleString()} votes across ${publishedResults.length} PUs`
                : `${overallReportingPct}% of collation centers reporting`}
            </ThemedText>
          </View>

          {user?.role === 'ELECTION_OFFICER' ? (
            <Button
              label="Collation"
              variant="outline"
              size="sm"
              leftIcon="bar-chart-outline"
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push(ROUTES.RESULT_COLLATION);
              }}
            />
          ) : (
            <Button
              label="+ Record Result"
              variant="primary"
              size="sm"
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push(ROUTES.RESULT_SUBMIT);
              }}
            />
          )}
        </View>

        {/* Primary View Switcher: [ 📋 PU Returns | 🗺️ Collation Heat Map ] (Hidden for Field Agent per spec) */}
        {!isFieldAgent && (
          <View style={[styles.mainViewSwitcher, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Light);
                setViewMode('returns');
              }}
              style={[
                styles.mainViewBtn,
                effectiveViewMode === 'returns' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
            >
              <View style={styles.tabBtnContent}>
                <Ionicons
                  name="list-outline"
                  size={14}
                  color={effectiveViewMode === 'returns' ? '#FFFFFF' : colors.textSecondary}
                />
                <ThemedText
                  variant="caption"
                  color={effectiveViewMode === 'returns' ? '#FFFFFF' : 'textSecondary'}
                  fontFamily={effectiveViewMode === 'returns' ? 'bold' : 'medium'}
                  numberOfLines={1}
                >
                  PU Returns ({publishedResults.length})
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Light);
                setViewMode('heatmap');
              }}
              style={[
                styles.mainViewBtn,
                effectiveViewMode === 'heatmap' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
            >
              <View style={styles.tabBtnContent}>
                <Ionicons
                  name="map-outline"
                  size={14}
                  color={effectiveViewMode === 'heatmap' ? '#FFFFFF' : colors.textSecondary}
                />
                <ThemedText
                  variant="caption"
                  color={effectiveViewMode === 'heatmap' ? '#FFFFFF' : 'textSecondary'}
                  fontFamily={effectiveViewMode === 'heatmap' ? 'bold' : 'medium'}
                  numberOfLines={1}
                >
                  Heat Map ({geoLevel === 'state' ? `${stateHeatmapData.length} States` : `${lgaHeatmapData.length} LGAs`})
                </ThemedText>
              </View>
            </Pressable>
          </View>
        )}

        {/* Active Filter Pill if filtered by LGA */}
        {filterLga && (
          <View style={styles.filterChipRow}>
            <View style={[styles.filterChip, { backgroundColor: colors.primaryLight + '22', borderColor: colors.primary }]}>
              <ThemedText variant="caption" color="primary" fontFamily="bold">
                Filtered: {filterLga}
              </ThemedText>
              <Pressable
                onPress={() => {
                  impact(Haptics.ImpactFeedbackStyle.Light);
                  setFilterLga(null);
                }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}

        {/* --- VIEW MODE 1: PU RETURNS --- */}
        {effectiveViewMode === 'returns' ? (
          <>
            {/* Tab Switcher: Published Results vs Drafts (Polling Agents only) */}
            {!isOfficer && (
              <View style={[styles.tabBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('published');
                  }}
                  style={[
                    styles.tabBtn,
                    activeTab === 'published' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color={activeTab === 'published' ? '#FFFFFF' : 'textSecondary'}
                    fontFamily={activeTab === 'published' ? 'bold' : 'medium'}
                  >
                    Published ({publishedResults.length})
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    impact(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('drafts');
                  }}
                  style={[
                    styles.tabBtn,
                    activeTab === 'drafts' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText
                      variant="caption"
                      color={activeTab === 'drafts' ? '#FFFFFF' : 'textSecondary'}
                      fontFamily={activeTab === 'drafts' ? 'bold' : 'medium'}
                    >
                      Drafts ({draftResults.length})
                    </ThemedText>
                    {draftResults.length > 0 && (
                      <View style={[styles.tabBadge, { backgroundColor: colors.warning }]}>
                        <ThemedText variant="micro" color="#FFFFFF" fontFamily="bold">
                          {draftResults.length}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </Pressable>
              </View>
            )}

            {/* Native FlatList */}
            <FlatList
              {...listPerf}
              data={displayedReturns}
              keyExtractor={(item) => item.id}
              renderItem={renderResultItem}
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
                    icon={activeTab === 'published' ? 'document-text-outline' : 'save-outline'}
                    title={activeTab === 'published' ? 'No Results Published Yet' : 'No Drafts Saved'}
                    subtitle={
                      activeTab === 'published'
                        ? 'Polling unit ballot returns will appear here once submitted and verified.'
                        : 'You have no incomplete drafts. Tap "+ Record Result" to begin a new submission.'
                    }
                    actionLabel="+ Record Result"
                    onAction={() => router.push(ROUTES.RESULT_SUBMIT)}
                  />
                )
              }
            />
          </>
        ) : (
          /* --- VIEW MODE 2: COLLATION HEAT MAP --- */
          <FlatList
            {...listPerf}
            data={geoLevel === 'state' ? filteredStates : filteredLgas}
            keyExtractor={(item) => item.id}
            refreshControl={refreshControl}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
                {/* Unified Tactical Control Bar */}
                <View style={[styles.unifiedHeaderBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  {/* Segmented Geo Level Pills */}
                  <View style={[styles.pillTrack, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <Pressable
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Light);
                        setGeoLevel('state');
                      }}
                      style={[
                        styles.pillBtn,
                        geoLevel === 'state' && [styles.activePillBtn, { backgroundColor: colors.primary }],
                      ]}
                      accessibilityLabel="Show state-level collation"
                    >
                      <Ionicons
                        name="globe-outline"
                        size={13}
                        color={geoLevel === 'state' ? '#FFFFFF' : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <ThemedText
                        variant="caption"
                        color={geoLevel === 'state' ? '#FFFFFF' : 'textSecondary'}
                        fontFamily="bold"
                      >
                        States ({stateHeatmapData.length})
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Light);
                        setGeoLevel('lga');
                      }}
                      style={[
                        styles.pillBtn,
                        geoLevel === 'lga' && [styles.activePillBtn, { backgroundColor: colors.primary }],
                      ]}
                      accessibilityLabel="Show LGA-level collation"
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={geoLevel === 'lga' ? '#FFFFFF' : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <ThemedText
                        variant="caption"
                        color={geoLevel === 'lga' ? '#FFFFFF' : 'textSecondary'}
                        fontFamily="bold"
                      >
                        LGAs ({filteredLgas.length})
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Segmented Map Heat Mode Pills */}
                  <View style={[styles.pillTrack, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <Pressable
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Light);
                        setMapHeatMode('party');
                      }}
                      style={[
                        styles.pillBtn,
                        mapHeatMode === 'party' && [styles.activePillBtn, { backgroundColor: colors.primary }],
                      ]}
                      accessibilityLabel="Party lead mode"
                    >
                      <ThemedText
                        variant="caption"
                        color={mapHeatMode === 'party' ? '#FFFFFF' : 'textSecondary'}
                        fontFamily={mapHeatMode === 'party' ? 'bold' : 'medium'}
                      >
                        🎨 Lead
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Light);
                        setMapHeatMode('density');
                      }}
                      style={[
                        styles.pillBtn,
                        mapHeatMode === 'density' && [styles.activePillBtn, { backgroundColor: colors.primary }],
                      ]}
                      accessibilityLabel="Collation heat mode"
                    >
                      <ThemedText
                        variant="caption"
                        color={mapHeatMode === 'density' ? '#FFFFFF' : 'textSecondary'}
                        fontFamily={mapHeatMode === 'density' ? 'bold' : 'medium'}
                      >
                        🔥 Heat
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Tactical Quick Search & Navigation Bar */}
                <View style={[styles.tacticalSearchBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Ionicons name="search" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={(q) => {
                      setSearchQuery(q);
                      if (q.trim().length >= 2) {
                        if (geoLevel === 'state') {
                          const match = stateHeatmapData.find(
                            (s) =>
                              s.name.toLowerCase().includes(q.toLowerCase()) ||
                              s.code.toLowerCase().includes(q.toLowerCase())
                          );
                          if (match) {
                            setSelectedMapStateId(match.id);
                            setActiveLgaState(match.name);
                          }
                        } else {
                          const matchLga = mapLgas.find((l) => l.name.toLowerCase().includes(q.toLowerCase()));
                          if (matchLga) {
                            setSelectedMapLgaId(matchLga.id);
                          } else {
                            const anyLga = lgaHeatmapData.find((l) => l.name.toLowerCase().includes(q.toLowerCase()));
                            if (anyLga) {
                              setActiveLgaState(anyLga.state);
                              setSelectedMapLgaId(anyLga.id);
                            }
                          }
                        }
                      }
                    }}
                    placeholder={geoLevel === 'state' ? 'Quick jump across 37 states or codes...' : `Quick search ${effectiveLgaState} LGAs...`}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInputText, { color: colors.text }]}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => {
                        impact(Haptics.ImpactFeedbackStyle.Light);
                        setSearchQuery('');
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>

                {/* State Scoping Selector for State and LGA View */}
                <View style={styles.stateSelectorContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.stateSelectorScroll}
                  >
                    {statesInView.map((st) => {
                      const isSelected = effectiveLgaState.toLowerCase() === st.toLowerCase();
                      const stateObj = stateHeatmapData.find((s) => s.name === st);
                      return (
                        <Pressable
                          key={st}
                          onPress={() => {
                            impact(Haptics.ImpactFeedbackStyle.Light);
                            setActiveLgaState(st);
                            setFilterState(st);
                            if (stateObj) setSelectedMapStateId(stateObj.id);
                            const firstLga = lgaHeatmapData.find((l) => l.state.toLowerCase() === st.toLowerCase());
                            if (firstLga) setSelectedMapLgaId(firstLga.id);
                          }}
                          style={[
                            styles.stateSelectorChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <ThemedText
                            variant="caption"
                            color={isSelected ? '#FFFFFF' : 'text'}
                            fontFamily={isSelected ? 'bold' : 'medium'}
                          >
                            {st}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    {filterState && (
                      <Pressable
                        onPress={() => {
                          impact(Haptics.ImpactFeedbackStyle.Light);
                          setFilterState(null);
                        }}
                        style={[styles.stateSelectorChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      >
                        <Ionicons name="close-circle" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <ThemedText variant="caption" color="textSecondary" fontFamily="medium">
                          Reset Filter
                        </ThemedText>
                      </Pressable>
                    )}
                  </ScrollView>
                </View>

                {/* Secondary LGA Scoping Selector when in LGA View (Parity with aquilaweb) */}
                {geoLevel === 'lga' && (
                  <View style={[styles.stateSelectorContainer, { marginTop: 4 }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stateSelectorScroll}
                    >
                      {mapLgas.map((lga) => {
                        const isSel = selectedMapLgaId === lga.id;
                        const pCol = PARTY_COLORS[lga.leadingParty] ?? colors.primary;
                        return (
                          <Pressable
                            key={lga.id}
                            onPress={() => {
                              impact(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedMapLgaId(lga.id);
                              setInspectModalUnit(lga);
                            }}
                            style={[
                              styles.stateSelectorChip,
                              {
                                backgroundColor: isSel ? pCol + '25' : colors.surfaceElevated,
                                borderColor: isSel ? pCol : colors.border,
                              },
                            ]}
                          >
                            <ThemedText
                              variant="caption"
                              color={isSel ? pCol : 'text'}
                              fontFamily={isSel ? 'bold' : 'medium'}
                            >
                              {lga.name.replace(/\s+LGA$/i, '')} ({lga.leadingParty} {lga.leadingPct}%)
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Integrated Geographic Tactical Map Card */}
                <Card style={[styles.mapContainerCard, { backgroundColor: '#07120B', borderColor: colors.border }]}>
                  {/* Map Header with Integrated Collation Telemetry */}
                  <View style={styles.mapCardHeader}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.liveDot} />
                        <ThemedText variant="caption" color="#A3E6C2" fontFamily="bold">
                          {geoLevel === 'state' ? 'FEDERAL PRESIDENTIAL COLLATION' : `${effectiveLgaState.toUpperCase()} DISTRICT COLLATION`}
                        </ThemedText>
                      </View>
                      <ThemedText variant="body" color="#FFFFFF" fontFamily="bold">
                        {geoLevel === 'state'
                          ? 'National Federation Tactical Map'
                          : `${effectiveLgaState} State LGA Collation Map`}
                      </ThemedText>
                      <ThemedText variant="label" color="#FFFFFF99">
                        {geoLevel === 'state'
                          ? `${stateHeatmapData.length} of 37 States · ${totalCollatedAcrossLgas.toLocaleString()} / ${totalPusAcrossLgas.toLocaleString()} PUs`
                          : `${mapLgas.length} Monitored LGAs · ${mapLgas.reduce((a, b) => a + b.baseCollated, 0)} of ${mapLgas.reduce((a, b) => a + b.totalPus, 0)} PUs collated`}
                      </ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <View style={[styles.reportingPill, { backgroundColor: colors.primaryLight + '26', borderColor: colors.primaryLight + '44' }]}>
                        <ThemedText variant="caption" color="#34D399" fontFamily="bold">
                          {overallReportingPct}%
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={handleOpenSatelliteMap}
                        style={[styles.satelliteBtn, { backgroundColor: colors.surfaceElevated + '99', borderColor: '#FFFFFF22' }]}
                        accessibilityLabel="Open satellite map"
                      >
                        <Ionicons name="globe-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <ThemedText variant="label" color="#FFFFFF" fontFamily="bold">
                          Satellite
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>

                  {/* Slim Collation Progress Track */}
                  <View style={[styles.statusBarTrack, { backgroundColor: '#FFFFFF12', marginVertical: 4 }]}>
                    <View
                      style={[
                        styles.statusBarFill,
                        { width: `${Math.min(100, Math.max(0, Number(overallReportingPct)))}%` as `${number}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>

                  {/* Top Canvas Telemetry Strip (Parity with aquilaweb) */}
                  <View style={styles.telemetryStrip}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                      <ThemedText variant="caption" color="#34D399" fontFamily="bold" numberOfLines={1}>
                        {geoLevel === 'state' ? '37 HUBS' : `${effectiveLgaState.toUpperCase()} LGAS`}
                      </ThemedText>
                      <ThemedText variant="caption" color="textMuted">•</ThemedText>
                      <ThemedText variant="caption" color="#A3E6C2" numberOfLines={1}>
                        {mapHeatMode === 'party' ? 'Lead Party' : 'Progress'}
                      </ThemedText>
                    </View>
                    <ThemedText variant="caption" color="#34D39999" fontFamily="medium" style={{ flexShrink: 0, paddingLeft: 8 }}>
                      WGS84
                    </ThemedText>
                  </View>

                  {/* SVG Canvas */}
                  <View style={styles.svgWrapper}>
                    <Svg
                      width="100%"
                      height={270}
                      viewBox={
                        geoLevel === 'state'
                          ? NIGERIA_MAP_VIEWBOX
                          : mapLgas.length <= 6 && mapLgas.every((l) => LGA_MAP_POLYGONS[l.id])
                          ? '0 0 380 250'
                          : '0 0 680 460'
                      }
                    >
                      {geoLevel === 'lga' ? (
                        <G key="lga-layer">
                          {mapLgas.length <= 6 && mapLgas.every((l) => LGA_MAP_POLYGONS[l.id]) ? (
                            /* Custom LGA Polygons */
                            mapLgas.map((lga) => {
                              const poly = LGA_MAP_POLYGONS[lga.id];
                              if (!poly) return null;
                              const isSelected = selectedMapLgaId === lga.id;
                              const fillColor = getLgaFillColor(lga);

                              return (
                                <G
                                  key={lga.id}
                                  onPress={() => {
                                    impact(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedMapLgaId(lga.id);
                                  }}
                                >
                                  {isSelected && (
                                    <Path
                                      d={poly.path}
                                      fill="none"
                                      stroke={colors.primaryLight}
                                      strokeWidth={5}
                                      strokeOpacity={0.6}
                                    />
                                  )}
                                  <Path
                                    d={poly.path}
                                    fill={fillColor}
                                    fillOpacity={isSelected ? 0.95 : 0.78}
                                    stroke={isSelected ? '#FFFFFF' : '#070C09'}
                                    strokeWidth={isSelected ? 2.5 : 1.5}
                                  />
                                  <Rect
                                    x={poly.labelX - 44}
                                    y={poly.labelY - 14}
                                    width={88}
                                    height={28}
                                    rx={5}
                                    fill="#040B06DD"
                                    stroke={isSelected ? '#FDE047' : '#FFFFFF25'}
                                    strokeWidth={isSelected ? 1.5 : 0.8}
                                  />
                                  <SvgText
                                    x={poly.labelX}
                                    y={poly.labelY - 2}
                                    fill="#FFFFFF"
                                    fontSize="10"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {poly.label}
                                  </SvgText>
                                  <SvgText
                                    x={poly.labelX}
                                    y={poly.labelY + 9}
                                    fill={isSelected ? '#FDE047' : '#FFFFFFCC'}
                                    fontSize="8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {mapHeatMode === 'party' ? `${lga.leadingParty} (${lga.leadingPct}%)` : `${lga.reportingPct}% PUs`}
                                  </SvgText>
                                  {isSelected && (
                                    <>
                                      <Circle cx={poly.labelX} cy={poly.labelY - 19} r={4.5} fill="#FFFFFF" />
                                      <Circle cx={poly.labelX} cy={poly.labelY - 19} r={8.5} stroke="#FFFFFF88" strokeWidth={1.5} fill="none" />
                                    </>
                                  )}
                                </G>
                              );
                            })
                          ) : (
                            /* Dynamic Tactical District Radar Matrix for Canonical INEC LGAs (parity with aquilaweb) */
                            <G key="district-matrix">
                              {(() => {
                                const total = mapLgas.length;
                                let cols = 3;
                                if (total > 28) cols = 6;
                                else if (total > 20) cols = 5;
                                else if (total > 12) cols = 4;
                                else if (total > 6) cols = 3;
                                else cols = 2;

                                const rows = Math.ceil(total / cols);
                                const availW = 620;
                                const availH = 390;
                                const cellGapX = cols > 4 ? 6 : 8;
                                const cellGapY = rows > 4 ? 6 : 8;
                                const cellW = (availW - (cols - 1) * cellGapX) / cols;
                                const cellH = Math.min(rows > 4 ? 44 : 58, (availH - (rows - 1) * cellGapY) / rows);
                                const startLeft = 30;
                                const startTop = 35;

                                return mapLgas.map((lga, idx) => {
                                  const row = Math.floor(idx / cols);
                                  const col = idx % cols;
                                  const startX = startLeft + col * (cellW + cellGapX);
                                  const startY = startTop + row * (cellH + cellGapY);
                                  const isSelected = selectedMapLgaId === lga.id;
                                  const fillColor = getLgaFillColor(lga);
                                  const displayName = cols >= 5 ? lga.name.replace(/\s+LGA$/i, '') : lga.name;

                                  return (
                                    <G
                                      key={lga.id}
                                      onPress={() => {
                                        impact(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedMapLgaId(lga.id);
                                      }}
                                    >
                                      <Rect
                                        x={startX}
                                        y={startY}
                                        width={cellW}
                                        height={cellH}
                                        rx={cols > 4 ? 6 : 8}
                                        fill={fillColor}
                                        fillOpacity={isSelected ? 0.95 : 0.75}
                                        stroke={isSelected ? '#34D399' : '#1C2E24'}
                                        strokeWidth={isSelected ? 2.5 : 1.2}
                                      />
                                      {isSelected && (
                                        <Rect
                                          x={startX - 2}
                                          y={startY - 2}
                                          width={cellW + 4}
                                          height={cellH + 4}
                                          rx={cols > 4 ? 8 : 10}
                                          fill="none"
                                          stroke="#FDE047"
                                          strokeWidth={1.5}
                                          strokeDasharray="4,2"
                                        />
                                      )}
                                      <SvgText
                                        x={startX + cellW / 2}
                                        y={startY + (cellH > 48 ? 19 : 16)}
                                        fill="#FFFFFF"
                                        fontSize={cols >= 5 ? 8.5 : 10}
                                        fontWeight="bold"
                                        textAnchor="middle"
                                      >
                                        {displayName}
                                      </SvgText>
                                      <SvgText
                                        x={startX + cellW / 2}
                                        y={startY + (cellH > 48 ? 34 : 28)}
                                        fill={isSelected ? '#FDE047' : '#FFFFFFDD'}
                                        fontSize={cols >= 5 ? 7.5 : 8.5}
                                        fontWeight="bold"
                                        textAnchor="middle"
                                      >
                                        {mapHeatMode === 'party'
                                          ? `${lga.leadingParty} · ${lga.leadingPct}%`
                                          : `${lga.reportingPct}% Collated`}
                                      </SvgText>
                                      {cellH > 48 && (
                                        <SvgText
                                          x={startX + cellW / 2}
                                          y={startY + 47}
                                          fill="#FFFFFF99"
                                          fontSize="7.5"
                                          textAnchor="middle"
                                        >
                                          {lga.baseCollated} / {lga.totalPus} PUs
                                        </SvgText>
                                      )}
                                    </G>
                                  );
                                });
                              })()}
                            </G>
                          )}
                        </G>
                      ) : (
                        <G key="state-layer">
                          {/* Atlantic Ocean Backdrop */}
                          <Path
                            d="M 0 510 Q 240 490 680 515 L 680 560 L 0 560 Z"
                            fill="#0284C720"
                          />
                          <SvgText x={340} y={545} fill="#38BDF855" fontSize="11" fontWeight="bold" textAnchor="middle">
                            GULF OF GUINEA · ATLANTIC OCEAN
                          </SvgText>

                          {/* Tactical Coordinate Grid Crosshairs */}
                          <Path d="M 0 140 L 680 140" stroke="#FFFFFF08" strokeWidth="1" strokeDasharray="4,4" />
                          <Path d="M 0 280 L 680 280" stroke="#FFFFFF08" strokeWidth="1" strokeDasharray="4,4" />
                          <Path d="M 0 420 L 680 420" stroke="#FFFFFF08" strokeWidth="1" strokeDasharray="4,4" />
                          <Path d="M 220 0 L 220 560" stroke="#FFFFFF08" strokeWidth="1" strokeDasharray="4,4" />
                          <Path d="M 460 0 L 460 560" stroke="#FFFFFF08" strokeWidth="1" strokeDasharray="4,4" />

                          {/* Authentic Rivers Niger & Benue Confluence */}
                          <Path
                            d={NIGERIA_RIVERS.riverNiger}
                            stroke="#38BDF866"
                            strokeWidth={2.5}
                            fill="none"
                          />
                          <Path
                            d={NIGERIA_RIVERS.riverBenue}
                            stroke="#38BDF866"
                            strokeWidth={2.5}
                            fill="none"
                          />
                          <Path
                            d={NIGERIA_RIVERS.lowerNiger}
                            stroke="#38BDF888"
                            strokeWidth={3}
                            fill="none"
                          />
                          <Circle
                            cx={NIGERIA_RIVERS.confluence.x}
                            cy={NIGERIA_RIVERS.confluence.y}
                            r={3.5}
                            fill="#38BDF8"
                          />
                          <SvgText x={145} y={255} fill="#38BDF855" fontSize="9" fontWeight="bold">
                            R. Niger
                          </SvgText>
                          <SvgText x={410} y={315} fill="#38BDF855" fontSize="9" fontWeight="bold">
                            R. Benue
                          </SvgText>

                          {/* Telemetry Headers */}
                          <SvgText x={340} y={24} fill="#34D39944" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                            FEDERAL REPUBLIC OF NIGERIA · 37 STATE HUBS
                          </SvgText>
                          <SvgText x={640} y={28} fill="#34D399" fontSize="10" fontWeight="bold" textAnchor="middle">
                            ▲ N
                          </SvgText>
                          <SvgText x={640} y={40} fill="#34D39966" fontSize="8" textAnchor="middle">
                            09°04'N
                          </SvgText>

                          {/* Complete Authentic 37 States + FCT Polygons */}
                          {stateHeatmapData.map((st) => {
                            const geom = NIGERIA_STATE_GEOMETRIES[st.id];
                            if (!geom) return null;
                            const isSelected = selectedMapStateId === st.id;
                            const fill = getLgaFillColor(st);

                            return (
                              <G
                                key={st.id}
                                onPress={() => {
                                  impact(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedMapStateId(st.id);
                                  setActiveLgaState(st.name);
                                }}
                              >
                                {isSelected && (
                                  <Path
                                    d={geom.path}
                                    fill="none"
                                    stroke="#34D399"
                                    strokeWidth={6}
                                    strokeOpacity={0.65}
                                  />
                                )}
                                <Path
                                  d={geom.path}
                                  fill={fill}
                                  fillOpacity={isSelected ? 0.96 : 0.82}
                                  stroke={isSelected ? '#FFFFFF' : '#040B06'}
                                  strokeWidth={isSelected ? 2.5 : 1.1}
                                />
                                {/* State Code Pill Plate */}
                                <Rect
                                  x={geom.labelX - 16}
                                  y={geom.labelY - 9}
                                  width={32}
                                  height={18}
                                  rx={4}
                                  fill="#040B06DD"
                                  stroke={isSelected ? '#FDE047' : '#FFFFFF20'}
                                  strokeWidth={isSelected ? 1.5 : 0.6}
                                />
                                <SvgText
                                  x={geom.labelX}
                                  y={geom.labelY + 4}
                                  fill={isSelected ? '#FDE047' : '#FFFFFF'}
                                  fontSize="9"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {geom.code}
                                </SvgText>
                              </G>
                            );
                          })}
                        </G>
                      )}
                    </Svg>
                  </View>

                  {/* Legend Bar */}
                  <View style={styles.mapLegendRow}>
                    {mapHeatMode === 'party' ? (
                      <>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#0D6338' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">CPA</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">DPP</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">PL</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">PPNF</ThemedText>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">90%+ (Hot)</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">80-90%</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">65-80%</ThemedText>
                        </View>
                        <View style={styles.legendPill}>
                          <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">&lt;65%</ThemedText>
                        </View>
                      </>
                    )}
                  </View>
                  {/* Integrated Inspection HUD directly in Map Footer */}
                  {geoLevel === 'state' && selectedMapState && (
                    <View style={[styles.integratedHud, { backgroundColor: '#0D2619', borderColor: '#1B4D33' }]}>
                      <Pressable
                        onPress={() => {
                          impact(Haptics.ImpactFeedbackStyle.Light);
                          setInspectModalUnit(selectedMapState);
                        }}
                        style={{ flex: 1, minWidth: 0, gap: 2 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Inspect telemetry for ${selectedMapState.name}`}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={styles.liveDot} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">
                            {selectedMapState.name} State ({selectedMapState.code})
                          </ThemedText>
                          <View
                            style={[
                              styles.partyPill,
                              {
                                backgroundColor: PARTY_COLORS[selectedMapState.leadingParty] ?? colors.primary,
                                paddingVertical: 1,
                                paddingHorizontal: 6,
                              },
                            ]}
                          >
                            <ThemedText variant="label" color="#FFFFFF" fontFamily="bold">
                              {selectedMapState.leadingParty}
                            </ThemedText>
                          </View>
                          <ThemedText variant="label" style={{ color: '#FDE047' }} fontFamily="bold">
                            +{selectedMapState.margin}%
                          </ThemedText>
                        </View>
                        <ThemedText variant="label" color="#A3E6C2">
                          {selectedMapState.leadingCandidate} · {selectedMapState.baseCollated.toLocaleString()} of {selectedMapState.totalPus.toLocaleString()} PUs ({selectedMapState.reportingPct}%)
                        </ThemedText>
                      </Pressable>
                      <Button
                        label="Drill LGAs"
                        size="sm"
                        rightIcon="chevron-forward"
                        onPress={() => {
                          impact(Haptics.ImpactFeedbackStyle.Medium);
                          handleDrillToState(selectedMapState.name);
                        }}
                        accessibilityLabel={`Drill down to LGAs for ${selectedMapState.name}`}
                      />
                    </View>
                  )}

                  {geoLevel === 'lga' && selectedMapLga && (
                    <View style={[styles.integratedHud, { backgroundColor: '#0D2619', borderColor: '#1B4D33' }]}>
                      <Pressable
                        onPress={() => {
                          impact(Haptics.ImpactFeedbackStyle.Light);
                          setInspectModalUnit(selectedMapLga);
                        }}
                        style={{ flex: 1, minWidth: 0, gap: 2 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Inspect telemetry for ${selectedMapLga.name}`}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={styles.liveDot} />
                          <ThemedText variant="caption" color="#FFFFFF" fontFamily="bold">
                            {selectedMapLga.name} ({selectedMapLga.state})
                          </ThemedText>
                          <View
                            style={[
                              styles.partyPill,
                              {
                                backgroundColor: PARTY_COLORS[selectedMapLga.leadingParty] ?? colors.primary,
                                paddingVertical: 1,
                                paddingHorizontal: 6,
                              },
                            ]}
                          >
                            <ThemedText variant="label" color="#FFFFFF" fontFamily="bold">
                              {selectedMapLga.leadingParty}
                            </ThemedText>
                          </View>
                          <ThemedText variant="label" style={{ color: '#FDE047' }} fontFamily="bold">
                            +{selectedMapLga.margin}%
                          </ThemedText>
                        </View>
                        <ThemedText variant="label" color="#A3E6C2">
                          {selectedMapLga.leadingCandidate} · {selectedMapLga.baseCollated} of {selectedMapLga.totalPus} PUs ({selectedMapLga.reportingPct}%)
                        </ThemedText>
                      </Pressable>
                      <Button
                        label="Inspect PUs"
                        size="sm"
                        rightIcon="arrow-forward"
                        onPress={() => {
                          impact(Haptics.ImpactFeedbackStyle.Medium);
                          handleInspectLga(selectedMapLga.name);
                        }}
                        accessibilityLabel={`Inspect PUs for ${selectedMapLga.name}`}
                      />
                    </View>
                  )}
                </Card>

                {/* Collation Leaderboard Header & Inline Party Filters */}
                <View style={styles.leaderboardHeaderRow}>
                  <View>
                    <ThemedText variant="title" color="text" fontFamily="bold">
                      {geoLevel === 'state' ? 'State Returns' : 'LGA Returns'}
                    </ThemedText>
                    <ThemedText variant="label" color="textSecondary">
                      {geoLevel === 'state' ? 'Ranked by reporting completion' : 'Ranked returns across monitored districts'}
                    </ThemedText>
                  </View>

                  {/* Compact Party Filter Chips */}
                  <View style={styles.compactPartyFilterRow}>
                    {(['ALL', 'CPA', 'DPP', 'PL', 'PPNF'] as const).map((party) => {
                      const isSelected = partyFilter === party;
                      const pColors: Record<string, string> = {
                        CPA: '#0D6338',
                        DPP: '#DC2626',
                        PL: '#16A34A',
                        PPNF: '#2563EB',
                        ALL: colors.text,
                      };
                      const color = pColors[party] ?? colors.text;

                      return (
                        <Pressable
                          key={party}
                          onPress={() => {
                            impact(Haptics.ImpactFeedbackStyle.Light);
                            setPartyFilter(party);
                          }}
                          style={[
                            styles.compactFilterChip,
                            {
                              backgroundColor: isSelected ? color : colors.surfaceElevated,
                              borderColor: isSelected ? color : colors.border,
                            },
                          ]}
                        >
                          <ThemedText
                            variant="label"
                            color={isSelected ? '#FFFFFF' : 'textSecondary'}
                            fontFamily={isSelected ? 'bold' : 'medium'}
                          >
                            {party}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            }
            renderItem={renderGeoItem}
          />
        )}

        {/* Tactical Unit Collation Inspection Modal (Full Interactive Telemetry - Parity with aquilaweb) */}
        <Modal
          visible={!!inspectModalUnit}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectModalUnit(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setInspectModalUnit(null)} />
            <View style={[styles.inspectModalContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {inspectModalUnit && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                  {/* Header */}
                  <View style={[styles.inspectModalHeader, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minWidth: 0 }}>
                      <View style={[styles.modalIconBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons
                          name={'zone' in inspectModalUnit ? 'globe-outline' : 'location-outline'}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ThemedText variant="title" color="text" fontFamily="bold" numberOfLines={1}>
                            {inspectModalUnit.name}
                          </ThemedText>
                          <View style={[styles.codeBadge, { backgroundColor: colors.surface }]}>
                            <ThemedText variant="caption" color="textSecondary" fontFamily="bold">
                              {'zone' in inspectModalUnit ? inspectModalUnit.code : inspectModalUnit.state}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText variant="caption" color="textSecondary">
                          {'zone' in inspectModalUnit
                            ? `${inspectModalUnit.zone} · National Administrative Hub`
                            : `${inspectModalUnit.state} State Electoral District`}
                        </ThemedText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setInspectModalUnit(null)}
                      hitSlop={10}
                      style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
                      accessibilityLabel="Close unit inspection modal"
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Collation Progress Strip */}
                  <View style={[styles.modalCollationCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText variant="caption" color="textSecondary" fontFamily="bold">
                        POLLING UNIT COLLATION
                      </ThemedText>
                      <ThemedText variant="body" color="primary" fontFamily="bold">
                        {inspectModalUnit.reportingPct}% Complete
                      </ThemedText>
                    </View>
                    <View style={[styles.modalProgressTrack, { backgroundColor: colors.borderSubtle }]}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            width: `${Math.min(100, inspectModalUnit.reportingPct)}%` as `${number}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText variant="caption" color="textSecondary">
                        {inspectModalUnit.baseCollated.toLocaleString()} of {inspectModalUnit.totalPus.toLocaleString()} PUs Collated
                      </ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <ThemedText variant="caption" color="primary" fontFamily="bold">
                          Verified Returns
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Projected Leader Card */}
                  {(() => {
                    const partyCol = PARTY_COLORS[inspectModalUnit.leadingParty] ?? colors.primary;
                    return (
                      <View style={[styles.modalLeaderCard, { backgroundColor: partyCol + '15', borderColor: partyCol + '44' }]}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="caption" color="textSecondary" fontFamily="bold">
                            PROJECTED LEADER
                          </ThemedText>
                          <ThemedText variant="body" color="text" fontFamily="bold" style={{ marginTop: 2 }}>
                            {inspectModalUnit.leadingCandidate}
                          </ThemedText>
                          <ThemedText variant="caption" color="textSecondary">
                            Margin of Lead: <ThemedText variant="caption" color="text" fontFamily="bold">+{inspectModalUnit.margin}%</ThemedText>
                          </ThemedText>
                        </View>
                        <View style={[styles.modalLeaderBadge, { backgroundColor: partyCol + '25', borderColor: partyCol }]}>
                          <ThemedText variant="label" style={{ color: partyCol }} fontFamily="bold">
                            {inspectModalUnit.leadingParty} ({inspectModalUnit.leadingPct}%)
                          </ThemedText>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Candidate & Party Distribution */}
                  <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                    <ThemedText variant="label" color="textSecondary" fontFamily="bold">
                      PARTY VOTE SHARES ({inspectModalUnit.totalVotes.toLocaleString()} TOTAL VOTES)
                    </ThemedText>
                    {inspectModalUnit.shares.map((share) => {
                      const partyColor = PARTY_COLORS[share.party] ?? colors.text;
                      return (
                        <View
                          key={share.party}
                          style={[styles.modalShareRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={[styles.partyDot, { backgroundColor: partyColor }]} />
                              <ThemedText variant="body" color="text" fontFamily="bold">
                                {share.party}
                              </ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <ThemedText variant="caption" color="textSecondary" fontFamily="medium">
                                {share.votes.toLocaleString()} votes
                              </ThemedText>
                              <ThemedText variant="body" style={{ color: partyColor }} fontFamily="bold">
                                {share.pct.toFixed(1)}%
                              </ThemedText>
                            </View>
                          </View>
                          <View style={[styles.modalShareTrack, { backgroundColor: colors.borderSubtle }]}>
                            <View
                              style={[
                                styles.modalShareFill,
                                {
                                  width: `${Math.min(100, share.pct)}%` as `${number}%`,
                                  backgroundColor: partyColor,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Modal Actions */}
                  <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                    {'zone' in inspectModalUnit && (
                      <Button
                        label={`Explore ${inspectModalUnit.name} LGAs`}
                        variant="outline"
                        leftIcon="map-outline"
                        onPress={() => {
                          const unitName = inspectModalUnit.name;
                          setInspectModalUnit(null);
                          handleDrillToState(unitName);
                        }}
                        fullWidth
                      />
                    )}
                    <Button
                      label={`Audit Polling Units in ${inspectModalUnit.name}`}
                      variant="primary"
                      leftIcon="shield-checkmark-outline"
                      rightIcon="chevron-forward"
                      onPress={() => {
                        const unitName = inspectModalUnit.name;
                        setInspectModalUnit(null);
                        handleInspectLga(unitName);
                      }}
                      fullWidth
                    />
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
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
    gap: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  activeTabBtn: {
    ...shadows.sm,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 110,
  },
  itemCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  leadStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  mainViewSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  mainViewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tabBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 0,
    flexShrink: 1,
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBarTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  reportingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  leadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 8,
  },
  partyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  stackedBarContainer: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  stackedBar: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  shareLegendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    marginTop: 2,
  },
  mapContainerCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  satelliteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#040B07',
  },
  mapLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF12',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  zoneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  clearFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  stateSelectorContainer: {
    paddingVertical: 2,
  },
  stateSelectorScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  unifiedHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 6,
  },
  pillTrack: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  activePillBtn: {
    ...shadows.sm,
  },
  integratedHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    gap: 8,
  },
  hudActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  leaderboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  compactPartyFilterRow: {
    flexDirection: 'row',
    gap: 4,
  },
  compactFilterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  rowRankBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniStackedBar: {
    height: 5,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    width: '100%',
    marginTop: 2,
  },
  rowReportingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  rowActionBtn: {
    padding: 3,
  },
  tacticalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderRadius: radius.md,
    borderWidth: border.thin,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchInputText: {
    flex: 1,
    fontSize: typography.label,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  telemetryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing['2xs'] + spacing['3xs'],
    borderBottomWidth: border.thin,
    borderBottomColor: '#142D1E',
    marginBottom: spacing['2xs'] + spacing['3xs'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  inspectModalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  inspectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  modalCollationCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: 6,
  },
  modalProgressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  modalLeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  modalLeaderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modalShareRow: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  partyDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  modalShareTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  modalShareFill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
