import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { spacing, radius, border, sizes } from '@/constants/tokens';
import Colors from '@/constants/colors';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import type { IncidentReport } from '@/features/auth/store';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import * as Haptics from 'expo-haptics';
import { useHaptics } from '@/core/hooks';
import { Ionicons } from '@expo/vector-icons';

/**
 * One row of the live feed. Incidents and published returns share the same pill grammar:
 * "what happened, where, and the number that matters".
 */
export type MarqueeItem = {
  id: string;
  kind: 'incident' | 'result';
  label: string;
  area: string;
  detail: string;
  timestamp: string;
};

type StreamProps = {
  items: MarqueeItem[];
  style?: ViewStyle;
};

type Props = {
  incidents: IncidentReport[];
  style?: ViewStyle;
};

const MAX_ITEMS = 8;

function itemColor(kind: MarqueeItem['kind'], colors: (typeof Colors)['light']): string {
  return kind === 'result' ? colors.success : colors.critical;
}

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
export function LiveStreamMarquee({ items, style }: StreamProps) {
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

  const activeItems = useMemo(() => items.slice(0, MAX_ITEMS), [items]);

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

  const handleItemPress = (item: MarqueeItem) => {
    impact(Haptics.ImpactFeedbackStyle.Light);
    if (item.kind === 'result') {
      router.push({ pathname: ROUTES.RESULT_DETAIL, params: { id: item.id } });
    } else {
      router.push({ pathname: ROUTES.INCIDENT_DETAIL, params: { id: item.id } });
    }
  };

  if (activeItems.length === 0) return null;

  // Reduced motion accessible fallback
  if (reduceMotion) {
    return <LiveStreamMarqueeScrollable items={activeItems} style={style} />;
  }

  const renderPill = (item: MarqueeItem, keySuffix: string) => {
    const accent = itemColor(item.kind, colors);
    return (
      <Pressable
        key={`${item.id}-${keySuffix}`}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => handleItemPress(item)}
        style={styles.incidentPill}
        accessibilityRole="button"
        accessibilityLabel={`${item.kind === 'result' ? 'Result' : 'Incident'}: ${item.label} at ${item.area}`}
      >
        <ThemedText
          variant="caption"
          numberOfLines={1}
          style={{ color: accent, fontWeight: '700', flexShrink: 0 }}
        >
          {item.label}
        </ThemedText>
        <ThemedText
          variant="caption"
          numberOfLines={1}
          color="textSecondary"
          style={{ marginLeft: spacing['2xs'], flexShrink: 0 }}
        >
          @{item.area}: {item.detail}
        </ThemedText>
        <Ionicons
          name="chevron-forward"
          size={11}
          color={accent}
          style={{ opacity: 0.8, marginLeft: spacing['3xs'], flexShrink: 0 }}
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
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: scheme === 'dark' ? '#0D1A12' : '#F0FDF4',
          borderColor: scheme === 'dark' ? '#1E3827' : '#DCFCE7',
        },
        style,
      ]}
      accessibilityRole="none"
    >
      <View style={[styles.label, { backgroundColor: colors.critical }]}>
        <View style={styles.livePulseDot} />
        <ThemedText
          variant="micro"
          fontFamily="bold"
          numberOfLines={1}
          style={{ color: '#FFFFFF', letterSpacing: 0.5 }}
        >
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
            {activeItems.map((item) => renderPill(item, 'set1'))}
          </View>

          {/* Seamless Duplicate Sequence (guarantees zero empty gap) */}
          <View style={styles.sequenceGroup}>
            {activeItems.map((item) => renderPill(item, 'set2'))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/** Accessible non-animating fallback for Reduced Motion and assistive technologies */
export function LiveStreamMarqueeScrollable({ items, style }: StreamProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { impact } = useHaptics();

  if (items.length === 0) return null;

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
        {items.slice(0, MAX_ITEMS).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              impact(Haptics.ImpactFeedbackStyle.Light);
              if (item.kind === 'result') {
                router.push({ pathname: ROUTES.RESULT_DETAIL, params: { id: item.id } });
              } else {
                router.push({ pathname: ROUTES.INCIDENT_DETAIL, params: { id: item.id } });
              }
            }}
            style={styles.incidentPill}
          >
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={{ color: itemColor(item.kind, colors), fontWeight: '700', flexShrink: 0 }}
            >
              {item.label}
            </ThemedText>
            <ThemedText
              variant="caption"
              numberOfLines={1}
              color="textSecondary"
              style={{ marginLeft: spacing['2xs'], flexShrink: 0 }}
            >
              @{item.area} •
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Incidents-only marquee, kept for dashboards that don't consume the results stream. */
export function IncidentMarquee({ incidents, style }: Props) {
  const items = useMemo<MarqueeItem[]>(
    () =>
      incidents.map((i) => ({
        id: i.id,
        kind: 'incident',
        label: i.category.replace(/_/g, ' '),
        area: i.electoralArea,
        detail: i.description.slice(0, 48),
        timestamp: i.reportedAt,
      })),
    [incidents]
  );

  return <LiveStreamMarquee items={items} style={style} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.thin,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingVertical: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    height: sizes.marqueeHeight,
    maxHeight: sizes.marqueeHeight,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['3xs'] + border.thin,
    borderRadius: radius.xs,
    flexShrink: 0,
    zIndex: 2,
  },
  livePulseDot: {
    width: spacing['2xs'] + border.thin,
    height: spacing['2xs'] + border.thin,
    borderRadius: radius.full,
    backgroundColor: Colors.light.textInverse,
  },
  track: {
    flex: 1,
    height: sizes.marqueeHeight,
    overflow: 'hidden',
    justifyContent: 'center',
    marginLeft: spacing['2xs'],
  },
  tickerRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    height: sizes.marqueeHeight,
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
