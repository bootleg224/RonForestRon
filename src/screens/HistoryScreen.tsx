import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, space } from '../theme';
import { listRuns, type SavedRun } from '../lib/db';
import { formatClock, formatMiles, formatPace } from '../lib/format';

type Props = {
  onBack: () => void;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
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
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Run history</Text>

      {runs == null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : runs.length === 0 ? (
        <Text style={styles.empty}>No runs saved yet. Go for a run!</Text>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
                <Text style={styles.rowSub}>target {formatPace(item.targetPace)}/mi</Text>
              </View>
              <View style={styles.rowStats}>
                <Text style={styles.rowMain}>{formatMiles(item.distanceMeters)} mi</Text>
                <Text style={styles.rowSub}>
                  {formatClock(item.elapsedSec)} · {formatPace(item.avgPace)}/mi
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
    padding: space.lg,
  },
  back: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: space.md,
  },
  empty: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
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
