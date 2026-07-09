import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
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
        <Text style={styles.subtitle}>Saved to your history.</Text>
      </View>

      <View style={styles.grid}>
        <StatTile label="Time" value={formatClock(stats.elapsedSec)} />
        <StatTile label="Distance" value={formatMiles(stats.distanceMeters)} unit="mi" />
      </View>
      <View style={styles.grid}>
        <StatTile
          label="Avg pace"
          value={formatPace(stats.avgPace)}
          unit="/mi"
          accentColor={colors.accent}
        />
        <StatTile label="GPS fixes" value={String(stats.gpsFixes)} />
      </View>

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
    padding: space.lg,
    gap: space.md,
  },
  header: {
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  title: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  button: {
    marginTop: 'auto',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
});
