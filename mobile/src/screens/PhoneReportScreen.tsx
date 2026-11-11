import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  progress: '#2F6B4F',
  ok: '#2F6B4F',
  warn: '#8A5A12',
  danger: '#8C2F2F',
};

export function PhoneReportScreen({ route }: Props) {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [missing, setMissing] = useState(false);
  const [online, setOnline] = useState(true);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
      >
        {photos.map((item, index) => {
          const uri = displayUri(item.localPath);
          return (
            <Pressable key={item.id} onPress={() => setOpenPhoto(uri)}>
              <Image source={{ uri }} style={styles.thumb} />
              <Text style={styles.caption}>Photo {index + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Modal
        visible={openPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPhoto(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpenPhoto(null)}>
          {openPhoto ? (
            <Image source={{ uri: openPhoto }} style={styles.fullImage} />
          ) : null}
        </Pressable>
      </Modal>
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
  photoRow: {
    gap: 12,
    paddingVertical: 4,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#E6E1D8',
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: '#5C564E',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 21, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '70%',
    borderRadius: 16,
  },
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1915',
    padding: 20,
  },
});
