import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

type Props = {
  label: string;
  value: string;
  unit?: string;
  accentColor?: string;
};

export function StatTile({ label, value, unit, accentColor }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, accentColor ? { color: accentColor } : null]}>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    flex: 1,
    minWidth: 130,
  },
  label: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 5,
    marginBottom: 6,
  },
});
