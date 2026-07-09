import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters } from '../src/lib/geo';
import { PaceEngine, type GpsSample } from '../src/lib/paceEngine';
import {
  formatClock,
  formatPace,
  formatMiles,
  paceToSeconds,
} from '../src/lib/format';
import { MILE_IN_METERS } from '../src/theme';

// Meters of easting at the equator -> degrees of longitude.
const METERS_PER_DEG = 6371000 * (Math.PI / 180);
const metersToLng = (m: number) => m / METERS_PER_DEG;

/** Build a straight eastbound run at a constant speed (m/s), 1 fix/sec. */
function straightRun(speedMps: number, seconds: number): GpsSample[] {
  const out: GpsSample[] = [];
  for (let i = 0; i <= seconds; i++) {
    out.push({
      t: i * 1000,
      lat: 0,
      lng: metersToLng(speedMps * i),
      accuracy: 5,
    });
  }
  return out;
}

// ---- geo --------------------------------------------------------------------
test('haversine: 1 meter east reads back as ~1m', () => {
  const d = haversineMeters(0, 0, 0, metersToLng(1));
  assert.ok(Math.abs(d - 1) < 0.01, `expected ~1m, got ${d}`);
});

test('haversine: identical points = 0', () => {
  assert.equal(haversineMeters(37.5, -122.1, 37.5, -122.1), 0);
});

// ---- formatting -------------------------------------------------------------
test('formatClock', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(3661), '1:01:01');
});

test('formatPace', () => {
  assert.equal(formatPace(540), '9:00');
  assert.equal(formatPace(536.4), '8:56');
  assert.equal(formatPace(null), '--:--');
  assert.equal(formatPace(0), '--:--');
});

test('formatMiles + paceToSeconds', () => {
  assert.equal(formatMiles(MILE_IN_METERS), '1.00');
  assert.equal(formatMiles(MILE_IN_METERS / 2), '0.50');
  assert.equal(paceToSeconds(9, 0), 540);
  assert.equal(paceToSeconds(8, 30), 510);
});

// ---- pace engine: distance + pace -------------------------------------------
test('constant 3 m/s run yields correct distance and average pace', () => {
  const engine = new PaceEngine();
  const samples = straightRun(3, 120); // 121 fixes, 120 steps of 3m
  for (const s of samples) engine.addSample(s);

  // 120 accepted steps of ~3m
  assert.ok(
    Math.abs(engine.totalDistance - 360) < 1,
    `distance ${engine.totalDistance}`,
  );
  const avg = engine.averagePace(120)!;
  const expected = (MILE_IN_METERS / 3); // sec per mile at 3 m/s ≈ 536.4
  assert.ok(Math.abs(avg - expected) < 2, `avg pace ${avg} vs ${expected}`);
});

test('trailing-mile pace unavailable before a full mile is covered', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s); // only 360m
  assert.equal(engine.trailingPaceByDistance(MILE_IN_METERS), null);
});

test('current pace matches recent speed', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s);
  const p = engine.currentPace(60)!;
  assert.ok(Math.abs(p - MILE_IN_METERS / 3) < 3, `current pace ${p}`);
});

test('current pace decays when stopped (window anchored to now)', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 60)) engine.addSample(s); // newest t = 60000
  const moving = engine.currentPace(30, 60000)!;
  const stopped = engine.currentPace(30, 75000); // 15s later, no new fixes
  // A stop must make the recent pace slower (bigger number), never freeze.
  assert.ok(
    stopped === null || stopped > moving,
    `moving ${moving} stopped ${stopped}`,
  );
});

// ---- pace engine: GPS filtering ---------------------------------------------
test('rejects low-accuracy fixes', () => {
  const engine = new PaceEngine();
  engine.addSample({ t: 0, lat: 0, lng: 0, accuracy: 5 });
  const accepted = engine.addSample({
    t: 1000,
    lat: 0,
    lng: metersToLng(3),
    accuracy: 80, // worse than MAX_ACCURACY_M
  });
  assert.equal(accepted, false);
  assert.equal(engine.totalDistance, 0);
});

test('rejects teleport jumps (impossible speed)', () => {
  const engine = new PaceEngine();
  engine.addSample({ t: 0, lat: 0, lng: 0, accuracy: 5 });
  const accepted = engine.addSample({
    t: 1000,
    lat: 0,
    lng: metersToLng(1000), // 1000 m in 1 s
    accuracy: 5,
  });
  assert.equal(accepted, false);
  assert.equal(engine.totalDistance, 0);
});

test('rejects sub-meter stationary jitter', () => {
  const engine = new PaceEngine();
  engine.addSample({ t: 0, lat: 0, lng: 0, accuracy: 5 });
  const accepted = engine.addSample({
    t: 1000,
    lat: 0,
    lng: metersToLng(0.3),
    accuracy: 5,
  });
  assert.equal(accepted, false);
  assert.equal(engine.totalDistance, 0);
});

// ---- pace engine: coaching decision (based on CURRENT pace, not average) -----
const WINDOW = 60;

test('evaluate: on pace when current matches target', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s);
  const check = engine.evaluate(MILE_IN_METERS / 3, WINDOW); // exactly at pace
  assert.equal(check.status, 'on_track');
  assert.ok(check.spokenText.includes('On pace'), check.spokenText);
});

test('evaluate: speed up when target is faster than current', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s); // ~8:56/mi
  const check = engine.evaluate(MILE_IN_METERS / 4, WINDOW); // target 4 m/s
  assert.equal(check.status, 'speed_up');
  assert.ok(check.adjustPct > 0, `adjustPct ${check.adjustPct}`);
  assert.ok(check.spokenText.includes('Speed up'), check.spokenText);
});

test('evaluate: reports the adjustment as a percentage', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s); // ~536 s/mi
  // target ~40 s/mi faster than current -> a modest single-digit-ish percent
  const check = engine.evaluate(MILE_IN_METERS / 3 - 40, WINDOW);
  assert.equal(check.status, 'speed_up');
  assert.match(check.spokenText, /Speed up, about \d+ percent/);
});

test('evaluate: ease up when ahead of target', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s);
  const check = engine.evaluate(MILE_IN_METERS / 2.5, WINDOW); // slower target
  assert.equal(check.status, 'ease_up');
  assert.ok(check.adjustPct < 0, `adjustPct ${check.adjustPct}`);
});

test('evaluate: within deadband counts as on pace', () => {
  const engine = new PaceEngine();
  for (const s of straightRun(3, 120)) engine.addSample(s); // ~536 s/mi
  const check = engine.evaluate(MILE_IN_METERS / 3 + 5, WINDOW); // 5 s/mi off
  assert.equal(check.status, 'on_track');
});

test('evaluate: no signal with too few points', () => {
  const engine = new PaceEngine();
  engine.addSample({ t: 0, lat: 0, lng: 0, accuracy: 5 });
  const check = engine.evaluate(540, WINDOW);
  assert.equal(check.status, 'no_signal');
});
