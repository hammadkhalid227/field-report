import { SvgXml } from 'react-native-svg';

type Props = {
  xml: string;
  size?: number;
  color?: string;
};

export function AppIcon({ xml, size = 24, color = '#2F6B4F' }: Props) {
  const tinted = xml.replace(/#2F6B4F/gi, color).replace(/#000000/gi, color);
  return <SvgXml xml={tinted} width={size} height={size} />;
}
