import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoaderKitProgress } from 'react-native-loader-kit';
import { clock, photo } from '../assets/svgs';
import { AppIcon } from './AppIcon';
import { formatWhen } from '../helpers/formatWhen';

type Tone = 'neutral' | 'progress' | 'ok' | 'warn' | 'danger';

type Props = {
  title: string;
  createdAt: number | string;
  photoCount: number;
  status: string;
  tone: Tone;
  progress?: number | null;
  onPress: () => void;
};

const toneColor: Record<Tone, string> = {
  neutral: '#5C564E',
  progress: '#2F6B4F',
  ok: '#2F6B4F',
  warn: '#8A5A12',
  danger: '#8C2F2F',
};

function photoLabel(count: number) {
  if (count === 1) {
    return '1 photo';
  }
  return `${count} photos`;
}

export function ReportCard({
  title,
  createdAt,
  photoCount,
  status,
  tone,
  progress,
  onPress,
}: Props) {
  const color = toneColor[tone];
  const when = formatWhen(createdAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <AppIcon xml={clock} size={16} color={color} />
          <Text style={styles.meta}>{when}</Text>
        </View>
        <View style={styles.metaItem}>
          <AppIcon xml={photo} size={16} color={color} />
          <Text style={styles.meta}>{photoLabel(photoCount)}</Text>
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.status, { color }]}>{status}</Text>
      </View>
      {progress !== undefined ? (
        <LoaderKitProgress
          type="linear"
          variant={'shimmer'}
          value={progress}
          color="#2F6B4F"
          trackColor="#E6E1D8"
          style={styles.progress}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9D3C8',
    padding: 16,
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: '#1C1915',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 14,
    lineHeight: 18,
    color: '#5C564E',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  progress: {
    height: 8,
    width: '100%',
  },
});
