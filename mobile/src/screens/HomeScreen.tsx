import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps, StoredReport } from '../types/types';
import { phoneStatus } from '../helpers/phoneStatus';
import { add } from '../assets/svgs';
import { AppIcon } from '../components/AppIcon';
import { reportStore } from '../store/reportStore';
import { ReportCard } from '../components/ReportCard';
import {
  phoneCardProgress,
  phoneCardTone,
} from '../helpers/reportPresentation';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setOnline(state.isConnected !== false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = () => {
        reportStore
          .list()
          .then(items => {
            if (active) {
              setReports(items);
              setNotice(null);
            }
          })
          .catch(error => {
            if (active) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Could not read reports.';
              setNotice(message);
            }
          })
          .finally(() => {
            if (active) {
              setReady(true);
            }
          });
      };

      load();
      const timer = setInterval(load, 1000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, []),
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <FlatList
        data={reports}
        keyExtractor={report => report.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          ready ? (
            <Text style={styles.empty}>No reports on this phone yet.</Text>
          ) : (
            <ActivityIndicator color="#2F6B4F" />
          )
        }
        renderItem={({ item }) => {
          const now = Date.now();
          return (
            <ReportCard
              title={item.description}
              createdAt={item.createdAt}
              photoCount={item.photos.length}
              status={phoneStatus(item, online, now)}
              tone={phoneCardTone(item, online, now)}
              progress={phoneCardProgress(item, online, now)}
              onPress={() =>
                navigation.navigate('PhoneReport', { id: item.id })
              }
            />
          );
        }}
      />
      <Pressable
        onPress={() => navigation.navigate('Compose')}
        style={styles.fab}
        accessibilityLabel="New report"
      >
        <AppIcon xml={add} size={28} color="#F7F6F3" />
      </Pressable>
    </SafeAreaView>
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
    paddingBottom: 96,
  },
  empty: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5C564E',
    marginTop: 12,
  },
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#8C2F2F',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6B4F',
  },
});
