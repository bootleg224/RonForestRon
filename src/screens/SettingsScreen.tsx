import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import type { Settings } from '../lib/db';
import type { Units } from '../lib/format';

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
};

type Option<T extends string | number> = { label: string; value: T };

const UNIT_OPTIONS: Option<Units>[] = [
  { label: 'Miles', value: 'mi' },
  { label: 'Kilometers', value: 'km' },
];

const WINDOW_OPTIONS: Option<number>[] = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2 min', value: 120 },
];

const PROMPT_OPTIONS: Option<number>[] = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

function Segmented<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: Option<T>[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onSelect(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Units</Text>
        <Text style={styles.cardBody}>
          Distance and pace shown throughout the app.
        </Text>
        <Segmented
          options={UNIT_OPTIONS}
          selected={settings.units}
          onSelect={(v) => onChange({ units: v })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coaching window</Text>
        <Text style={styles.cardBody}>
          How far back “current pace” looks when coaching you. This compares how
          you’re running <Text style={styles.em}>right now</Text> to your target —
          not your whole-run average — so a slow start never asks you to sprint to
          make up time. Shorter reacts faster but is jumpier; longer is smoother.
        </Text>
        <Segmented
          options={WINDOW_OPTIONS}
          selected={settings.coachingWindowSec}
          onSelect={(v) => onChange({ coachingWindowSec: v })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prompt frequency</Text>
        <Text style={styles.cardBody}>
          How often you hear a spoken pace check while running.
        </Text>
        <Segmented
          options={PROMPT_OPTIONS}
          selected={settings.promptIntervalSec}
          onSelect={(v) => onChange({ promptIntervalSec: v })}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.cardTitle}>Auto-pause</Text>
          <Switch
            value={settings.autoPause}
            onValueChange={(v) => onChange({ autoPause: v })}
            trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
            thumbColor={colors.text}
            ios_backgroundColor={colors.surfaceAlt}
          />
        </View>
        <Text style={styles.cardBody}>
          Pauses the timer and pace tracking when you stop moving (e.g. a red
          light) and resumes when you go again — so stops don’t skew your pace.
        </Text>
      </View>

      <Text style={styles.footnote}>
        Recommended: 60s window, prompts every 30s, auto-pause on.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  back: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    marginTop: space.xs,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: space.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  em: {
    color: colors.text,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
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
  footnote: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginTop: space.xs,
  },
});
