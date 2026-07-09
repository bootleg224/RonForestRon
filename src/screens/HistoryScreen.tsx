import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';
import { listRuns, type SavedRun } from '../lib/db';
import { formatClock, formatMiles, formatPace } from '../lib/format';

type Props = {
  onBack: () => void;
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function HistoryScreen({ onBack }: Props) {
  const [runs, setRuns] = useState<SavedRun[] | null>(null);

  useEffect(() => {
    listRuns()
      .then(setRuns)
      .catch(() => setRuns([]));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Run history</Text>
      </View>

      {runs == null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : runs.length === 0 ? (
        <Text style={styles.empty}>No runs saved yet. Go for a run!</Text>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
                <Text style={styles.rowSub}>
                  target {formatPace(item.targetPace)} /mi
                </Text>
              </View>
              <View style={styles.rowStats}>
                <Text style={styles.rowMain}>
                  {formatMiles(item.distanceMeters)} mi
                </Text>
                <Text style={styles.rowSub}>
                  {formatClock(item.elapsedSec)} · {formatPace(item.avgPace)} /mi
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
  },
  back: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  empty: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowStats: {
    alignItems: 'flex-end',
  },
  rowMain: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  rowSub: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 3,
  },
});
