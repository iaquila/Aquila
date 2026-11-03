import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenView } from '@/core/components/ScreenView';
import { ThemedText, Button, Input, Card, ExpandableText } from '@/core/components';
import { useResultsStore, useAuthStore, ResultSubmission } from '@/features/auth/store';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { spacing, shadows, radius, border } from '@/constants/tokens';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { useStatusBar } from '@/core/hooks/useStatusBar';
import { useDeviceLocation } from '@/core/hooks/useDeviceLocation';
import { useCandidatesQuery, usePollingUnitsQuery, useResultsQuery } from '@/features/elections/hooks';
import { ROUTES } from '@/constants/routes';
import { ASSIGNED_DEMO_PUS } from '@/constants/elections';
import { loadSheetOcr, extractTextFromPages, parseResultSheet, rasterisePdf, scanDocumentPages, type SheetScanResult, type SheetCaptureSource } from '@/features/elections/sheetScan';
import { FEATURES } from '@/constants/features';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type VoteInput = {
  inec: string;
  observed: string;
};

export default function SubmitResultScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' });

  const {
    electionId,
    pollingUnitId: preselectedPuId,
    pollingUnitName: preselectedPuName,
    draftId,
  } = useLocalSearchParams<{
    electionId?: string;
    pollingUnitId?: string;
    pollingUnitName?: string;
    draftId?: string;
  }>();

  const resolvedElectionId = electionId ?? 'e1';
  const { data: candidates = [] } = useCandidatesQuery(resolvedElectionId);
  const { data: allPollingUnits = [] } = usePollingUnitsQuery();
  const { data: allResults = [] } = useResultsQuery();
  const { user } = useAuthStore();
  const { submissions, addSubmission, updateSubmission } = useResultsStore();

  const existingDraft = draftId ? submissions.find((s) => s.id === draftId) : null;

  const isPollingAgent = user?.role === 'POLLING_AGENT';
  // Until an INEC feed exists the agent types the recorded figures; once it lands this flips to false
  // and the fields render as locked values sourced from the uploaded record.
  const inecReadOnly = !FEATURES.ENABLE_INEC_MANUAL_ENTRY;
  const assignedPuId = user?.assignedLocations?.[0];
  const assignedPu = assignedPuId ? ASSIGNED_DEMO_PUS.find((pu) => pu.id === assignedPuId) : undefined;

  const [selectedPuId, setSelectedPuId] = useState(
    existingDraft?.pollingUnitId ?? preselectedPuId ?? assignedPu?.id ?? ''
  );
  const [selectedPuName, setSelectedPuName] = useState(
    existingDraft?.pollingUnitName ?? preselectedPuName ?? assignedPu?.name ?? ''
  );

  // A Polling Unit Agent reports from their single assigned station - the unit is never selectable.
  const [votes, setVotes] = useState<Record<string, VoteInput>>({});
  const [rejectedInec, setRejectedInec] = useState(existingDraft?.rejectedVotesInec ? String(existingDraft.rejectedVotesInec) : '');
  const [rejectedObs, setRejectedObs] = useState(existingDraft?.rejectedVotes ? String(existingDraft.rejectedVotes) : '');
  const [accredited, setAccredited] = useState(existingDraft?.totalAccreditedVoters ? String(existingDraft.totalAccreditedVoters) : '');
  const [accreditedInec, setAccreditedInec] = useState(
    existingDraft?.accreditedVotersInec ? String(existingDraft.accreditedVotersInec) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [sheetSource, setSheetSource] = useState<SheetCaptureSource | undefined>(undefined);
  const [scanDebugLines, setScanDebugLines] = useState<string[]>([]);
  const { coordinates: deviceCoords } = useDeviceLocation({ latitude: 6.600, longitude: 3.350 });

  const handleAutoMatchInec = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVotes((prev) => {
      const updated: Record<string, VoteInput> = {};
      candidates.forEach((c) => {
        const obs = prev[c.id]?.observed ?? '';
        updated[c.id] = { observed: obs, inec: obs };
      });
      return updated;
    });
    if (rejectedObs) {
      setRejectedInec(rejectedObs);
    }
    if (accredited) {
      setAccreditedInec(accredited);
    }
  };

  // Prepopulate draft votes if opening an existing draft
  useEffect(() => {
    if (existingDraft?.candidateVotes) {
      const initVotes: Record<string, VoteInput> = {};
      Object.entries(existingDraft.candidateVotes).forEach(([cId, v]) => {
        initVotes[cId] = {
          observed: String(v),
          inec: existingDraft.candidateVotesInec ? String(existingDraft.candidateVotesInec[cId] ?? '') : '',
        };
      });
      setVotes(initVotes);
    }
  }, [existingDraft]);

  useFocusEffect(
    useCallback(() => {
      const picked = useAuthStore.getState().consumeTransientPickerPU();
      const role = useAuthStore.getState().user?.role;
      if (picked && role !== 'POLLING_AGENT') {
        setSelectedPuId(picked.id);
        setSelectedPuName(picked.name);
      }
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );

  useEffect(() => {
    if (preselectedPuId) {
      setSelectedPuId(preselectedPuId);
      if (preselectedPuName) setSelectedPuName(preselectedPuName);
    } else if (isPollingAgent && assignedPu) {
      setSelectedPuId(assignedPu.id);
      setSelectedPuName(assignedPu.name);
    }
  }, [preselectedPuId, preselectedPuName, isPollingAgent, assignedPu]);

  // A Polling Unit Agent reports from their single assigned station - the unit is never selectable.
  const effectivePuId = isPollingAgent && assignedPu ? assignedPu.id : selectedPuId;
  const resolvedPuCode = ASSIGNED_DEMO_PUS.find((pu) => pu.id === effectivePuId)?.code;

  const resolvedPuName =
    (isPollingAgent ? assignedPu?.name : undefined) ||
    selectedPuName ||
    allPollingUnits.find((p) => p.id === selectedPuId)?.name ||
    'Unassigned Polling Unit';

  const applyParsedSheet = (parsed: SheetScanResult, source: SheetCaptureSource) => {
    if (parsed.matchedCandidates === 0 && parsed.accredited === undefined) {
      Alert.alert('Nothing read', 'No result-sheet figures were recognised. Retake the sheet in good light, or enter manually.');
      return;
    }

    setVotes((prev) => {
      const next = { ...prev };
      Object.entries(parsed.candidateVotes).forEach(([candidateId, voteCount]) => {
        next[candidateId] = { inec: next[candidateId]?.inec ?? '', observed: String(voteCount) };
      });
      return next;
    });
    if (parsed.accredited !== undefined) setAccredited(String(parsed.accredited));
    if (parsed.rejected !== undefined) setRejectedObs(String(parsed.rejected));
    setSheetSource(source);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Sheet captured',
      `${parsed.matchedCandidates}/${candidates.length} candidates read (${Math.round(parsed.confidence * 100)}%). Review every figure before publishing.`
    );
  };

  const handleScanSheet = async (source: SheetCaptureSource) => {
    const ocr = await loadSheetOcr();
    if (!ocr) {
      Alert.alert(
        'Scanner unavailable',
        'Sheet scanning needs a build that includes the OCR module. Enter the figures manually for this session.'
      );
      return;
    }

    let pageUris: string[] = [];

    if (source === 'LIVE_CAMERA') {
      // Native scanner: edge detection, crop and de-skew before OCR.
      const scan = await scanDocumentPages();
      if (scan.status === 'cancelled') return;
      if (scan.status === 'unavailable') {
        Alert.alert('Scanner unavailable', 'The document scanner needs a build that includes it. Choose a photo or enter manually.');
        return;
      }
      if (scan.pages.length === 0) {
        Alert.alert('Nothing scanned', 'No page was captured. Try again.');
        return;
      }
      pageUris = scan.pages;
    } else {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Allow access to photos to choose the result sheet.');
          return;
        }
        const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, mediaTypes: ['images'] });
        if (picked.canceled || !picked.assets?.[0]) return;
        pageUris = [picked.assets[0].uri];
      } catch {
        Alert.alert('Photos unavailable', 'Could not open the photo library. Try again or enter manually.');
        return;
      }
    }

    setScanning(true);
    try {
      const lines = await extractTextFromPages(pageUris);
      setScanDebugLines(lines);
      if (lines.length === 0) {
        Alert.alert('No text detected', 'The sheet was captured but no text was recognised. Check the OCR OUTPUT panel, or enter the figures manually.');
        return;
      }
      applyParsedSheet(parseResultSheet(lines, candidates), source);
    } catch {
      Alert.alert('Scan failed', 'The sheet could not be read. Try again or enter the figures manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleImportPdf = async () => {
    const ocr = await loadSheetOcr();
    if (!ocr) {
      Alert.alert(
        'Scanner unavailable',
        'PDF reading needs a build that includes the OCR module. Enter the figures manually for this session.'
      );
      return;
    }

    let picked: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    } catch {
      Alert.alert('File picker unavailable', 'Could not open the file picker. Try again or enter manually.');
      return;
    }
    if (picked.canceled || !picked.assets?.[0]) return;

    setScanning(true);
    try {
      const pdf = await rasterisePdf(picked.assets[0].uri);
      if (pdf.status === 'unavailable') {
        Alert.alert('PDF support unavailable', 'PDF reading needs a build that includes it. Scan the paper sheet instead.');
        return;
      }
      if (pdf.status === 'failed' || pdf.pages.length === 0) {
        Alert.alert('PDF unreadable', 'That PDF could not be rendered. Scan the paper sheet or choose a photo instead.');
        return;
      }
      const lines = await extractTextFromPages(pdf.pages);
      setScanDebugLines(lines);
      if (lines.length === 0) {
        Alert.alert('No text detected', 'The PDF was rendered but no text was recognised. Check the OCR OUTPUT panel, or enter the figures manually.');
        return;
      }
      applyParsedSheet(parseResultSheet(lines, candidates), 'LIBRARY');
    } catch {
      Alert.alert('PDF scan failed', 'The document could not be read. Scan the paper sheet instead.');
    } finally {
      setScanning(false);
    }
  };

  const handleVoteChange = (candidateId: string, field: 'inec' | 'observed', value: string) => {
    setVotes((prev) => ({
      ...prev,
      [candidateId]: {
        ...(prev[candidateId] ?? { inec: '', observed: '' }),
        [field]: value.replace(/[^0-9]/g, ''),
      },
    }));
  };

  // Ballot accounting: observed field count vs what INEC's uploaded record says.
  // Valid votes are the sum of candidate votes - never entered separately, so the figures always reconcile.
  // The INEC column is sourced from the uploaded record for this unit when it is locked; otherwise the
  // agent's typed figures win. Same store shape a real INEC feed will deliver.
  const inecRecord = allResults.find((r) => r.pollingUnitId === effectivePuId);
  const inecSource = inecReadOnly ? inecRecord : undefined;

  const inecVoteInput = (candidateId: string) =>
    inecSource
      ? String(inecSource.candidateVotesInec?.[candidateId] ?? '')
      : (votes[candidateId]?.inec ?? '');

  const observedVoteTotal = candidates.reduce(
    (acc, c) => acc + (parseInt(votes[c.id]?.observed ?? '0', 10) || 0),
    0
  );
  const inecVoteTotal = candidates.reduce(
    (acc, c) => acc + (parseInt(inecVoteInput(c.id) || '0', 10) || 0),
    0
  );

  const accreditedObserved = parseInt(accredited || '0', 10) || 0;
  const accreditedInecValue = inecSource
    ? (inecSource.accreditedVotersInec ?? inecSource.totalAccreditedVoters)
    : parseInt(accreditedInec || '0', 10) || 0;
  const rejectedObserved = parseInt(rejectedObs || '0', 10) || 0;
  const rejectedInecValue = inecSource
    ? (inecSource.rejectedVotesInec ?? 0)
    : parseInt(rejectedInec || '0', 10) || 0;
  // A polling unit officer cannot cancel votes - cancellations are applied at collation level,
  // so the agent side is always 0 and the INEC side only reflects what the record already carries.
  const cancelledObserved = 0;
  const cancelledInecValue = inecSource?.cancelledVotesInec ?? 0;

  // Cancelled ballots never enter the box, so they stay out of the cast total.
  const ballotsCastObserved = observedVoteTotal + rejectedObserved;
  const ballotsCastInec = inecVoteTotal + rejectedInecValue;
  // Accredited voters whose ballots never surfaced (took the ballot and left).
  const unaccountedObserved =
    accreditedObserved - (observedVoteTotal + rejectedObserved + cancelledObserved);

  const exceedsAccredited = accreditedObserved > 0 && ballotsCastObserved > accreditedObserved;
  const accreditationOverdrawn = accreditedObserved > 0 && unaccountedObserved < 0;
  const ballotIntegrityOk = !exceedsAccredited && !accreditationOverdrawn;

  const handleSaveDraft = async () => {
    if (!effectivePuId) {
      Alert.alert('Polling Unit Required', 'Please select a polling unit first.');
      return;
    }
    setSubmitting(true);
    const candidateVotes: Record<string, number> = {};
    const candidateVotesInec: Record<string, number> = {};

    candidates.forEach((c) => {
      const vObs = parseInt(votes[c.id]?.observed ?? '0', 10);
      const vInec = parseInt(inecVoteInput(c.id) || '0', 10);
      candidateVotes[c.id] = isNaN(vObs) ? 0 : vObs;
      candidateVotesInec[c.id] = isNaN(vInec) ? 0 : vInec;
    });

    const payload: ResultSubmission = {
      id: draftId ?? `draft-${Date.now()}`,
      electionId: resolvedElectionId,
      pollingUnitId: effectivePuId,
      pollingUnitName: resolvedPuName,
      candidateVotes,
      candidateVotesInec,
      rejectedVotes: rejectedObserved,
      rejectedVotesInec: rejectedInecValue,
      totalAccreditedVoters: accreditedObserved,
      accreditedVotersInec: accreditedInecValue,
      ...(cancelledInecValue > 0 ? { cancelledVotesInec: cancelledInecValue } : {}),
      totalVotesCast: ballotsCastObserved,
      ...(sheetSource ? { sheetCaptureSource: sheetSource } : {}),
      status: 'DRAFT',
      latitude: deviceCoords?.latitude ?? 6.600,
      longitude: deviceCoords?.longitude ?? 3.350,
      submittedAt: new Date().toISOString(),
      submittedBy: user?.name ?? user?.email ?? 'Field Agent',
    };

    if (draftId) {
      updateSubmission(draftId, payload);
    } else {
      addSubmission(payload);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    router.replace(ROUTES.RESULT_DRAFTS as any);
  };

  const handlePublish = async () => {
    if (!effectivePuId) {
      Alert.alert('Polling Unit Required', 'Please select a polling unit before publishing.');
      return;
    }

    const totalCast = ballotsCastObserved;
    const accCount = accreditedObserved;

    if (accCount === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Accredited Voters Required', 'Please enter the total accredited voter count from BVAS.');
      return;
    }

    if (totalCast > accCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Over-Voting Warning',
        `Total ballots (${totalCast}) exceeds accredited voters (${accCount}). Do you still wish to submit for collation audit?`,
        [
          { text: 'Review Counts', style: 'cancel' },
          { text: 'Proceed', onPress: () => commitPublish() },
        ]
      );
      return;
    }

    commitPublish();
  };

  const commitPublish = () => {
    setSubmitting(true);
    const candidateVotes: Record<string, number> = {};
    const candidateVotesInec: Record<string, number> = {};

    candidates.forEach((c) => {
      const vObs = parseInt(votes[c.id]?.observed ?? '0', 10);
      const vInec = parseInt(inecVoteInput(c.id) || '0', 10);
      candidateVotes[c.id] = isNaN(vObs) ? 0 : vObs;
      candidateVotesInec[c.id] = isNaN(vInec) ? 0 : vInec;
    });

    const payload: ResultSubmission = {
      id: draftId ?? `r-${Date.now()}`,
      electionId: resolvedElectionId,
      pollingUnitId: effectivePuId,
      pollingUnitName: resolvedPuName,
      candidateVotes,
      candidateVotesInec,
      rejectedVotes: rejectedObserved,
      rejectedVotesInec: rejectedInecValue,
      totalAccreditedVoters: accreditedObserved,
      accreditedVotersInec: accreditedInecValue,
      ...(cancelledInecValue > 0 ? { cancelledVotesInec: cancelledInecValue } : {}),
      totalVotesCast: ballotsCastObserved,
      ...(sheetSource ? { sheetCaptureSource: sheetSource } : {}),
      status: 'PUBLISHED',
      latitude: deviceCoords?.latitude ?? 6.600,
      longitude: deviceCoords?.longitude ?? 3.350,
      submittedAt: new Date().toISOString(),
      submittedBy: user?.name ?? user?.email ?? 'Field Agent',
    };

    if (draftId) {
      updateSubmission(draftId, payload);
    } else {
      addSubmission(payload);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    router.replace(ROUTES.RESULTS_TAB as any);
  };

  // Restrict Election Officer from entering field returns (Audio Part 6)
  if (user?.role === 'ELECTION_OFFICER') {
    return (
      <ScreenView scrollable={false}>
        <View style={styles.restrictedContainer}>
          <Card style={styles.restrictedCard}>
            <View style={[styles.restrictedIcon, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="shield-outline" size={32} color={colors.primary} />
            </View>
            <ThemedText variant="h3" color="primary" fontFamily="bold" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Election Officer Supervisory Mandate
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={{ textAlign: 'center', marginVertical: spacing.sm }}>
              As an Election Officer, your console is dedicated to monitoring, verification, and collation audit. Field ballot return entry is strictly reserved for Polling Unit Agents and Field Agents.
            </ThemedText>
            <Button
              label="Go to Collation Room"
              variant="primary"
              onPress={() => router.replace(ROUTES.RESULT_COLLATION as any)}
            />
          </Card>
        </View>
      </ScreenView>
    );
  }

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} behavior="padding" style={{ flex: 1 }}>
      <ScreenView scrollable contentContainerStyle={styles.scrollContent}>
      {/* Polling Unit Selector / Display */}
      <Card style={styles.sectionCard}>
        <ThemedText variant="label" color="textMuted" fontFamily="bold">
          POLLING UNIT ASSIGNMENT
        </ThemedText>
        <View style={styles.puDisplayRow}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" color="text" fontFamily="bold">
              {resolvedPuName}
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              PU Code: {resolvedPuCode ?? (effectivePuId || 'Not set')} {isPollingAgent ? '· Sole Assigned Station' : ''}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['2xs'], marginTop: spacing['2xs'] }}>
              <Ionicons name="navigate-circle" size={13} color={colors.primary} />
              <ThemedText variant="label" color="primary" fontFamily="medium">
                GPS Lock: {deviceCoords ? `${deviceCoords.latitude.toFixed(4)}, ${deviceCoords.longitude.toFixed(4)}` : '6.6001, 3.3502 (Verified)'}
              </ThemedText>
            </View>
          </View>
          {!isPollingAgent && (
            <Button
              label="Change"
              variant="outline"
              size="sm"
              onPress={() => router.push({ pathname: ROUTES.PU_PICKER, params: { mode: 'result' } })}
            />
          )}
        </View>
      </Card>

      {/* Sheet capture: OCR fills the observed figures from a photo of the paper result sheet */}
      {FEATURES.ENABLE_RESULT_SHEET_SCAN && (
        <Card style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="scan-outline" size={18} color={colors.primary} />
            <ThemedText variant="title" color="text" fontFamily="bold">
              Scan Result Sheet
            </ThemedText>
          </View>
          <ThemedText variant="caption" color="textSecondary" style={{ marginTop: spacing['3xs'], marginBottom: spacing.sm }}>
            Photograph the signed EC8A and the observed figures fill in. Always review before publishing.
          </ThemedText>

          <Button
            label="Scan with camera"
            variant="primary"
            leftIcon="scan-outline"
            onPress={() => handleScanSheet('LIVE_CAMERA')}
            loading={scanning}
            fullWidth
          />

          {FEATURES.ENABLE_SHEET_LIBRARY_IMPORT && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Photo"
                  variant="outline"
                  size="sm"
                  leftIcon="images-outline"
                  onPress={() => handleScanSheet('LIBRARY')}
                  loading={scanning}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="PDF"
                  variant="outline"
                  size="sm"
                  leftIcon="document-outline"
                  onPress={handleImportPdf}
                  loading={scanning}
                  fullWidth
                />
              </View>
            </View>
          )}

          <View style={[styles.provenanceRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons
              name={sheetSource === 'LIBRARY' ? 'images-outline' : 'camera-outline'}
              size={13}
              color={colors.textMuted}
            />
            <ThemedText variant="label" color="textMuted" style={{ flex: 1, marginLeft: spacing['2xs'] }}>
              {sheetSource === 'LIVE_CAMERA'
                ? 'Captured live at this polling unit'
                : sheetSource === 'LIBRARY'
                  ? 'Imported image — flagged in the audit trail'
                  : 'Live captures are trusted; imported images are flagged.'}
            </ThemedText>
          </View>

          {/* Diagnostic: what the OCR actually returned, so a failed match can be diagnosed on-device */}
          {scanDebugLines.length > 0 && (
            <View style={[styles.debugBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <ThemedText variant="label" color="textMuted" fontFamily="bold">
                OCR OUTPUT · {scanDebugLines.length} LINES
              </ThemedText>
              <ExpandableText variant="micro" color="textSecondary" collapsedLines={8} style={{ marginTop: spacing['3xs'] }}>
                {scanDebugLines.join('\n')}
              </ExpandableText>
              <ThemedText variant="micro" color="textMuted" style={{ marginTop: spacing['3xs'] }}>
                Candidates expected: {candidates.map((c) => c.partyAcronym).join(', ')}
              </ThemedText>
            </View>
          )}
        </Card>
      )}

      {/* Ballot accounting: observed field count vs the INEC uploaded record */}
      <Card style={styles.sectionCard}>
        <ThemedText variant="label" color="textMuted" fontFamily="bold">
          BALLOT ACCOUNTING
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" style={{ marginBottom: spacing.sm }}>
          Left is what your agent observed, right is what INEC recorded.
        </ThemedText>

        <View style={styles.pairHeaderRow}>
          <ThemedText variant="label" color="textMuted" fontFamily="bold" style={styles.pairCol}>
            OBSERVED
          </ThemedText>
          <ThemedText variant="label" color="textMuted" fontFamily="bold" style={styles.pairCol}>
            INEC RECORD
          </ThemedText>
        </View>

        {[
          {
            key: 'accredited',
            label: 'Accredited Voters',
            icon: 'people-outline' as const,
            placeholder: 'e.g. 600',
            observedValue: accredited,
            onObservedChange: setAccredited,
            inecValue: inecSource ? String(accreditedInecValue) : accreditedInec,
            onInecChange: setAccreditedInec,
          },
          {
            key: 'rejected',
            label: 'Rejected Ballot Papers',
            icon: 'close-circle-outline' as const,
            placeholder: '0',
            observedValue: rejectedObs,
            onObservedChange: setRejectedObs,
            inecValue: inecSource ? String(rejectedInecValue) : rejectedInec,
            onInecChange: setRejectedInec,
          },
        ].map((row) => (
          <View key={row.key}>
            <ThemedText variant="label" color="textMuted" fontFamily="bold" style={{ marginBottom: spacing['3xs'] }}>
              {row.label}
            </ThemedText>
            <View style={styles.pairRow}>
              <View style={styles.pairCol}>
                <Input
                  placeholder={row.placeholder}
                  value={row.observedValue}
                  onChangeText={row.onObservedChange}
                  keyboardType="number-pad"
                  leftIcon={row.icon}
                />
              </View>
              <View style={styles.pairCol}>
                <Input
                  placeholder="0"
                  value={row.inecValue}
                  onChangeText={row.onInecChange}
                  readOnly={inecReadOnly}
                  keyboardType="number-pad"
                  leftIcon={row.icon}
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.inecSourceRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <ThemedText variant="label" color="textMuted" style={{ flex: 1, marginLeft: spacing['2xs'] }}>
            Cancellations are applied at collation, not at the polling unit.
          </ThemedText>
        </View>

        {inecReadOnly && (
          <View style={styles.inecSourceRow}>
            <Ionicons
              name={inecRecord ? 'cloud-done-outline' : 'cloud-upload-outline'}
              size={14}
              color={colors.textMuted}
            />
            <ThemedText variant="caption" color="textMuted" style={{ flex: 1, marginLeft: spacing['2xs'] }}>
              {inecRecord
                ? 'INEC column sourced from the uploaded record for this unit.'
                : 'Awaiting INEC upload for this unit.'}
            </ThemedText>
          </View>
        )}

        {/* Derived figures - never typed, so the arithmetic always reconciles */}
        <View style={[styles.reconcileBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.reconcileRow}>
            <ThemedText variant="label" color="textMuted" fontFamily="bold" style={{ flex: 1 }}>
              DERIVED
            </ThemedText>
            <ThemedText variant="label" color="textMuted" fontFamily="bold" style={styles.reconcileValue}>
              OBSERVED
            </ThemedText>
            <ThemedText variant="label" color="textMuted" fontFamily="bold" style={styles.reconcileValue}>
              INEC
            </ThemedText>
          </View>

          {[
            { label: 'Total Valid Votes', observed: observedVoteTotal, inec: inecVoteTotal },
            { label: 'Total Votes Cast', observed: ballotsCastObserved, inec: ballotsCastInec },
            // Only surfaced when a collation record actually carries a cancellation.
            ...(cancelledInecValue > 0
              ? [{ label: 'Cancelled Votes', observed: cancelledObserved, inec: cancelledInecValue }]
              : []),
          ].map((row) => (
            <View key={row.label} style={[styles.reconcileRow, { borderTopColor: colors.borderSubtle }]}>
              <ThemedText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {row.label}
              </ThemedText>
              <ThemedText variant="body" color="text" fontFamily="bold" style={styles.reconcileValue}>
                {row.observed.toLocaleString()}
              </ThemedText>
              <ThemedText variant="body" color="primary" fontFamily="bold" style={styles.reconcileValue}>
                {row.inec.toLocaleString()}
              </ThemedText>
            </View>
          ))}

          <View style={[styles.reconcileRow, { borderTopColor: colors.borderSubtle }]}>
            <ThemedText variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Unaccounted (accredited − cast − cancelled)
            </ThemedText>
            <ThemedText
              variant="body"
              color={unaccountedObserved < 0 ? 'critical' : 'text'}
              fontFamily="bold"
              style={styles.reconcileValue}
            >
              {unaccountedObserved.toLocaleString()}
            </ThemedText>
            <ThemedText variant="body" color="textMuted" fontFamily="bold" style={styles.reconcileValue}>
              —
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Candidate Votes Breakdown */}
      <Card style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs }}>
          <View style={{ flex: 1, minWidth: 0, flexShrink: 1, paddingRight: spacing.xs }}>
            <ThemedText variant="title" color="text" fontFamily="bold">
              Candidate Ballots Tally
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              Observed votes per candidate, and what INEC recorded for the same unit
            </ThemedText>
          </View>
          {!inecReadOnly && (
            <Button
              label="Match INEC"
              variant="outline"
              size="sm"
              leftIcon="copy-outline"
              onPress={handleAutoMatchInec}
            />
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          {candidates.map((cand) => {
            const obsVal = votes[cand.id]?.observed ?? '';
            const inecVal = inecVoteInput(cand.id);

            return (
              <View key={cand.id} style={[styles.candVoteBox, { borderColor: colors.border }]}>
                <View style={styles.candVoteHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" color="text" fontFamily="bold">
                      {cand.fullName}
                    </ThemedText>
                    <ThemedText variant="label" color="primary" fontFamily="bold">
                      {cand.partyAcronym} · {cand.partyName}
                    </ThemedText>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Observed"
                      placeholder="0"
                      value={obsVal}
                      onChangeText={(val) => handleVoteChange(cand.id, 'observed', val)}
                      keyboardType="number-pad"
                      leftIcon="eye-outline"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="INEC Record"
                      placeholder="0"
                      value={inecVal}
                      onChangeText={(val) => handleVoteChange(cand.id, 'inec', val)}
                      readOnly={inecReadOnly}
                      keyboardType="number-pad"
                      leftIcon="checkmark-done-outline"
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Live Total Tally Strip */}
        <View style={[styles.totalStrip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText variant="body" color="text" fontFamily="bold">
            Total Ballots Counted:
          </ThemedText>
          <ThemedText variant="title" color="primary" fontFamily="bold">
            {ballotsCastObserved.toLocaleString()} votes
          </ThemedText>
        </View>

        {/* Real-time integrity banner: over-voting and accreditation reconciliation */}
        {accreditedObserved > 0 && (
          <View
            style={[
              styles.validationBanner,
              {
                backgroundColor: ballotIntegrityOk ? colors.successSubtle : colors.criticalSubtle,
                borderColor: ballotIntegrityOk ? colors.success : colors.critical,
              },
            ]}
          >
            <Ionicons
              name={ballotIntegrityOk ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={ballotIntegrityOk ? colors.success : colors.critical}
            />
            <View style={{ flex: 1, marginLeft: spacing.xs }}>
              <ThemedText
                variant="label"
                fontFamily="bold"
                style={{ color: ballotIntegrityOk ? colors.success : colors.critical }}
              >
                {exceedsAccredited
                  ? `Over-voting: ${ballotsCastObserved} cast exceeds ${accreditedObserved} accredited`
                  : accreditationOverdrawn
                    ? `Mismatch: valid, rejected and cancelled exceed ${accreditedObserved} accredited`
                    : `${ballotsCastObserved} cast · ${observedVoteTotal} valid · ${rejectedObserved} rejected · ${cancelledObserved} cancelled`}
              </ThemedText>
            </View>
          </View>
        )}
      </Card>

      {/* Actions: Save Draft vs Publish */}
      <View style={[styles.bottomActions, { flexDirection: 'column' }]}>
        <Button
          label="Save Draft"
          variant="outline"
          size="lg"
          leftIcon="save-outline"
          onPress={handleSaveDraft}
          loading={submitting}
          fullWidth
        />
        <Button
          label="Publish Return"
          variant="primary"
          size="lg"
          leftIcon="cloud-upload-outline"
          onPress={handlePublish}
          loading={submitting}
          fullWidth
        />
      </View>
      </ScreenView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  restrictedCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    width: '100%',
    ...shadows.md,
  },
  restrictedIcon: {
    width: spacing['3xl'],
    height: spacing['3xl'],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pairCol: {
    flex: 1,
    minWidth: 0,
  },
  pairHeaderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['3xs'],
  },
  inecSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    marginTop: spacing.sm,
  },
  debugBox: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    marginTop: spacing.sm,
  },
  reconcileBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  reconcileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing['2xs'] + spacing['3xs'],
    borderTopWidth: border.thin,
  },
  reconcileValue: {
    width: spacing['3xl'] + spacing.md,
    textAlign: 'right',
  },
  puDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  candVoteBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
  },
  candVoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
    marginTop: spacing.md,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
    marginTop: spacing.sm,
  },
});
