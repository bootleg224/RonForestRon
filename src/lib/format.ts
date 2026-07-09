import { MILE_IN_METERS } from '../theme';

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

/** Format a pace given in seconds-per-mile as M:SS (returns "--:--" if invalid). */
export function formatPace(secondsPerMile: number | null): string {
  if (secondsPerMile == null || !isFinite(secondsPerMile) || secondsPerMile <= 0) {
    return '--:--';
  }
  const s = Math.round(secondsPerMile);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Meters -> miles, formatted to 2 decimals. */
export function formatMiles(meters: number): string {
  return (meters / MILE_IN_METERS).toFixed(2);
}

/** Parse a "M:SS" or minutes+seconds pair into seconds-per-mile. */
export function paceToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}
