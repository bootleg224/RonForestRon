import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import type { Settings } from '../lib/db';

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
};

type Option = { label: string; value: number };

const WINDOW_OPTIONS: Option[] = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2 min', value: 120 },
];

const PROMPT_OPTIONS: Option[] = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

function Segmented({
  options,
  selected,
  onSelect,
}: {
  options: Option[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={o.value}
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

      <Text style={styles.footnote}>
        Recommended: 60s window, prompts every 30s.
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
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
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
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 4,
    gap: 4,
    marginTop: space.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
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
