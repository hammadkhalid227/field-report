import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { phoneStatus } from '../helpers/phoneStatus';
import { reportStore } from '../store/reportStore';
import { formatWhen } from '../helpers/formatWhen';
import { LoadingImage } from '../components/LoadingImage';
import type { PhoneReportScreenProps, StoredReport } from '../types/types';

function displayUri(path: string) {
  if (path.includes('://')) {
    return path;
  }
  return `file://${path}`;
}

export function PhoneReportScreen({ route }: PhoneReportScreenProps) {
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
  const photos = [...report.photos].sort(
    (left, right) => left.position - right.position,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Description</Text>
      <TextInput
        value={report.description}
        editable={false}
        multiline
        style={styles.field}
      />
      <Text style={styles.label}>Created at</Text>
      <TextInput
        value={formatWhen(report.createdAt)}
        editable={false}
        style={styles.field}
      />
      <Text style={styles.label}>Source</Text>
      <TextInput
        value={phoneStatus(report, online, now)}
        editable={false}
        multiline
        style={styles.field}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
      >
        {photos.map((item, index) => {
          const uri = displayUri(item.localPath);
          return (
            <Pressable key={item.id} onPress={() => setOpenPhoto(uri)}>
              <LoadingImage uri={uri} style={styles.thumb} />
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
            <LoadingImage
              uri={openPhoto}
              style={styles.fullImage}
              resizeMode="contain"
            />
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
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2F6B4F',
  },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#2F6B4F',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1915',
    backgroundColor: '#FFFFFF',
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
