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

type ListProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Server'>,
  NativeStackScreenProps<RootStackParamList>
>;
type DetailProps = NativeStackScreenProps<RootStackParamList, 'ServerReport'>;

function photoLabel(count: number) {
  if (count === 1) {
    return '1 photo';
  }
  return `${count} photos`;
}

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
          <Pressable
            onPress={() => navigation.navigate('ServerReport', { id: item.id })}
            style={styles.row}
          >
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.meta}>{photoLabel(item.images.length)}</Text>
          </Pressable>
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

  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <Text style={styles.description}>{report.description}</Text>
      {images.map(image => (
        <Image
          key={image.id}
          source={{ uri: image.url }}
          style={styles.image}
        />
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
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D3C8',
    padding: 16,
    gap: 6,
  },
  description: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1C1915',
  },
  meta: {
    fontSize: 15,
    lineHeight: 20,
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
    height: 240,
    borderRadius: 12,
    backgroundColor: '#E6E1D8',
  },
});
