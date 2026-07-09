import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import type { RunStats } from '../hooks/useRunTracker';
import {
  formatClock,
  formatDistance,
  formatPace,
  distanceLabel,
  paceLabel,
  type Units,
} from '../lib/format';
import { StatTile } from '../components/StatTile';
import { Logo } from '../components/Logo';

type Props = {
  stats: RunStats;
  onDone: () => void;
  units: Units;
};

export function SummaryScreen({ stats, onDone, units }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Logo size={168} />
        <Text style={styles.subtitle}>Nice run — saved to your history.</Text>
      </View>

      <View style={styles.grid}>
        <StatTile label="Time" value={formatClock(stats.elapsedSec)} />
        <StatTile
          label="Distance"
          value={formatDistance(stats.distanceMeters, units)}
          unit={distanceLabel(units)}
        />
      </View>
      <View style={styles.grid}>
        <StatTile
          label="Avg pace"
          value={formatPace(stats.avgPace, units)}
          unit={paceLabel(units)}
          accentColor={colors.accent}
        />
        {stats.steps > 0 ? (
          <StatTile label="Steps" value={String(stats.steps)} />
        ) : (
          <StatTile label="GPS fixes" value={String(stats.gpsFixes)} />
        )}
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
    alignItems: 'center',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  subtitle: {
    color: colors.textDim,
    textAlign: 'center',
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
