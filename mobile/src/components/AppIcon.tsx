import { SvgXml } from 'react-native-svg';
import type { AppIconProps } from '../types/types';

export function AppIcon({ xml, size = 24, color = '#2F6B4F' }: AppIconProps) {
  const tinted = xml.replace(/#2F6B4F/gi, color).replace(/#000000/gi, color);
  return <SvgXml xml={tinted} width={size} height={size} />;
}
