import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaceEngine, type GpsSample } from '../src/lib/paceEngine';
import { MILE_IN_METERS } from '../src/theme';

// ---- Synthetic run generator ------------------------------------------------
// Everything is self-consistent with the engine's haversine (same Earth radius),
// so distance fed in reads back out to float precision.
const METERS_PER_DEG = 6371000 * (Math.PI / 180);
const metersToLng = (m: number) => m / METERS_PER_DEG;
const paceOf = (speedMps: number) => MILE_IN_METERS / speedMps; // sec/mile

type Segment = { speedMps: number; seconds: number; label?: string };

/** Generate 1 Hz GPS samples for a sequence of constant-speed segments. */
function generateRun(segments: Segment[]): {
  samples: GpsSample[];
  expectedMeters: number;
  totalSeconds: number;
} {
  const samples: GpsSample[] = [];
  let t = 0;
  let lng = 0;
  let expectedMeters = 0;
  for (const seg of segments) {
    for (let k = 0; k < seg.seconds; k++) {
      samples.push({ t, lat: 0, lng, accuracy: 5 });
      lng += metersToLng(seg.speedMps); // advance 1 second worth
      t += 1000;
      expectedMeters += seg.speedMps;
    }
  }
  samples.push({ t, lat: 0, lng, accuracy: 5 });
  const totalSeconds = t / 1000;
  return { samples, expectedMeters, totalSeconds };
}

function feed(engine: PaceEngine, samples: GpsSample[]): void {
  for (const s of samples) engine.addSample(s);
}

// A realistic 3-hour long run: warmup, easy blocks, tempo, a surge, cooldown.
const THREE_HOUR: Segment[] = [
  { speedMps: 2.4, seconds: 600, label: 'warmup' },
  { speedMps: 3.0, seconds: 2400, label: 'easy' },
  { speedMps: 3.6, seconds: 1200, label: 'tempo' },
  { speedMps: 2.9, seconds: 2400, label: 'easy' },
  { speedMps: 4.2, seconds: 240, label: 'surge' },
  { speedMps: 2.8, seconds: 2400, label: 'easy' },
  { speedMps: 3.5, seconds: 660, label: 'tempo2' },
  { speedMps: 2.3, seconds: 900, label: 'cooldown' },
]; // 10800 s = 3h exactly

// ---- distance + average pace over a 3-hour run ------------------------------
test('3-hour varied run: total distance accurate to <0.2%', () => {
  const { samples, expectedMeters } = generateRun(THREE_HOUR);
  const engine = new PaceEngine();
  feed(engine, samples);
  const err = Math.abs(engine.totalDistance - expectedMeters) / expectedMeters;
  assert.ok(
    err < 0.002,
    `distance ${engine.totalDistance.toFixed(0)}m vs expected ${expectedMeters.toFixed(0)}m (${(err * 100).toFixed(3)}%)`,
  );
});

test('3-hour varied run: average pace accurate to <2 s/mi', () => {
  const { samples, expectedMeters, totalSeconds } = generateRun(THREE_HOUR);
  const engine = new PaceEngine();
  feed(engine, samples);
  const avg = engine.averagePace(totalSeconds)!;
  const expected = (totalSeconds / expectedMeters) * MILE_IN_METERS;
  assert.ok(Math.abs(avg - expected) < 2, `avg ${avg.toFixed(1)} vs ${expected.toFixed(1)}`);
});

test('3-hour run: distance is finite, monotonic, no NaN/Infinity', () => {
  const { samples } = generateRun(THREE_HOUR);
  const engine = new PaceEngine();
  let prev = 0;
  for (const s of samples) {
    engine.addSample(s);
    const d = engine.totalDistance;
    assert.ok(Number.isFinite(d), `distance not finite: ${d}`);
    assert.ok(d >= prev, `distance went backwards: ${d} < ${prev}`);
    prev = d;
  }
  assert.ok(engine.totalDistance > 30000);
});

// ---- current pace tracks the actual speed at several speeds ------------------
for (const speed of [2.2, 2.8, 3.3, 3.9, 4.5]) {
  test(`current pace matches a sustained ${speed} m/s run`, () => {
    const engine = new PaceEngine();
    feed(engine, generateRun([{ speedMps: speed, seconds: 300 }]).samples);
    const cur = engine.currentPace(60)!;
    const expected = paceOf(speed);
    const err = Math.abs(cur - expected) / expected;
    assert.ok(err < 0.01, `current ${cur.toFixed(1)} vs ${expected.toFixed(1)} (${(err * 100).toFixed(2)}%)`);
  });
}

// ---- last-mile pace ---------------------------------------------------------
test('last-mile pace accurate after two miles at 3 m/s', () => {
  const engine = new PaceEngine();
  const secondsForTwoMiles = Math.ceil((2 * MILE_IN_METERS) / 3);
  feed(engine, generateRun([{ speedMps: 3, seconds: secondsForTwoMiles }]).samples);
  const lastMile = engine.trailingPaceByDistance(MILE_IN_METERS)!;
  const expected = paceOf(3);
  assert.ok(Math.abs(lastMile - expected) < 3, `last mile ${lastMile.toFixed(1)} vs ${expected.toFixed(1)}`);
});

// ---- speed change: current pace follows the new speed -----------------------
test('current pace follows a mid-run speed change (3 -> 4.5 m/s)', () => {
  const { samples } = generateRun([
    { speedMps: 3.0, seconds: 180 },
    { speedMps: 4.5, seconds: 120 },
  ]);
  const engine = new PaceEngine();
  feed(engine, samples);
  // After 120s at the new speed, a 60s window is entirely in the fast segment.
  const cur = engine.currentPace(60)!;
  const expected = paceOf(4.5);
  assert.ok(Math.abs(cur - expected) / expected < 0.01, `current ${cur.toFixed(1)} vs ${expected.toFixed(1)}`);
});

// ---- coaching percent correct ----------------------------------------------
test('evaluate: running 3 m/s against an 8:00 target says speed up ~10-15%', () => {
  const engine = new PaceEngine();
  feed(engine, generateRun([{ speedMps: 3, seconds: 200 }]).samples);
  const check = engine.evaluate(480, 60); // target 8:00/mi
  assert.equal(check.status, 'speed_up');
  // current ~536 s/mi; 536/480 - 1 = 11.7% -> rounds to 10%
  assert.ok(check.adjustPct > 8 && check.adjustPct < 15, `adjustPct ${check.adjustPct}`);
  assert.match(check.spokenText, /Speed up, about \d+ percent/);
});

// ---- performance: a 3-hour run ingests quickly ------------------------------
test('3-hour run (10800 samples) ingests in well under a second', () => {
  const { samples } = generateRun(THREE_HOUR);
  const engine = new PaceEngine();
  const start = process.hrtime.bigint();
  feed(engine, samples);
  // also do a trailing-pace query each 100 samples to catch O(n^2) walk-backs
  for (let i = 0; i < samples.length; i += 100) engine.currentPace(60);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(ms < 500, `ingest+query took ${ms.toFixed(1)}ms`);
});
