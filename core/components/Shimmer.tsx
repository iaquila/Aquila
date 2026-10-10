import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import Colors from '@/constants/colors';
import { animation } from '@/constants/tokens';

type ShimmerProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  speed?: number;
};

export function Shimmer({
  width,
  height = 12,
  borderRadius = 4,
  style,
  speed = animation.slow,
}: ShimmerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const animatedValue = useRef(new Animated.Value(0)).current;
  const resolvedWidth = width ?? windowWidth;
  const numericWidth = typeof resolvedWidth === 'number' ? resolvedWidth : windowWidth;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: speed,
        easing: (t) => t,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue, speed]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-numericWidth, numericWidth],
  });

  const isDark = scheme === 'dark';
  const baseColor = isDark ? '#0D1A12' : '#EBF7F0';
  const highlightColor = isDark ? colors.primaryLight + '38' : colors.primaryLight + '55';

  return (
    <View style={[{ width: resolvedWidth, height, borderRadius, backgroundColor: baseColor, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          styles.shimmerGradient,
          {
            width: numericWidth * 0.5,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradient: {
    flex: 1,
  },
});
