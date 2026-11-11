import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoaderKitProgress } from 'react-native-loader-kit';
import { clock, photo } from '../assets/svgs';
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
import { AppIcon } from './AppIcon';
import { formatWhen } from '../helpers/formatWhen';
import type { ReportCardProps, ReportCardTone } from '../types/types';

const toneColor: Record<ReportCardTone, string> = {
  neutral: colors.muted,
  progress: colors.primary,
  ok: colors.primary,
  warn: colors.warn,
  danger: colors.danger,
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
}: ReportCardProps) {
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
          <AppIcon xml={clock} size={rf(16)} color={color} />
          <Text style={styles.meta}>{when}</Text>
        </View>
        <View style={styles.metaItem}>
          <AppIcon xml={photo} size={rf(16)} color={color} />
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
          color={colors.primary}
          trackColor={colors.photo}
          style={styles.progress}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: wp(4.3),
    borderWidth: wp(0.3),
    borderColor: colors.line,
    padding: wp(4.3),
    gap: hp(1.5),
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '600',
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3.7),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.6),
  },
  meta: {
    fontSize: rf(14),
    lineHeight: rf(18),
    color: colors.muted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.1),
    borderRadius: wp(26),
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(2.7),
  },
  statusDot: {
    width: wp(2.1),
    height: wp(2.1),
    borderRadius: wp(1.1),
  },
  status: {
    fontSize: rf(14),
    lineHeight: rf(18),
    fontWeight: '600',
  },
  progress: {
    height: hp(1),
    alignSelf: 'stretch',
  },
});
