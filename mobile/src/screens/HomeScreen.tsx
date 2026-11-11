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
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
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
    <View style={styles.screen}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <FlatList
        data={reports}
        keyExtractor={report => report.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          ready ? (
            <Text style={styles.empty}>No reports on this phone yet.</Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
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
        <AppIcon xml={add} size={rf(28)} color={colors.paper} />
      </Pressable>
    </View>
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
    paddingBottom: hp(11.8),
  },
  empty: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.muted,
    marginTop: hp(1.5),
  },
  notice: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.danger,
    paddingHorizontal: wp(5.3),
    paddingTop: hp(2),
  },
  fab: {
    position: 'absolute',
    right: wp(5.3),
    bottom: hp(2.5),
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});
