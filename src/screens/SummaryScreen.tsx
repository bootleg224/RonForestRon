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
      <Text style={styles.title}>Nice run — saved to your history.</Text>

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

      <View style={styles.logoWrap}>
        <Logo size={132} />
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
  title: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: space.sm,
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
