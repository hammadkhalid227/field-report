import { SvgXml } from 'react-native-svg';
import { colors } from '../constants/colors';
import { rf } from '../constants/dimmensions';
import type { AppIconProps } from '../types/types';

export function AppIcon({
  xml,
  size = rf(24),
  color = colors.primary,
}: AppIconProps) {
  const tinted = xml.replace(/ICON_TINT/g, color);
  return <SvgXml xml={tinted} width={size} height={size} />;
}
