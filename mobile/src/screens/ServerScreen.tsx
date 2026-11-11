import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchServerReport, fetchServerReports } from '../api/reports';
import type {
  ServerReport,
  ServerReportScreenProps,
  ServerScreenProps,
} from '../types/types';
import { formatWhen } from '../helpers/formatWhen';
import { LoadingImage } from '../components/LoadingImage';
import { ReportCard } from '../components/ReportCard';
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';

export function ServerScreen({ navigation }: ServerScreenProps) {
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const items = await fetchServerReports();
      setReports(items);
      setNotice(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The server could not be read.';
      setNotice(message);
    } finally {
      setReady(true);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.notice}>{notice}</Text>
          <Pressable onPress={load} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={reports}
        keyExtractor={report => report.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !ready ? (
            <ActivityIndicator color={colors.primary} />
          ) : notice ? (
            <View />
          ) : (
            <Text style={styles.empty}>Nothing on the server yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <ReportCard
            title={item.description}
            createdAt={item.completedAt ?? item.createdAt}
            photoCount={item.images.length}
            status="On the server."
            tone="ok"
            onPress={() => navigation.navigate('ServerReport', { id: item.id })}
          />
        )}
      />
    </View>
  );
}

export function ServerReportScreen({ route }: ServerReportScreenProps) {
  const [report, setReport] = useState<ServerReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchServerReport(route.params.id)
        .then(item => {
          if (active) {
            setReport(item);
            setNotice(null);
          }
        })
        .catch(error => {
          if (active) {
            const message =
              error instanceof Error
                ? error.message
                : 'The server could not be read.';
            setNotice(message);
          }
        });
      return () => {
        active = false;
      };
    }, [route.params.id]),
  );

  if (notice) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notice}>{notice}</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const images = [...report.images].sort(
    (left, right) => left.position - right.position,
  );
  const when = report.completedAt ?? report.createdAt;

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
      <TextInput value={formatWhen(when)} editable={false} style={styles.field} />
      <Text style={styles.label}>Source</Text>
      <TextInput
        value="On the server."
        editable={false}
        multiline
        style={styles.field}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
      >
        {images.map((image, index) => (
          <Pressable key={image.id} onPress={() => setOpenPhoto(image.url)}>
            <LoadingImage uri={image.url} style={styles.thumb} />
            <Text style={styles.caption}>Photo {index + 1}</Text>
          </Pressable>
        ))}
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
  list: {
    padding: wp(5.3),
    gap: hp(1.5),
    flexGrow: 1,
  },
  caption: {
    marginTop: hp(0.7),
    fontSize: rf(13),
    color: colors.muted,
  },
  empty: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.muted,
    marginTop: hp(1.5),
  },
  noticeBox: {
    paddingHorizontal: wp(5.3),
    paddingTop: hp(2),
    gap: hp(1.5),
  },
  notice: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.ink,
    paddingHorizontal: wp(5.3),
    paddingTop: hp(2),
  },
  secondaryButton: {
    minHeight: hp(5.9),
    borderRadius: wp(3.2),
    borderWidth: wp(0.3),
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryText: {
    fontSize: rf(17),
    color: colors.primary,
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
});
