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

export type PaceCheckStatus = 'on_track' | 'speed_up' | 'ease_up' | 'no_signal';

export type PaceCheck = {
  status: PaceCheckStatus;
  currentPace: number | null; // sec/mile over the coaching window
  adjustPct: number; // +ve = must run this % FASTER to hit target (speed change)
  spokenText: string;
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
    return (elapsedSeconds / this._totalDistance) * MILE_IN_METERS;
  }

  /** Pace over the most recent `windowMeters` of distance (sec/mile). */
  trailingPaceByDistance(windowMeters: number): number | null {
    if (this.points.length < 2) return null;
    const newest = this.points[this.points.length - 1];
    const targetCum = newest.cumDist - windowMeters;
    if (targetCum < 0) return null;

    let i = this.points.length - 1;
    while (i > 0 && this.points[i].cumDist > targetCum) i--;
    const start = this.points[i];

    const dist = newest.cumDist - start.cumDist;
    const dt = (newest.t - start.t) / 1000;
    if (dist <= 0 || dt <= 0) return null;
    return (dt / dist) * MILE_IN_METERS;
  }

  /**
   * Pace over the most recent `windowSeconds` (sec/mile) — "how fast am I going
   * right now". Pass `nowMs` (current active time) so the window ENDS at now, not
   * at the last GPS fix: then if you stop, elapsed time keeps growing while
   * distance stays flat, so the pace decays instead of freezing at your last
   * moving value. Returns null once you've been stopped longer than the window.
   */
  currentPace(windowSeconds: number, nowMs?: number): number | null {
    if (this.points.length < 2) return null;
    const newest = this.points[this.points.length - 1];
    const end = nowMs ?? newest.t;
    const cutoff = end - windowSeconds * 1000;

    // start = earliest point still inside the window.
    let i = this.points.length - 1;
    while (i > 0 && this.points[i - 1].t >= cutoff) i--;
    const start = this.points[i];

    const dist = newest.cumDist - start.cumDist;
    const dt = (end - start.t) / 1000;
    if (dist <= 0 || dt <= 0) return null;
    return (dt / dist) * MILE_IN_METERS;
  }

  /**
   * Compare CURRENT pace (recent window) to the target and produce coaching to
   * get back on pace *now* — deliberately not based on cumulative average, so a
   * slow start never demands a sprint to "make up" time.
   *
   * The magnitude is a SPEED change percentage: "how much faster/slower do I
   * need to run" — since speed = 1/pace, that's currentPace/targetPace - 1.
   *
   * @param windowSec    how far back "current" looks (the coaching window)
   * @param deadbandPct  within +/- this % counts as on pace
   */
  evaluate(
    targetSecPerMile: number,
    windowSec: number,
    nowMs?: number,
    deadbandPct = 4,
  ): PaceCheck {
    const current = this.currentPace(windowSec, nowMs);
    if (current == null) {
      return {
        status: 'no_signal',
        currentPace: null,
        adjustPct: 0,
        spokenText: 'Pace check. Not moving yet — get going.',
      };
    }

    // +ve => currently slower than target => must run this % faster.
    const adjustPct = (current / targetSecPerMile - 1) * 100;
    const mag = Math.round(Math.abs(adjustPct) / 5) * 5; // nearest 5%
    const wayOff = mag > 40; // beyond ~40%: keep it qualitative

    if (Math.abs(adjustPct) <= deadbandPct || mag === 0) {
      return {
        status: 'on_track',
        currentPace: current,
        adjustPct,
        spokenText: 'Pace check. On pace — nice.',
      };
    }
    if (adjustPct > 0) {
      return {
        status: 'speed_up',
        currentPace: current,
        adjustPct,
        spokenText: wayOff
          ? 'Pace check. Speed up — push hard.'
          : `Pace check. Speed up, about ${mag} percent.`,
      };
    }
    return {
      status: 'ease_up',
      currentPace: current,
      adjustPct,
      spokenText: wayOff
        ? 'Pace check. Ease up — way ahead.'
        : `Pace check. Ease up, about ${mag} percent.`,
    };
  }
}
