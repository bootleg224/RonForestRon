import { DualWheel } from './DualWheel';
import { milesToUnit, unitToMiles, type Units } from '../lib/format';

const GOAL_MIN = Array.from({ length: 180 }, (_, i) => i + 1); // 1..180 min
const SEC_STEP = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5..55
const WHOLE_DIST = Array.from({ length: 51 }, (_, i) => i); // 0..50 (mi or km)
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
  value: number; // goal distance in miles (canonical)
  onChange: (miles: number) => void;
  units: Units;
};

/** Goal-distance picker: whole . tenths, shown in the chosen unit but always
 *  emitting canonical miles. */
export function DistancePicker({ value, onChange, units }: DistanceProps) {
  const shown = milesToUnit(value, units);
  const whole = Math.floor(shown);
  const tenth = Math.round((shown - whole) * 10);
  const emit = (w: number, t: number) => onChange(unitToMiles(w + t / 10, units));

  return (
    <DualWheel
      separator="."
      unit={`goal distance (${units === 'km' ? 'kilometers' : 'miles'})`}
      left={{
        values: WHOLE_DIST,
        value: whole,
        onChange: (w) => emit(w, tenth),
      }}
      right={{
        values: TENTHS,
        value: tenth,
        onChange: (t) => emit(whole, t),
      }}
    />
  );
}
