import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { WheelPicker, ITEM_HEIGHT } from './WheelPicker';

type Column = {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
};

type Props = {
  left: Column;
  right: Column;
  separator?: string;
  unit?: string;
};

/** Two snap-wheels with a center highlight band — shared by all pickers. */
export function DualWheel({ left, right, separator = ':', unit }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.band} pointerEvents="none" />
      <View style={styles.row}>
        <WheelPicker
          values={left.values}
          selectedValue={left.value}
          onChange={left.onChange}
          format={left.format}
          width={left.width}
        />
        <Text style={styles.separator}>{separator}</Text>
        <WheelPicker
          values={right.values}
          selectedValue={right.value}
          onChange={right.onChange}
          format={right.format}
          width={right.width}
        />
      </View>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    left: 0,
    right: 0,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textDim,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  unit: {
    marginTop: 10,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
