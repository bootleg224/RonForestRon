import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, radius, space } from '../theme';
import { Logo } from '../components/Logo';
import { PacePicker } from '../components/PacePicker';
import { TimePicker, DistancePicker } from '../components/GoalPickers';
import { PickerSheet } from '../components/PickerSheet';
import {
  formatClock,
  formatPace,
  paceLabel,
  distanceLabel,
  milesToUnit,
  type Units,
} from '../lib/format';
import type { RunMode } from '../hooks/useRunTracker';

type Props = {
  pace: number; // sec/mile
  onPace: (v: number) => void;
  mode: RunMode;
  onMode: (m: RunMode) => void;
  goalTimeSec: number;
  onGoalTime: (s: number) => void;
  goalDistanceMi: number;
  onGoalDistance: (mi: number) => void;
  onStart: () => void;
  onHistory: () => void;
  onSettings: () => void;
  units: Units;
};

const MODES: { key: RunMode; label: string; blurb: string }[] = [
  { key: 'open', label: 'Open', blurb: 'Timer counts up. Stop when you’re done.' },
  { key: 'time', label: 'Time', blurb: 'Counts down from your goal time, then auto-stops.' },
  { key: 'distance', label: 'Distance', blurb: 'Counts up and auto-stops at your goal distance.' },
];

type Sheet = 'pace' | 'goal' | null;

export function SetupScreen(props: Props) {
  const { pace, onPace, mode, onMode, goalTimeSec, onGoalTime, units } = props;
  const { goalDistanceMi, onGoalDistance, onStart, onHistory, onSettings } = props;
  const [sheet, setSheet] = useState<Sheet>(null);
  const { width } = useWindowDimensions();
  const logoSize = Math.round(width * 0.9);

  const blurb = MODES.find((m) => m.key === mode)?.blurb ?? '';
  const goalValue =
    mode === 'time'
      ? formatClock(goalTimeSec)
      : `${milesToUnit(goalDistanceMi, units).toFixed(1)} ${distanceLabel(units)}`;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size={logoSize} />
        </View>

        {/* Target pace — tap to open the wheel in a sheet. */}
        <Pressable style={styles.field} onPress={() => setSheet('pace')}>
          <View>
            <Text style={styles.fieldLabel}>TARGET PACE</Text>
            <Text style={styles.fieldValue}>
              {formatPace(pace, units)}
              <Text style={styles.fieldUnit}> {paceLabel(units)}</Text>
            </Text>
          </View>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>

        {/* Run type. */}
        <Text style={styles.sectionLabel}>RUN TYPE</Text>
        <View style={styles.segmented}>
          {MODES.map((m) => {
            const active = m.key === mode;
            return (
              <Pressable
                key={m.key}
                onPress={() => onMode(m.key)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.blurb}>{blurb}</Text>

        {/* Goal — tap to open the wheel in a sheet. */}
        {mode !== 'open' && (
          <Pressable style={[styles.field, styles.fieldSpaced]} onPress={() => setSheet('goal')}>
            <View>
              <Text style={styles.fieldLabel}>
                {mode === 'time' ? 'GOAL TIME' : 'GOAL DISTANCE'}
              </Text>
              <Text style={styles.fieldValue}>{goalValue}</Text>
            </View>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onStart}
          style={({ pressed }) => [styles.go, pressed && styles.pressed]}
        >
          <Text style={styles.goText}>GO</Text>
        </Pressable>
        <View style={styles.links}>
          <Pressable onPress={onSettings} hitSlop={12}>
            <Text style={styles.link}>Settings</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={onHistory} hitSlop={12}>
            <Text style={styles.link}>Run history</Text>
          </Pressable>
        </View>
      </View>

      <PickerSheet
        visible={sheet === 'pace'}
        title="Target pace"
        onClose={() => setSheet(null)}
      >
        <PacePicker value={pace} onChange={onPace} units={units} />
      </PickerSheet>
      <PickerSheet
        visible={sheet === 'goal'}
        title={mode === 'time' ? 'Goal time' : 'Goal distance'}
        onClose={() => setSheet(null)}
      >
        {mode === 'time' ? (
          <TimePicker value={goalTimeSec} onChange={onGoalTime} />
        ) : (
          <DistancePicker value={goalDistanceMi} onChange={onGoalDistance} units={units} />
        )}
      </PickerSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  header: {
    alignItems: 'center',
    marginHorizontal: -space.lg, // full-bleed so the logo can span ~90% of screen width
    marginTop: space.md,
    marginBottom: space.xl,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldSpaced: {
    marginTop: space.lg,
  },
  fieldLabel: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldValue: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  fieldUnit: {
    color: colors.textDim,
    fontSize: 20,
    fontWeight: '700',
  },
  edit: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  segmented: {
    flexDirection: 'row',
    gap: space.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.bg,
    fontWeight: '800',
  },
  blurb: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: space.sm,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    paddingTop: space.sm,
    gap: space.md,
  },
  go: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  goText: {
    color: colors.bg,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  link: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '700',
  },
  dot: {
    color: colors.textFaint,
    fontSize: 15,
  },
});
