import { DualWheel } from './DualWheel';

const GOAL_MIN = Array.from({ length: 180 }, (_, i) => i + 1); // 1..180 min
const SEC_STEP = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5..55
const WHOLE_MILES = Array.from({ length: 51 }, (_, i) => i); // 0..50
const TENTHS = Array.from({ length: 10 }, (_, i) => i); // .0..​.9

type TimeProps = {
  value: number; // goal time in seconds
  onChange: (seconds: number) => void;
};

/** Goal-time picker: minutes : seconds -> total seconds. */
export function TimePicker({ value, onChange }: TimeProps) {
  const minutes = Math.max(1, Math.floor(value / 60));
  const seconds = Math.round((value % 60) / 5) * 5;

  return (
    <DualWheel
      separator=":"
      unit="goal time (min : sec)"
      left={{
        values: GOAL_MIN,
        value: minutes,
        onChange: (m) => onChange(m * 60 + seconds),
      }}
      right={{
        values: SEC_STEP,
        value: seconds,
        onChange: (s) => onChange(minutes * 60 + s),
        format: (v) => v.toString().padStart(2, '0'),
      }}
    />
  );
}

type DistanceProps = {
  value: number; // goal distance in miles
  onChange: (miles: number) => void;
};

/** Goal-distance picker: whole . tenths miles. */
export function DistancePicker({ value, onChange }: DistanceProps) {
  const whole = Math.floor(value);
  const tenth = Math.round((value - whole) * 10);

  return (
    <DualWheel
      separator="."
      unit="goal distance (miles)"
      left={{
        values: WHOLE_MILES,
        value: whole,
        onChange: (w) => onChange(w + tenth / 10),
      }}
      right={{
        values: TENTHS,
        value: tenth,
        onChange: (t) => onChange(whole + t / 10),
      }}
    />
  );
}
