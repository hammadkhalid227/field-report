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
            tintColor="#2F6B4F"
          />
        }
        ListEmptyComponent={
          !ready ? (
            <ActivityIndicator color="#2F6B4F" />
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
        <ActivityIndicator color="#2F6B4F" />
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
    backgroundColor: '#F7F6F3',
  },
  list: {
    padding: 20,
    gap: 12,
    flexGrow: 1,
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: '#5C564E',
  },
  empty: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5C564E',
    marginTop: 12,
  },
  noticeBox: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1915',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F6B4F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 17,
    color: '#2F6B4F',
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
});
