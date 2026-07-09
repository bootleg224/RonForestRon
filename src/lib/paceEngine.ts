import { haversineMeters } from './geo';
import { MILE_IN_METERS } from '../theme';

export type GpsSample = {
  t: number; // epoch ms
  lat: number;
  lng: number;
  accuracy: number | null; // meters of horizontal accuracy, if known
};

type TrackPoint = {
  t: number;
  lat: number;
  lng: number;
  cumDist: number; // cumulative accepted distance in meters at this point
};

// ---- Tuning knobs -----------------------------------------------------------
// Reject fixes worse than this (meters). GPS on phones is ~5m good, >25m junk.
const MAX_ACCURACY_M = 25;
// Reject implausible jumps: faster than this m/s between fixes is GPS teleport.
// 8 m/s ≈ 3:21 / mile — well above any sustainable running speed.
const MAX_SPEED_MPS = 8;
// Ignore sub-meter wiggle so a stationary phone doesn't accumulate drift.
const MIN_STEP_M = 1;
// Window used for the every-30s "pace check" — short so advice is responsive.
const PACE_CHECK_WINDOW_SEC = 60;

export type PaceCheckStatus = 'on_track' | 'speed_up' | 'ease_up' | 'no_signal';

export type PaceCheck = {
  status: PaceCheckStatus;
  deltaPct: number; // +ve = currently slower than target
  spokenText: string;
  currentPace: number | null; // sec/mile over the check window
};

export class PaceEngine {
  private points: TrackPoint[] = [];
  private _totalDistance = 0;

  reset(): void {
    this.points = [];
    this._totalDistance = 0;
  }

  get totalDistance(): number {
    return this._totalDistance;
  }

  /** Feed a raw GPS fix. Returns true if it was accepted (not filtered out). */
  addSample(s: GpsSample): boolean {
    if (s.accuracy != null && s.accuracy > MAX_ACCURACY_M) return false;

    const last = this.points[this.points.length - 1];
    if (!last) {
      this.points.push({ t: s.t, lat: s.lat, lng: s.lng, cumDist: 0 });
      return true;
    }

    const step = haversineMeters(last.lat, last.lng, s.lat, s.lng);
    const dt = (s.t - last.t) / 1000;
    if (dt <= 0) return false;
    if (step < MIN_STEP_M) return false; // stationary jitter
    if (step / dt > MAX_SPEED_MPS) return false; // teleport / bad fix

    this._totalDistance += step;
    this.points.push({
      t: s.t,
      lat: s.lat,
      lng: s.lng,
      cumDist: this._totalDistance,
    });
    return true;
  }

  /** Average pace across the whole run, in seconds per mile. */
  averagePace(elapsedSeconds: number): number | null {
    if (this._totalDistance <= 0 || elapsedSeconds <= 0) return null;
    const secPerMeter = elapsedSeconds / this._totalDistance;
    return secPerMeter * MILE_IN_METERS;
  }

  /** Pace over the most recent `windowMeters` of distance (sec/mile). */
  trailingPaceByDistance(windowMeters: number): number | null {
    if (this.points.length < 2) return null;
    const newest = this.points[this.points.length - 1];
    const targetCum = newest.cumDist - windowMeters;
    if (targetCum < 0) return null; // haven't covered a full window yet

    // Walk back to the first point at/under the window boundary.
    let i = this.points.length - 1;
    while (i > 0 && this.points[i].cumDist > targetCum) i--;
    const start = this.points[i];

    const dist = newest.cumDist - start.cumDist;
    const dt = (newest.t - start.t) / 1000;
    if (dist <= 0 || dt <= 0) return null;
    return (dt / dist) * MILE_IN_METERS;
  }

  /** Pace over the most recent `windowSeconds` (sec/mile). Drives pace checks. */
  trailingPaceByTime(windowSeconds: number): number | null {
    if (this.points.length < 2) return null;
    const newest = this.points[this.points.length - 1];
    const cutoff = newest.t - windowSeconds * 1000;

    let i = this.points.length - 1;
    while (i > 0 && this.points[i].t > cutoff) i--;
    const start = this.points[i];

    const dist = newest.cumDist - start.cumDist;
    const dt = (newest.t - start.t) / 1000;
    if (dist <= 0 || dt <= 0) return null;
    return (dt / dist) * MILE_IN_METERS;
  }

  /**
   * Compare recent pace to the target and produce a spoken instruction.
   * deadbandPct: treat anything within +/- this as "on track".
   */
  paceCheck(targetSecPerMile: number, deadbandPct = 4): PaceCheck {
    const current = this.trailingPaceByTime(PACE_CHECK_WINDOW_SEC);
    if (current == null) {
      return {
        status: 'no_signal',
        deltaPct: 0,
        currentPace: null,
        spokenText: 'Pace check. Not enough signal yet, keep running.',
      };
    }

    // Positive delta => current pace number is larger => you are slower.
    const deltaPct = ((current - targetSecPerMile) / targetSecPerMile) * 100;
    const mag = Math.round(Math.abs(deltaPct) / 5) * 5; // snap to nearest 5%

    if (Math.abs(deltaPct) <= deadbandPct || mag === 0) {
      return {
        status: 'on_track',
        deltaPct,
        currentPace: current,
        spokenText: 'Pace check. Good job, you are on track.',
      };
    }
    if (deltaPct > 0) {
      return {
        status: 'speed_up',
        deltaPct,
        currentPace: current,
        spokenText: `Pace check. Speed up about ${mag} percent.`,
      };
    }
    return {
      status: 'ease_up',
      deltaPct,
      currentPace: current,
      spokenText: `Pace check. Ease up about ${mag} percent, you are ahead of pace.`,
    };
  }
}
