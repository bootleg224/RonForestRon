import { DualWheel } from './DualWheel';

const MIN_VALUES = Array.from({ length: 13 }, (_, i) => i + 4); // 4..16 min/mi
const SEC_VALUES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5..55

type Props = {
  value: number; // target pace, seconds per mile
  onChange: (secondsPerMile: number) => void;
};

/** iOS-Timer-style pace picker: scrollable minutes : seconds wheels. */
export function PacePicker({ value, onChange }: Props) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round((value % 60) / 5) * 5;

  return (
    <DualWheel
      separator=":"
      unit="min / mile"
      left={{
        values: MIN_VALUES,
        value: minutes,
        onChange: (m) => onChange(m * 60 + seconds),
      }}
      right={{
        values: SEC_VALUES,
        value: seconds,
        onChange: (s) => onChange(minutes * 60 + s),
        format: (v) => v.toString().padStart(2, '0'),
      }}
    />
  );
}
