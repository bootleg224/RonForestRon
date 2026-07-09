import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { RunStats } from '../hooks/useRunTracker';
import { formatClock, formatMiles, formatPace } from '../lib/format';
import { StatTile } from '../components/StatTile';

type Props = {
  stats: RunStats;
  onDone: () => void;
};

export function SummaryScreen({ stats, onDone }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nice run, Ron</Text>
        <Text style={styles.subtitle}>Here's how it went.</Text>
      </View>

      <View style={styles.grid}>
        <StatTile label="Time" value={formatClock(stats.elapsedSec)} />
        <StatTile label="Distance" value={formatMiles(stats.distanceMeters)} unit="mi" />
      </View>
      <View style={styles.grid}>
        <StatTile label="Avg pace" value={formatPace(stats.avgPace)} unit="/mi" />
        <StatTile label="GPS fixes" value={String(stats.gpsFixes)} />
      </View>

      <Text style={styles.note}>Saved to your run history.</Text>

      <Pressable
        onPress={onDone}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>NEW RUN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    marginTop: 24,
    marginBottom: 8,
  },
  title: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  note: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 'auto',
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
