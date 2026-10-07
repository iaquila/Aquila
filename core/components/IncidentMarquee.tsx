import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  AccessibilityInfo,
  Pressable,
  ViewStyle,
} from 'react-native';
import { ThemedText } from '@/core/components/ThemedText';
import { spacing, radius } from '@/constants/tokens';
import Colors from '@/constants/colors';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import type { IncidentReport } from '@/features/auth/store';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import * as Haptics from 'expo-haptics';
import { useHaptics } from '@/core/hooks';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  incidents: IncidentReport[];
  style?: ViewStyle;
};

/**
 * Production-hardened Continuous Marquee Ticker.
 *
 * Gold-Standard Mobile Parity (Apple HIG / Material 3):
 * 1. Zero initial blank delay (starts at position 0, readable immediately on mount).
 * 2. True seamless infinite looping (duplicate track with zero visual jump or empty gap).
 * 3. Touch-and-hold pause (stops while user interacts so items don't slide under fingers).
 * 4. Respects system Accessibility "Reduce Motion" setting.
 * 5. Uses native driver for 60/120fps hardware-accelerated translation.
 */
export function IncidentMarquee({ incidents, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { impact } = useHaptics();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [cycleWidth, setCycleWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);

  const activeIncidents = incidents.slice(0, 8);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check accessibility reduced-motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  // Track current animated position for smooth pause/resume
  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      currentOffsetRef.current = value;
    });
    return () => translateX.removeListener(id);
  }, [translateX]);

  const startAnimation = useCallback(
    (fromVal: number) => {
      if (cycleWidth <= 0 || reduceMotion || !isMountedRef.current) return;

      let startVal = fromVal;
      if (startVal <= -cycleWidth || startVal >= 0) {
        translateX.setValue(0);
        startVal = 0;
      }

      // 40 points per second constant readable velocity
      const remainingDistance = cycleWidth + startVal;
      const duration = Math.max(1000, (remainingDistance / 40) * 1000);

      animRef.current?.stop();
      const anim = Animated.timing(translateX, {
        toValue: -cycleWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current = anim;

      anim.start(({ finished }) => {
        if (finished && isMountedRef.current) {
          translateX.setValue(0);
          currentOffsetRef.current = 0;
          startAnimation(0);
        }
      });
    },
    [cycleWidth, reduceMotion, translateX]
  );

  useEffect(() => {
    if (cycleWidth > 0 && !isPaused && !reduceMotion) {
      startAnimation(currentOffsetRef.current);
    }
    return () => animRef.current?.stop();
  }, [cycleWidth, isPaused, reduceMotion, startAnimation]);

  const handlePressIn = () => {
    setIsPaused(true);
    animRef.current?.stop();
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleIncidentPress = (incidentId: string) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: ROUTES.INCIDENT_DETAIL, params: { id: incidentId } });
  };

  if (activeIncidents.length === 0) return null;

  // Reduced motion accessible fallback
  if (reduceMotion) {
    return <IncidentMarqueeScrollable incidents={incidents} style={style} />;
  }

  const renderIncidentPill = (i: IncidentReport, keySuffix: string) => (
    <Pressable
      key={`${i.id}-${keySuffix}`}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => handleIncidentPress(i.id)}
      style={styles.incidentPill}
      accessibilityRole="button"
      accessibilityLabel={`Incident: ${i.category.replace(/_/g, ' ')} at ${i.electoralArea}`}
    >
      <ThemedText
        variant="caption"
        numberOfLines={1}
        style={{ color: colors.critical, fontWeight: '700', flexShrink: 0 }}
      >
        {i.category.replace(/_/g, ' ')}
      </ThemedText>
      <ThemedText
        variant="caption"
        numberOfLines={1}
        color="textSecondary"
        style={{ marginLeft: 4, flexShrink: 0 }}
      >
        @{i.electoralArea}: {i.description.slice(0, 48)}
      </ThemedText>
      <Ionicons
        name="chevron-forward"
        size={11}
        color={colors.critical}
        style={{ opacity: 0.8, marginLeft: 2, flexShrink: 0 }}
      />
      <ThemedText
        variant="caption"
        numberOfLines={1}
        color="textMuted"
        style={{ marginHorizontal: spacing.sm, flexShrink: 0 }}
      >
        •
      </ThemedText>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.critical + '14', borderColor: colors.critical + '30' },
        style,
      ]}
      accessibilityRole="none"
    >
      <View style={[styles.label, { backgroundColor: colors.critical }]}>
        <ThemedText variant="caption" numberOfLines={1} style={{ color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>
          LIVE
        </ThemedText>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.tickerRow, { transform: [{ translateX }] }]}
          pointerEvents="box-none"
        >
          {/* Primary Sequence (measured unconstrained to get true cycle width) */}
          <View
            style={styles.sequenceGroup}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && Math.abs(w - cycleWidth) > 2) {
                setCycleWidth(w);
              }
            }}
          >
            {activeIncidents.map((i) => renderIncidentPill(i, 'set1'))}
          </View>

          {/* Seamless Duplicate Sequence (guarantees zero empty gap) */}
          <View style={styles.sequenceGroup}>
            {activeIncidents.map((i) => renderIncidentPill(i, 'set2'))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/** Accessible non-animating fallback for Reduced Motion and assistive technologies */
export function IncidentMarqueeScrollable({ incidents, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { impact } = useHaptics();

  if (incidents.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.critical + '14', borderColor: colors.critical + '30' },
        style,
      ]}
    >
      <View style={[styles.label, { backgroundColor: colors.critical }]}>
        <ThemedText variant="caption" numberOfLines={1} style={{ color: '#fff', fontWeight: '800' }}>
          LIVE
        </ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.track}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {incidents.slice(0, 8).map((i) => (
          <Pressable
            key={i.id}
            onPress={() => {
              impact(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: ROUTES.INCIDENT_DETAIL, params: { id: i.id } });
            }}
            style={styles.incidentPill}
          >
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={{ color: colors.critical, fontWeight: '700', flexShrink: 0 }}
            >
              {i.category.replace(/_/g, ' ')}
            </ThemedText>
            <ThemedText
              variant="caption"
              numberOfLines={1}
              color="textSecondary"
              style={{ marginLeft: 4, flexShrink: 0 }}
            >
              @{i.electoralArea} •
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    height: 32,
  },
  label: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
    zIndex: 1,
  },
  track: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  sequenceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  incidentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
});
