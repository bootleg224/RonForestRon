import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import type { RunState, RunStats, RunPlan } from '../hooks/useRunTracker';
import type { PaceCheckStatus } from '../lib/paceEngine';
import {
  formatClock,
  formatDistance,
  formatPace,
  distanceLabel,
  paceLabel,
  unitMeters,
  type Units,
} from '../lib/format';
import { StatTile } from '../components/StatTile';

type Props = {
  state: RunState;
  stats: RunStats;
  error: string | null;
  targetSecPerMile: number;
  plan: RunPlan;
  onStop: () => void;
  onTogglePause: () => void;
  units: Units;
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
  onTogglePause,
  units,
}: Props) {
  const check = stats.check;
  const status: PaceCheckStatus = check?.status ?? 'no_signal';
  const paused = stats.paused;
  // Keep the current pace showing as-is in its real color while paused; just
  // badge it "PAUSED".
  const s = STATE_STYLE[status];
  const pill = paused ? 'PAUSED' : pillText(status, s.word, check?.adjustPct ?? 0);
  const pausedNote =
    stats.pauseMode === 'manual' ? 'paused · tap resume' : 'auto-paused · move or resume';
  const pauseLabel = stats.pauseMode === 'manual' ? 'RESUME' : 'PAUSE';

  // Time tile: counts down for a time goal, up otherwise.
  const timeLabel = plan.mode === 'time' ? 'Time left' : 'Time';
  const timeValue =
    plan.mode === 'time'
      ? formatClock(Math.max(0, plan.goalSeconds - stats.elapsedSec))
      : formatClock(stats.elapsedSec);

  // Distance tile: shows progress toward a distance goal.
  const goalDist = plan.goalMeters / unitMeters(units);
  const distUnit =
    plan.mode === 'distance'
      ? `/ ${goalDist.toFixed(1)} ${distanceLabel(units)}`
      : distanceLabel(units);

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
          <Text style={[styles.pillText, { color: s.color }]}>{pill}</Text>
        </View>
        <Text style={styles.heroLabel}>CURRENT PACE</Text>
        <View style={styles.paceRow}>
          <Text style={[styles.pace, { color: s.color }]}>
            {formatPace(stats.currentPace, units)}
          </Text>
          <Text style={[styles.paceUnit, { color: s.color }]}>{paceLabel(units)}</Text>
        </View>
        <Text style={styles.reference}>
          {paused
            ? pausedNote
            : `target ${formatPace(targetSecPerMile, units)}${paceLabel(units)}`}
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile label={timeLabel} value={timeValue} />
        <StatTile
          label="Distance"
          value={formatDistance(stats.distanceMeters, units)}
          unit={distUnit}
        />
      </View>
      <View style={styles.grid}>
        <StatTile
          label={units === 'km' ? 'Last km' : 'Last mile'}
          value={formatPace(stats.lastMilePace, units)}
          unit={paceLabel(units)}
        />
        <StatTile
          label="Avg pace"
          value={formatPace(stats.avgPace, units)}
          unit={paceLabel(units)}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.controls}>
        <Pressable
          onPress={onTogglePause}
          style={({ pressed }) => [
            styles.pauseBtn,
            paused && styles.pauseBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.pauseText, paused && styles.pauseTextActive]}>
            {pauseLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onStop}
          style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
        >
          <Text style={styles.stopText}>STOP</Text>
        </Pressable>
      </View>
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
    borderWidth: 1,
    borderColor: colors.hairline,
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
  controls: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: space.sm,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pauseText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pauseTextActive: {
    color: colors.bg,
  },
  stop: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
