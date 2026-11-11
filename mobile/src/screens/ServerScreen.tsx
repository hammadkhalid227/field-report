import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchServerReport, fetchServerReports } from '../api/reports';
import type { ServerReport } from '../api/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { formatWhen } from '../helpers/formatWhen';
import { ReportCard } from '../components/ReportCard';

type ListProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Server'>,
  NativeStackScreenProps<RootStackParamList>
>;
type DetailProps = NativeStackScreenProps<RootStackParamList, 'ServerReport'>;

export function ServerScreen({ navigation }: ListProps) {
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
            tintColor="#1C1915"
          />
        }
        ListEmptyComponent={
          !ready ? (
            <ActivityIndicator color="#1C1915" />
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

export function ServerReportScreen({ route }: DetailProps) {
  const [report, setReport] = useState<ServerReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        <ActivityIndicator color="#1C1915" />
      </View>
    );
  }

  const images = [...report.images].sort(
    (left, right) => left.position - right.position,
  );
  const when = report.completedAt ?? report.createdAt;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detail}>
      <Text style={styles.title}>{report.description}</Text>
      <Text style={styles.meta}>{formatWhen(when)}</Text>
      <Text style={styles.serverStatus}>On the server.</Text>
      <Text style={styles.meta}>
        {images.length === 1 ? '1 photo' : `${images.length} photos`}
      </Text>
      {images.map((image, index) => (
        <View key={image.id} style={styles.photoBlock}>
          <Image source={{ uri: image.url }} style={styles.image} />
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
  list: {
    padding: 20,
    gap: 12,
    flexGrow: 1,
  },
  meta: {
    fontSize: 15,
    lineHeight: 20,
    color: '#5C564E',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#1C1915',
  },
  serverStatus: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#2F6B4F',
  },
  photoBlock: {
    gap: 8,
  },
  caption: {
    fontSize: 14,
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
    borderColor: '#1C1915',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 17,
    color: '#1C1915',
  },
  detail: {
    padding: 20,
    gap: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#E6E1D8',
  },
});
