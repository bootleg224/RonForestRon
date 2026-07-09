import Svg, { Rect, Path } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  /** Rendered width in px. Height is half the width (2:1 track). */
  size?: number;
};

// Six concentric lane lines (rounded "stadium" rects), a coral finish stripe
// across the bottom straight, and an "RFR" monogram drawn as strokes so it
// renders identically on every device regardless of installed fonts.
// Authored in a 200x100 viewBox; scales crisply to any size.
const LANES = [
  { x: 11, y: 4, w: 178, h: 92, rx: 46, sw: 3 },
  { x: 18, y: 11, w: 164, h: 78, rx: 39, sw: 1.4 },
  { x: 25, y: 18, w: 150, h: 64, rx: 32, sw: 1.4 },
  { x: 32, y: 25, w: 136, h: 50, rx: 25, sw: 1.4 },
  { x: 39, y: 32, w: 122, h: 36, rx: 18, sw: 1.4 },
  { x: 46, y: 39, w: 108, h: 22, rx: 11, sw: 1.4 },
];

// R / F / R as single stroked paths (stem + bowl + leg / stem + two bars).
const LETTERS = [
  'M80 60 V40 H86 C92 40 92 50 86 50 H80 M80 50 L88 60',
  'M96 60 V40 H104 M96 50 H102',
  'M108 60 V40 H114 C120 40 120 50 114 50 H108 M108 50 L116 60',
];

export function Logo({ size = 256 }: Props) {
  return (
    <Svg width={size} height={size / 2} viewBox="0 0 200 100">
      {LANES.map((l, i) => (
        <Rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={l.rx}
          fill="none"
          stroke={colors.text}
          strokeWidth={l.sw}
        />
      ))}
      <Rect x={128} y={62} width={4} height={33} fill={colors.accent} />
      {LETTERS.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill="none"
          stroke={colors.text}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
