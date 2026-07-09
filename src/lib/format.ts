import { MILE_IN_METERS } from '../theme';

/** Distance units the app can display. Internally everything is metric-canonical
 *  (distance in meters, pace in seconds-per-mile); we convert only at the edges. */
export type Units = 'mi' | 'km';

const KM_IN_METERS = 1000;

/** Meters in one unit of the given system. */
export function unitMeters(u: Units): number {
  return u === 'km' ? KM_IN_METERS : MILE_IN_METERS;
}

/** Short distance label, e.g. "mi" / "km". */
export function distanceLabel(u: Units): string {
  return u === 'km' ? 'km' : 'mi';
}

/** Short pace label, e.g. "/mi" / "/km". */
export function paceLabel(u: Units): string {
  return u === 'km' ? '/km' : '/mi';
}

/** Convert a sec/mile pace into seconds-per-unit (for display or picker math). */
export function secPerMileToUnit(secPerMile: number, u: Units): number {
  return secPerMile * (unitMeters(u) / MILE_IN_METERS);
}

/** Convert a seconds-per-unit pace back into the canonical sec/mile. */
export function secPerUnitToMile(secPerUnit: number, u: Units): number {
  return secPerUnit * (MILE_IN_METERS / unitMeters(u));
}

/** Convert a canonical mileage into the chosen display unit. */
export function milesToUnit(miles: number, u: Units): number {
  return u === 'km' ? miles * (MILE_IN_METERS / KM_IN_METERS) : miles;
}

/** Convert a value in the chosen unit back into canonical miles. */
export function unitToMiles(value: number, u: Units): number {
  return u === 'km' ? value * (KM_IN_METERS / MILE_IN_METERS) : value;
}

/** Format a duration in seconds as H:MM:SS (drops the hour when < 1h). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(h > 0 ? 2 : 1, '0');
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format a canonical sec/mile pace as M:SS in the chosen unit ("--:--" if invalid). */
export function formatPace(secondsPerMile: number | null, units: Units = 'mi'): string {
  if (secondsPerMile == null || !isFinite(secondsPerMile) || secondsPerMile <= 0) {
    return '--:--';
  }
  const s = Math.round(secPerMileToUnit(secondsPerMile, units));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Meters -> chosen unit, formatted to 2 decimals. */
export function formatDistance(meters: number, units: Units = 'mi'): string {
  return (meters / unitMeters(units)).toFixed(2);
}

/** Parse a "M:SS" or minutes+seconds pair into seconds (per whatever unit). */
export function paceToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}
