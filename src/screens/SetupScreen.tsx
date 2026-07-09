import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme';
import { paceToSeconds } from '../lib/format';

type Props = {
  onStart: (targetSecPerMile: number) => void;
  onHistory: () => void;
};

export function SetupScreen({ onStart, onHistory }: Props) {
  const [minutes, setMinutes] = useState('9');
  const [seconds, setSeconds] = useState('00');

  const min = parseInt(minutes || '0', 10);
  const sec = parseInt(seconds || '0', 10);
  const valid = min > 0 && sec >= 0 && sec < 60 && min < 60;
  const target = paceToSeconds(min, sec);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ron Forest Ron</Text>
          <Pressable onPress={onHistory} hitSlop={12}>
            <Text style={styles.historyLink}>History ›</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Set your target pace and run.</Text>
      </View>

      <View style={styles.paceBlock}>
        <Text style={styles.paceLabel}>TARGET PACE</Text>
        <View style={styles.paceInputRow}>
          <TextInput
            style={styles.paceInput}
            value={minutes}
            onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={styles.paceInput}
            value={seconds}
            onChangeText={(t) => setSeconds(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            onBlur={() => setSeconds((s) => (s || '0').padStart(2, '0'))}
          />
          <Text style={styles.perMile}>/ mile</Text>
        </View>
      </View>

      <Pressable
        onPress={() => valid && onStart(target)}
        disabled={!valid}
        style={({ pressed }) => [
          styles.goButton,
          !valid && styles.goDisabled,
          pressed && valid && styles.goPressed,
        ]}
      >
        <Text style={styles.goText}>GO</Text>
      </Pressable>

      {!valid ? (
        <Text style={styles.hint}>Enter a pace like 9:00 (seconds 0–59).</Text>
      ) : (
        <Text style={styles.hint}>Prompts every 30s. Keep Spotify playing.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: '900',
  },
  historyLink: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: 6,
  },
  paceBlock: {
    alignItems: 'center',
  },
  paceLabel: {
    color: colors.textDim,
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  paceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paceInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: 100,
    borderRadius: 16,
    paddingVertical: 8,
  },
  colon: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  perMile: {
    color: colors.textDim,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 14,
  },
  goButton: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  goPressed: {
    opacity: 0.85,
  },
  goText: {
    color: colors.bg,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  hint: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 13,
  },
});
