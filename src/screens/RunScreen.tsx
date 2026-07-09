import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { RunState, RunStats } from '../hooks/useRunTracker';
import type { PaceCheckStatus } from '../lib/paceEngine';
import { formatClock, formatMiles, formatPace } from '../lib/format';
import { StatTile } from '../components/StatTile';

type Props = {
  state: RunState;
  stats: RunStats;
  error: string | null;
  targetSecPerMile: number;
  onStop: () => void;
};

const CHECK_COLOR: Record<PaceCheckStatus, string> = {
  on_track: colors.onTrack,
  speed_up: colors.tooSlow,
  ease_up: colors.tooFast,
  no_signal: colors.textDim,
};

export function RunScreen({ state, stats, error, targetSecPerMile, onStop }: Props) {
  const check = stats.lastCheck;
  const bannerColor = check ? CHECK_COLOR[check.status] : colors.surfaceAlt;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.target}>
          Target {formatPace(targetSecPerMile)} /mi
        </Text>
        <Text style={styles.signal}>
          {state === 'starting'
            ? 'Acquiring GPS…'
            : `GPS · ${stats.gpsFixes} fixes`}
        </Text>
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>TIME</Text>
        <Text style={styles.timerValue}>{formatClock(stats.elapsedSec)}</Text>
      </View>

      <View
        style={[styles.banner, { borderColor: bannerColor, backgroundColor: colors.surface }]}
      >
        <Text style={[styles.bannerText, { color: bannerColor }]}>
          {check ? check.spokenText.replace(/^Pace check\.\s*/, '') : 'First pace check at 30s…'}
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile label="Distance" value={formatMiles(stats.distanceMeters)} unit="mi" />
        <StatTile label="Avg pace" value={formatPace(stats.avgPace)} unit="/mi" />
      </View>
      <View style={styles.grid}>
        <StatTile label="Last mile" value={formatPace(stats.trailingMilePace)} unit="/mi" />
        <StatTile
          label="Vs target"
          value={check && check.status !== 'no_signal' ? `${check.deltaPct > 0 ? '+' : ''}${check.deltaPct.toFixed(0)}%` : '—'}
          accentColor={bannerColor}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onStop}
        style={({ pressed }) => [styles.stopButton, pressed && styles.stopPressed]}
      >
        <Text style={styles.stopText}>STOP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  target: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  signal: {
    color: colors.textDim,
    fontSize: 13,
  },
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 4,
  },
  timerLabel: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  timerValue: {
    color: colors.text,
    fontSize: 76,
    lineHeight: 84,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  banner: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  stopButton: {
    marginTop: 'auto',
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPressed: {
    opacity: 0.85,
  },
  stopText: {
    color: colors.bg,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
