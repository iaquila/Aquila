import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  PressableProps,
  Platform,
  FlexAlignType,
  Animated,
} from 'react-native';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import { usePressScale } from '@/core/hooks/usePressScale';
import { DebouncedPressable } from './DebouncedPressable';
import Colors from '@/constants/colors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { radius, opacities, border, shadows, spacing, typography, sizes } from '@/constants/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
} & Omit<PressableProps, 'children'>;

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: spacing['2xs'] + spacing['3xs'], paddingHorizontal: spacing.sm, minHeight: sizes.buttonSm },
  md: { paddingVertical: spacing.xs + spacing['3xs'], paddingHorizontal: spacing.md, minHeight: sizes.buttonMd },
  lg: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: sizes.buttonLg },
};

const textSizeStyles: Record<ButtonSize, { fontSize: number; letterSpacing: number }> = {
  sm: { fontSize: typography.label, letterSpacing: 0.2 },
  md: { fontSize: typography.caption, letterSpacing: 0.25 },
  lg: { fontSize: typography.body, letterSpacing: 0.3 },
};

export function Button({
  label,
  variant = 'primary',
  onPress,
  disabled = false,
  loading = false,
  style,
  testID,
  accessibilityLabel,
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...rest
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { scale, onPressIn: onScaleIn, onPressOut: onScaleOut } = usePressScale({ toValue: 0.97 });

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      ...Platform.select<ViewStyle>({
        ios: shadows.md,
        android: { elevation: 0 },
      }),
    },
    secondary: { backgroundColor: colors.primaryLight },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: border.thick,
      borderColor: colors.primary,
    },
    ghost: { backgroundColor: 'transparent' },
  };

  const textColor =
    variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF';

  const renderIcon = (iconName: keyof typeof Ionicons.glyphMap | undefined, iconColor: string) => {
    if (!iconName) return null;
    return <Ionicons name={iconName} size={size === 'sm' ? 16 : 20} color={iconColor} style={styles.icon} />;
  };

  const flatStyle = StyleSheet.flatten(style);
  const containerFlexStyle: ViewStyle = {};
  if (flatStyle) {
    if (flatStyle.flex !== undefined) {
      containerFlexStyle.flex = flatStyle.flex;
      containerFlexStyle.minWidth = 0;
      containerFlexStyle.flexShrink = 1;
    }
    if (flatStyle.flexGrow !== undefined) containerFlexStyle.flexGrow = flatStyle.flexGrow;
    if (flatStyle.flexShrink !== undefined) containerFlexStyle.flexShrink = flatStyle.flexShrink;
    if (flatStyle.flexBasis !== undefined) containerFlexStyle.flexBasis = flatStyle.flexBasis;
    if (flatStyle.alignSelf !== undefined) containerFlexStyle.alignSelf = flatStyle.alignSelf;
  }

  return (
    <DebouncedPressable
      onPress={onPress}
      onPressIn={onScaleIn}
      onPressOut={onScaleOut}
      disabled={disabled || loading}
      style={[
        { maxWidth: '100%' },
        fullWidth ? { alignSelf: 'stretch' as FlexAlignType } : undefined,
        containerFlexStyle,
      ]}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      {...rest}
    >
      <Animated.View
        collapsable={false}
        style={[
          styles.button,
          { borderRadius: radius.full, minWidth: 0 },
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && { alignSelf: 'stretch' as FlexAlignType },
          containerFlexStyle.flex !== undefined && { flex: 1, width: '100%', minWidth: 0 },
          disabled && { opacity: opacities.disabled },
          style,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.row}>
          {renderIcon(leftIcon, textColor)}
          <ThemedText
            variant={size === 'sm' ? 'label' : size === 'lg' ? 'body' : 'caption'}
            fontFamily="bold"
            numberOfLines={1}
            adjustsFontSizeToFit={false}
            ellipsizeMode="tail"
            color={textColor}
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: textSizeStyles[size].fontSize,
                letterSpacing: textSizeStyles[size].letterSpacing,
              },
            ]}
          >
            {loading ? 'Loading...' : label}
          </ThemedText>
          {renderIcon(rightIcon, textColor)}
        </View>
      </Animated.View>
    </DebouncedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing['2xs'] + spacing['3xs'],
    flexShrink: 1,
    minWidth: 0,
  },
  label: { fontWeight: '600', letterSpacing: 0.2, flexShrink: 1 },
  icon: { lineHeight: 20 },
});
