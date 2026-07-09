import { DualWheel } from './DualWheel';
import {
  secPerMileToUnit,
  secPerUnitToMile,
  type Units,
} from '../lib/format';

const MI_MIN = Array.from({ length: 13 }, (_, i) => i + 4); // 4..16 min/mi
const KM_MIN = Array.from({ length: 11 }, (_, i) => i + 2); // 2..12 min/km
const SEC_VALUES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5..55

type Props = {
  value: number; // target pace, seconds per mile (canonical)
  onChange: (secondsPerMile: number) => void;
  units: Units;
};

/** iOS-Timer-style pace picker: scrollable minutes : seconds wheels, shown in
 *  the chosen unit but always emitting canonical seconds-per-mile. */
export function PacePicker({ value, onChange, units }: Props) {
  const perUnit = secPerMileToUnit(value, units);
  const minutes = Math.floor(perUnit / 60);
  const seconds = Math.round((perUnit % 60) / 5) * 5;
  const emit = (m: number, s: number) => onChange(secPerUnitToMile(m * 60 + s, units));

  return (
    <DualWheel
      separator=":"
      unit={units === 'km' ? 'min / km' : 'min / mile'}
      left={{
        values: units === 'km' ? KM_MIN : MI_MIN,
        value: minutes,
        onChange: (m) => emit(m, seconds),
      }}
      right={{
        values: SEC_VALUES,
        value: seconds,
        onChange: (s) => emit(minutes, s),
        format: (v) => v.toString().padStart(2, '0'),
      }}
    />
  );
}
