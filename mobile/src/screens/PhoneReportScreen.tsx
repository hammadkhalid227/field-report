import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { phoneStatus } from '../phone/phoneStatus';
import { reportStore } from '../store/reportStore';
import type { StoredReport } from '../store/types';
import { formatWhen } from '../helpers/formatWhen';
import { phoneCardTone } from '../helpers/reportPresentation';

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneReport'>;

function displayUri(path: string) {
  if (path.includes('://')) {
    return path;
  }
  return `file://${path}`;
}

const toneColor = {
  neutral: '#5C564E',
  progress: '#2E6B9A',
  ok: '#2F6B4F',
  warn: '#8A5A12',
  danger: '#8C2F2F',
};

export function PhoneReportScreen({ route }: Props) {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [missing, setMissing] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setOnline(state.isConnected !== false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        reportStore.get(route.params.id).then(item => {
          if (!active) {
            return;
          }
          setReport(item);
          setMissing(item === null);
        });
      };
      load();
      const timer = setInterval(load, 1000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [route.params.id]),
  );

  if (missing) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notice}>
          This report is no longer on this phone.
        </Text>
      </View>
    );
  }

  if (!report) {
    return <View style={styles.screen} />;
  }

  const now = Date.now();
  const tone = phoneCardTone(report, online, now);
  const photos = [...report.photos].sort(
    (left, right) => left.position - right.position,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{report.description}</Text>
      <Text style={styles.meta}>{formatWhen(report.createdAt)}</Text>
      <Text style={[styles.status, { color: toneColor[tone] }]}>
        {phoneStatus(report, online, now)}
      </Text>
      {photos.map((photo, index) => (
        <View key={photo.id} style={styles.photoBlock}>
          <Image
            source={{ uri: displayUri(photo.localPath) }}
            style={styles.image}
          />
          <Text style={styles.caption}>Photo {index + 1}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#1C1915',
  },
  meta: {
    fontSize: 15,
    lineHeight: 20,
    color: '#5C564E',
  },
  status: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  photoBlock: {
    gap: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#E6E1D8',
  },
  caption: {
    fontSize: 14,
    color: '#5C564E',
  },
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1915',
    padding: 20,
  },
});
