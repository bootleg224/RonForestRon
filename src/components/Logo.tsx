import Svg, { Rect, Path, G } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  /** Rendered width in px. Height is half the width (2:1 track). */
  size?: number;
};

// A top-down 4-lane running track: a coral stadium band (matching the app
// accent) with white lane lines and rims, a finish line and staggered start
// marks on the top straight, and an infield that matches the app background so
// the track reads as a ring. "RFR" is set in Michroma, padded clear of the
// lanes. Glyph outlines are baked to vector paths (via fonttools) so the mark
// renders identically on every device with no runtime font.
// Authored in a 200x100 viewBox.
//
// Michroma (c) 2011 The Michroma Project Authors, SIL Open Font License 1.1
// — see licenses/Michroma-OFL.txt.

const OUTER = { x: 5, y: 5, w: 190, h: 90, rx: 45 };
const INFIELD = { x: 29, y: 29, w: 142, h: 42, rx: 21 };

// Three white lines dividing the band into 4 lanes.
const LANE_LINES = [
  { x: 11, y: 11, w: 178, h: 78, rx: 39 },
  { x: 17, y: 17, w: 166, h: 66, rx: 33 },
  { x: 23, y: 23, w: 154, h: 54, rx: 27 },
];

// Finish line across the top straight (left side). The innermost (bottom) lane
// starts at the finish; the outer lanes stagger back, so the topmost lane
// (position 4) is furthest from the finish. Mirrored about x=100 (finish left).
const FINISH = { x: 67, y: 5, w: 3, h: 24 };
const START_MARKS = [
  { x: 92, y: 5, w: 2, h: 6 },
  { x: 84, y: 11, w: 2, h: 6 },
  { x: 76, y: 17, w: 2, h: 6 },
];

// RFR outlines (Michroma), size 32 in the 200x100 viewBox, ink centered on the
// infield at (100, 50) — ~28 units of horizontal padding to the lanes.
const RFR_TRANSFORM = 'translate(53.695 62) scale(0.015625 -0.015625)';
const RFR_PATH =
  'M196.0 1536H1224.0Q1449.0 1536 1586.5 1516.0Q1724.0 1496 1795.0 1447.0Q1866.0 1398 1891.0 1313.0Q1916.0 1228 1916.0 1098V1058Q1916.0 938 1887.5 851.5Q1859.0 765 1778.0 711.5Q1697.0 658 1538.0 636L1872.0 0H1680.0L1353.0 622Q1333.0 621 1311.5 621.0Q1290.0 621 1267.0 621H388.0V0H196.0ZM388.0 787H1237.0Q1408.0 787 1506.5 798.5Q1605.0 810 1651.5 839.0Q1698.0 868 1711.0 921.0Q1724.0 974 1724.0 1058V1098Q1724.0 1193 1706.0 1248.0Q1688.0 1303 1634.0 1329.0Q1580.0 1355 1473.0 1362.5Q1366.0 1370 1187.0 1370H388.0Z M2279.0 0V1536H3727.0V1376H2471.0V864H3670.0V704H2471.0V0Z M4011.0 1536H5039.0Q5264.0 1536 5401.5 1516.0Q5539.0 1496 5610.0 1447.0Q5681.0 1398 5706.0 1313.0Q5731.0 1228 5731.0 1098V1058Q5731.0 938 5702.5 851.5Q5674.0 765 5593.0 711.5Q5512.0 658 5353.0 636L5687.0 0H5495.0L5168.0 622Q5148.0 621 5126.5 621.0Q5105.0 621 5082.0 621H4203.0V0H4011.0ZM4203.0 787H5052.0Q5223.0 787 5321.5 798.5Q5420.0 810 5466.5 839.0Q5513.0 868 5526.0 921.0Q5539.0 974 5539.0 1058V1098Q5539.0 1193 5521.0 1248.0Q5503.0 1303 5449.0 1329.0Q5395.0 1355 5288.0 1362.5Q5181.0 1370 5002.0 1370H4203.0Z';

export function Logo({ size = 256 }: Props) {
  return (
    <Svg width={size} height={size / 2} viewBox="0 0 200 100">
      {/* Track surface + white outer rim */}
      <Rect
        x={OUTER.x}
        y={OUTER.y}
        width={OUTER.w}
        height={OUTER.h}
        rx={OUTER.rx}
        fill={colors.accent}
        stroke={colors.surface}
        strokeWidth={1.3}
      />
      {/* White lane lines */}
      {LANE_LINES.map((l, i) => (
        <Rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={l.rx}
          fill="none"
          stroke={colors.surface}
          strokeWidth={1.3}
        />
      ))}
      {/* Staggered start marks */}
      {START_MARKS.map((m, i) => (
        <Rect key={i} x={m.x} y={m.y} width={m.w} height={m.h} fill={colors.surface} />
      ))}
      {/* Finish line */}
      <Rect x={FINISH.x} y={FINISH.y} width={FINISH.w} height={FINISH.h} fill={colors.surface} />
      {/* Infield (matches app background) + white inner rim */}
      <Rect
        x={INFIELD.x}
        y={INFIELD.y}
        width={INFIELD.w}
        height={INFIELD.h}
        rx={INFIELD.rx}
        fill={colors.bg}
        stroke={colors.surface}
        strokeWidth={1.3}
      />
      <G transform={RFR_TRANSFORM}>
        <Path d={RFR_PATH} fill={colors.text} />
      </G>
    </Svg>
  );
}
