import Svg, { Rect, Path, G } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  /** Rendered width in px. Height is half the width (2:1 track). */
  size?: number;
};

// A top-down 4-lane running track: a coral stadium band (matching the app
// accent) with white lane lines and rims, a finish line and staggered start
// marks on the top straight, and an infield that matches the app background so
// the track reads as a ring. "RFR" is set in Barlow Condensed SemiBold, padded
// clear of the lanes. Glyph outlines are baked to vector paths (via fonttools)
// so the mark renders identically on every device with no runtime font.
// Authored in a 200x100 viewBox.
//
// Barlow Condensed (c) 2017 The Barlow Project Authors, SIL Open Font License
// 1.1 — see licenses/BarlowCondensed-OFL.txt.

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

// RFR outlines (Barlow Condensed SemiBold), fitted to the infield: cap height
// 22, centered on x=100, baseline at y=61 (≈10 units of padding all around).
const RFR_TRANSFORM = 'translate(78.99 61) scale(0.031429 -0.031429)';
const RFR_PATH =
  'M318.0 10 233.0 297Q231.0 301 228.0 301H175.0Q170.0 301 170.0 296V12Q170.0 7 166.5 3.5Q163.0 0 158.0 0H66.0Q61.0 0 57.5 3.5Q54.0 7 54.0 12V688Q54.0 693 57.5 696.5Q61.0 700 66.0 700H254.0Q307.0 700 347.5 674.5Q388.0 649 410.5 602.5Q433.0 556 433.0 496Q433.0 434 409.0 389.0Q385.0 344 342.0 321Q338.0 320 339.0 315L437.0 14Q438.0 12 438.0 9Q438.0 0 427.0 0H331.0Q321.0 0 318.0 10ZM170.0 595V396Q170.0 391 175.0 391H236.0Q272.0 391 294.5 419.0Q317.0 447 317.0 495Q317.0 543 294.5 571.5Q272.0 600 236.0 600H175.0Q170.0 600 170.0 595Z M851.0 600H636.0Q631.0 600 631.0 595V406Q631.0 401 636.0 401H763.0Q768.0 401 771.5 397.5Q775.0 394 775.0 389V312Q775.0 307 771.5 303.5Q768.0 300 763.0 300H636.0Q631.0 300 631.0 295V12Q631.0 7 627.5 3.5Q624.0 0 619.0 0H527.0Q522.0 0 518.5 3.5Q515.0 7 515.0 12V688Q515.0 693 518.5 696.5Q522.0 700 527.0 700H851.0Q856.0 700 859.5 696.5Q863.0 693 863.0 688V612Q863.0 607 859.5 603.5Q856.0 600 851.0 600Z M1194.0 10 1109.0 297Q1107.0 301 1104.0 301H1051.0Q1046.0 301 1046.0 296V12Q1046.0 7 1042.5 3.5Q1039.0 0 1034.0 0H942.0Q937.0 0 933.5 3.5Q930.0 7 930.0 12V688Q930.0 693 933.5 696.5Q937.0 700 942.0 700H1130.0Q1183.0 700 1223.5 674.5Q1264.0 649 1286.5 602.5Q1309.0 556 1309.0 496Q1309.0 434 1285.0 389.0Q1261.0 344 1218.0 321Q1214.0 320 1215.0 315L1313.0 14Q1314.0 12 1314.0 9Q1314.0 0 1303.0 0H1207.0Q1197.0 0 1194.0 10ZM1046.0 595V396Q1046.0 391 1051.0 391H1112.0Q1148.0 391 1170.5 419.0Q1193.0 447 1193.0 495Q1193.0 543 1170.5 571.5Q1148.0 600 1112.0 600H1051.0Q1046.0 600 1046.0 595Z';

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
