import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, MILE_IN_METERS } from '../theme';
import type { RunState, RunStats, RunPlan } from '../hooks/useRunTracker';
import type { PaceCheckStatus } from '../lib/paceEngine';
import { formatClock, formatMiles, formatPace } from '../lib/format';
import { StatTile } from '../components/StatTile';

type Props = {
  state: RunState;
  stats: RunStats;
  error: string | null;
  targetSecPerMile: number;
  plan: RunPlan;
  onStop: () => void;
};

const STATE_STYLE: Record<
  PaceCheckStatus,
  { color: string; bg: string; word: string }
> = {
  on_track: { color: colors.onTrack, bg: colors.onTrackDark, word: 'ON PACE' },
  speed_up: { color: colors.tooSlow, bg: colors.tooSlowDark, word: 'SPEED UP' },
  ease_up: { color: colors.tooFast, bg: colors.tooFastDark, word: 'EASE UP' },
  no_signal: { color: colors.textDim, bg: colors.surface, word: 'GET MOVING' },
};

const MODE_LABEL = {
  open: 'OPEN RUN',
  time: 'TIME GOAL',
  distance: 'DISTANCE GOAL',
} as const;

function pillText(status: PaceCheckStatus, word: string, adjustPct: number): string {
  if (status !== 'speed_up' && status !== 'ease_up') return word;
  const m = Math.round(Math.abs(adjustPct) / 5) * 5;
  return `${word}  ${m > 40 ? '40%+' : `${m}%`}`;
}

export function RunScreen({
  state,
  stats,
  error,
  targetSecPerMile,
  plan,
  onStop,
}: Props) {
  const check = stats.check;
  const status: PaceCheckStatus = check?.status ?? 'no_signal';
  const s = STATE_STYLE[status];

  // Time tile: counts down for a time goal, up otherwise.
  const timeLabel = plan.mode === 'time' ? 'Time left' : 'Time';
  const timeValue =
    plan.mode === 'time'
      ? formatClock(Math.max(0, plan.goalSeconds - stats.elapsedSec))
      : formatClock(stats.elapsedSec);

  // Distance tile: shows progress toward a distance goal.
  const goalMi = plan.goalMeters / MILE_IN_METERS;
  const distUnit = plan.mode === 'distance' ? `/ ${goalMi.toFixed(1)} mi` : 'mi';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.mode}>{MODE_LABEL[plan.mode]}</Text>
        <Text style={styles.signal}>
          {state === 'starting' ? 'Acquiring GPS…' : `● ${stats.gpsFixes} fixes`}
        </Text>
      </View>

      {/* Hero: current pace, color-coded by how you're doing right now. */}
      <View style={[styles.hero, { backgroundColor: s.bg }]}>
        <View style={[styles.pill, { borderColor: s.color }]}>
          <Text style={[styles.pillText, { color: s.color }]}>
            {pillText(status, s.word, check?.adjustPct ?? 0)}
          </Text>
        </View>
        <Text style={styles.heroLabel}>CURRENT PACE</Text>
        <View style={styles.paceRow}>
          <Text style={[styles.pace, { color: s.color }]}>
            {formatPace(stats.currentPace)}
          </Text>
          <Text style={[styles.paceUnit, { color: s.color }]}>/mi</Text>
        </View>
        <Text style={styles.reference}>
          target {formatPace(targetSecPerMile)}/mi
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile label={timeLabel} value={timeValue} />
        <StatTile
          label="Distance"
          value={formatMiles(stats.distanceMeters)}
          unit={distUnit}
        />
      </View>
      <View style={styles.grid}>
        <StatTile label="Last mile" value={formatPace(stats.lastMilePace)} unit="/mi" />
        <StatTile label="Avg pace" value={formatPace(stats.avgPace)} unit="/mi" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onStop}
        style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
      >
        <Text style={styles.stopText}>STOP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: space.lg,
    gap: space.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xs,
  },
  mode: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  signal: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  hero: {
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    marginTop: space.xs,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: space.sm,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pace: {
    fontSize: 84,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 90,
  },
  paceUnit: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 6,
    marginBottom: 14,
    opacity: 0.9,
  },
  reference: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  stop: {
    marginTop: 'auto',
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  stopText: {
    color: colors.bg,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
