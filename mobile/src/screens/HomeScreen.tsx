import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { phoneStatus } from '../phone/phoneStatus';
import { reportStore } from '../store/reportStore';
import type { StoredReport } from '../store/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Phone'>,
  NativeStackScreenProps<RootStackParamList>
>;

function photoLabel(count: number) {
  if (count === 1) {
    return '1 photo';
  }
  return `${count} photos`;
}

export function HomeScreen({ navigation }: Props) {
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
            <ActivityIndicator color="#1C1915" />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.meta}>
              {photoLabel(item.photos.length)}.{' '}
              {phoneStatus(item, online, Date.now())}
            </Text>
          </View>
        )}
      />
      <Pressable
        onPress={() => navigation.navigate('Compose')}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>New report</Text>
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
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#8C2F2F',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1915',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  primaryText: {
    fontSize: 17,
    color: '#F7F6F3',
    fontWeight: '600',
  },
});
