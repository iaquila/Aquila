import { Platform, TextStyle } from 'react-native';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { FEATURES } from '@/constants/features';

export const FONT_FAMILY = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
} as const;

export type FontFamily = (typeof FONT_FAMILY)[keyof typeof FONT_FAMILY];

export const fontMap = {
  [FONT_FAMILY.regular]: Inter_400Regular,
  [FONT_FAMILY.medium]: Inter_500Medium,
  [FONT_FAMILY.bold]: Inter_700Bold,
} as const;

export type FontWeightVariant = 'regular' | 'medium' | 'bold';

/**
 * Resolves font family and weight style according to 2026/2027 standards:
 * - When FEATURES.ENABLE_CUSTOM_FONTS is false (default):
 *   Uses native system platform fonts (SF Pro on iOS, Roboto on Android) via fontWeight.
 *   Eliminates FOUT, reduces cold-start splash delays, and respects OS dynamic accessibility typography.
 * - When FEATURES.ENABLE_CUSTOM_FONTS is true:
 *   Loads and applies custom Inter postscript names without synthetic bold distortion.
 */
export function getFontStyle(weight: FontWeightVariant = 'regular'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (FEATURES.ENABLE_CUSTOM_FONTS) {
    return {
      fontFamily: FONT_FAMILY[weight],
      fontWeight: undefined,
    };
  }

  const fontWeightMap: Record<FontWeightVariant, TextStyle['fontWeight']> = {
    regular: '400',
    medium: '500',
    bold: '700',
  };

  return {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    fontWeight: fontWeightMap[weight],
  };
}

