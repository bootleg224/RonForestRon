import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';

export const ITEM_HEIGHT = 52;
const VISIBLE = 5; // odd, so one row sits dead center
const PAD = ITEM_HEIGHT * ((VISIBLE - 1) / 2);

type Props = {
  values: number[];
  selectedValue: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
};

/** A snap-scrolling wheel column (one of the pace picker's two columns). */
export function WheelPicker({
  values,
  selectedValue,
  onChange,
  format = String,
  width = 96,
}: Props) {
  const initialIndex = Math.max(0, values.indexOf(selectedValue));
  const [centered, setCentered] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  const indexFromOffset = (y: number) =>
    Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = indexFromOffset(e.nativeEvent.contentOffset.y);
    if (idx !== centered) setCentered(idx);
  };

  const commit = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = indexFromOffset(e.nativeEvent.contentOffset.y);
    setCentered(idx);
    if (values[idx] !== selectedValue) onChange(values[idx]);
  };

  return (
    <View style={[styles.container, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={commit}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - centered);
          const active = dist === 0;
          return (
            <View key={v} style={styles.item}>
              <Text
                style={[
                  styles.text,
                  active && styles.textActive,
                  dist === 1 && styles.textNear,
                  dist >= 2 && styles.textFar,
                ]}
              >
                {format(v)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  textActive: {
    fontSize: 46,
    fontWeight: '800',
    color: colors.text,
  },
  textNear: {
    color: colors.textDim,
    opacity: 0.9,
  },
  textFar: {
    color: colors.textFaint,
    opacity: 0.55,
  },
});
