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
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
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
    backgroundColor: colors.paper,
  },
  content: {
    padding: wp(5.3),
    gap: hp(1.5),
  },
  label: {
    fontSize: rf(14),
    lineHeight: rf(18),
    fontWeight: '600',
    color: colors.primary,
  },
  field: {
    minHeight: hp(5.9),
    borderWidth: wp(0.3),
    borderColor: colors.primary,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(3.7),
    paddingVertical: hp(1.5),
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.ink,
    backgroundColor: colors.white,
  },
  photoRow: {
    gap: wp(3.2),
    paddingVertical: hp(0.5),
  },
  thumb: {
    width: wp(25.6),
    height: wp(25.6),
    borderRadius: wp(3.2),
    backgroundColor: colors.photo,
  },
  caption: {
    marginTop: hp(0.7),
    fontSize: rf(13),
    color: colors.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(5.3),
  },
  fullImage: {
    alignSelf: 'stretch',
    height: hp(70),
    borderRadius: wp(4.3),
  },
  notice: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.ink,
    padding: wp(5.3),
  },
});
