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
import { radius, opacities, border, shadows } from '@/constants/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
} & Omit<PressableProps, 'children'>;

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

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 6, minHeight: 34 },
    md: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 46 },
    lg: { paddingVertical: 13, paddingHorizontal: 20, minHeight: 52 },
  };

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      ...Platform.select({
        ios: shadows.md,
        android: { ...shadows.md, elevation: 4 },
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
            variant="label"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: size === 'sm' ? (label.length > 13 ? 11 : 12) : size === 'lg' ? 15 : 13.5,
                lineHeight: size === 'sm' ? 16 : size === 'lg' ? 20 : 18,
                letterSpacing: size === 'sm' && label.length > 13 ? 0 : 0.2,
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
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  label: { fontWeight: '600', letterSpacing: 0.2, flexShrink: 1 },
  icon: { lineHeight: 20 },
});
