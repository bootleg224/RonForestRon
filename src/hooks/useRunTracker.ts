import { useCallback, useEffect, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { PaceEngine, type PaceCheck, type GpsSample } from '../lib/paceEngine';
import { haversineMeters } from '../lib/geo';
import { MILE_IN_METERS } from '../theme';
import { configureAudioForPrompts, speak, stopSpeaking } from '../lib/audio';
import {
  requestLocationPermissions,
  watchForeground,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../lib/location';
import { saveRun, type Settings, DEFAULT_SETTINGS } from '../lib/db';
import {
  isPedometerAvailable,
  requestPedometerPermission,
  watchSteps,
  type StepSubscription,
} from '../lib/pedometer';

const TICK_MS = 1000; // timer + distance
const CURRENT_REFRESH_MS = 10000; // current pace + coaching color
const AVG_REFRESH_MS = 30000; // average + last-mile pace
const KEEP_AWAKE_TAG = 'ron-forest-ron-run';

// Auto-pause tuning.
const PAUSE_AFTER_MS = 10000; // stopped this long -> pause
const STOPPED_DIST_M = 5; // moved less than this over the window -> "stopped"
const RESUME_DIST_M = 8; // moved this far from the pause spot -> resume

// Distance fusion: trust GPS when it's at least this accurate, else lean on
// step-based distance (helps tracks / tunnels where GPS under-reads).
const GOOD_ACCURACY_M = 15;
const DEFAULT_STRIDE_M = 0.9; // meters/step until calibrated from GPS

export type RunState = 'idle' | 'starting' | 'running' | 'error';
export type LocationSource = 'foreground' | 'background' | null;

export type RunMode = 'open' | 'time' | 'distance';
export type RunPlan = {
  mode: RunMode;
  goalSeconds: number; // used when mode === 'time'
  goalMeters: number; // used when mode === 'distance'
};

export const OPEN_PLAN: RunPlan = { mode: 'open', goalSeconds: 0, goalMeters: 0 };

export type RunStats = {
  elapsedSec: number; // ACTIVE time (excludes auto-paused stretches)
  distanceMeters: number; // fused GPS + pedometer when available
  avgPace: number | null;
  currentPace: number | null;
  lastMilePace: number | null;
  check: PaceCheck | null;
  gpsFixes: number;
  steps: number;
  paused: boolean;
};

const EMPTY_STATS: RunStats = {
  elapsedSec: 0,
  distanceMeters: 0,
  avgPace: null,
  currentPace: null,
  lastMilePace: null,
  check: null,
  gpsFixes: 0,
  steps: 0,
  paused: false,
};

export function useRunTracker(onAutoComplete?: (final: RunStats) => void) {
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats>(EMPTY_STATS);
  const [source, setSource] = useState<LocationSource>(null);

  const engineRef = useRef(new PaceEngine());
  const targetRef = useRef(0);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const planRef = useRef<RunPlan>(OPEN_PLAN);
  const startedAtRef = useRef(0);
  const fixesRef = useRef(0);
  const finishingRef = useRef(false);

  // Active-time bookkeeping (so auto-paused stretches don't count).
  const pausedAccumMsRef = useRef(0);
  const isPausedRef = useRef(false);
  const pauseStartedAtRef = useRef(0);

  // Auto-pause movement tracking.
  const distHistoryRef = useRef<{ t: number; d: number }[]>([]);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const resumeAnchorRef = useRef<{ lat: number; lng: number } | null>(null);

  // Pedometer + GPS distance fusion.
  const pedActiveRef = useRef(false);
  const pedSubRef = useRef<StepSubscription | null>(null);
  const stepsRef = useRef(0);
  const lastStepsRef = useRef(0);
  const strideMRef = useRef(DEFAULT_STRIDE_M);
  const fusedDistRef = useRef(0);
  const lastGpsDistRef = useRef(0);
  const lastAccuracyRef = useRef<number | null>(null);

  const seededRef = useRef(false);
  const usedBackgroundRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onAutoCompleteRef = useRef(onAutoComplete);
  onAutoCompleteRef.current = onAutoComplete;

  // Active elapsed ms — frozen while auto-paused.
  const activeElapsedMs = useCallback(() => {
    const now = Date.now();
    const inPause = isPausedRef.current ? now - pauseStartedAtRef.current : 0;
    return now - startedAtRef.current - pausedAccumMsRef.current - inPause;
  }, []);

  // Best distance estimate: fused (GPS + steps) when the pedometer is active,
  // otherwise plain GPS.
  const distanceNow = useCallback(
    () =>
      pedActiveRef.current ? fusedDistRef.current : engineRef.current.totalDistance,
    [],
  );

  const teardown = useCallback(async () => {
    for (const r of [tickRef, currentRef, avgRef, checkRef]) {
      if (r.current) clearInterval(r.current);
      r.current = null;
    }
    unsubRef.current?.();
    unsubRef.current = null;
    pedSubRef.current?.remove();
    pedSubRef.current = null;
    pedActiveRef.current = false;
    if (usedBackgroundRef.current) {
      await stopBackgroundUpdates().catch(() => {});
      usedBackgroundRef.current = false;
    }
    stopSpeaking();
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  const pause = useCallback(() => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    pauseStartedAtRef.current = Date.now();
    resumeAnchorRef.current = lastPosRef.current;
    setStats((prev) => ({ ...prev, paused: true }));
    speak('Auto-paused.');
  }, []);

  const resume = useCallback(() => {
    if (!isPausedRef.current) return;
    pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
    isPausedRef.current = false;
    resumeAnchorRef.current = null;
    distHistoryRef.current = []; // restart stop-detection after resuming
    setStats((prev) => ({ ...prev, paused: false }));
    speak('Resuming.');
  }, []);

  const finalize = useCallback(async (): Promise<RunStats | null> => {
    if (finishingRef.current) return null;
    finishingRef.current = true;
    await teardown();

    const engine = engineRef.current;
    const elapsedSec = activeElapsedMs() / 1000;
    const dist = distanceNow();
    const final: RunStats = {
      elapsedSec,
      distanceMeters: dist,
      avgPace: dist > 0 && elapsedSec > 0 ? (elapsedSec / dist) * MILE_IN_METERS : null,
      currentPace: null,
      lastMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
      check: null,
      gpsFixes: fixesRef.current,
      steps: stepsRef.current,
      paused: false,
    };
    setStats(final);
    setSource(null);
    setState('idle');

    if (final.distanceMeters > 0 || final.elapsedSec > 5) {
      saveRun({
        startedAt: startedAtRef.current,
        elapsedSec: final.elapsedSec,
        distanceMeters: final.distanceMeters,
        avgPace: final.avgPace,
        targetPace: targetRef.current,
        gpsFixes: final.gpsFixes,
      }).catch(() => {});
    }
    return final;
  }, [activeElapsedMs, distanceNow, teardown]);

  const maybeAutoStop = useCallback(
    (elapsedSec: number, distanceMeters: number) => {
      if (finishingRef.current) return;
      const p = planRef.current;
      const done =
        (p.mode === 'time' && elapsedSec >= p.goalSeconds) ||
        (p.mode === 'distance' && distanceMeters >= p.goalMeters);
      if (!done) return;
      void finalize().then((f) => {
        if (!f) return;
        speak(
          p.mode === 'time'
            ? 'Time reached. Great job, Ron.'
            : 'Distance reached. Great job, Ron.',
        );
        onAutoCompleteRef.current?.(f);
      });
    },
    [finalize],
  );

  // Current pace + coaching color (refreshed every 10s; see start()).
  const refreshCurrent = useCallback(() => {
    if (isPausedRef.current) return;
    const check = engineRef.current.evaluate(
      targetRef.current,
      settingsRef.current.coachingWindowSec,
      activeElapsedMs(),
    );
    setStats((prev) => ({ ...prev, currentPace: check.currentPace, check }));
  }, [activeElapsedMs]);

  // Average + last-mile pace (refreshed every 30s; see start()).
  const refreshAverages = useCallback(() => {
    const engine = engineRef.current;
    const elapsedSec = activeElapsedMs() / 1000;
    const dist = distanceNow();
    setStats((prev) => ({
      ...prev,
      avgPace: dist > 0 && elapsedSec > 0 ? (elapsedSec / dist) * MILE_IN_METERS : null,
      lastMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
    }));
  }, [activeElapsedMs, distanceNow]);

  // Advance the fused distance for this tick (GPS when accurate, else steps).
  const updateFusedDistance = useCallback(() => {
    if (!pedActiveRef.current) return;
    const gps = engineRef.current.totalDistance;
    const gpsDelta = gps - lastGpsDistRef.current;
    const stepDelta = stepsRef.current - lastStepsRef.current;
    const accGood =
      lastAccuracyRef.current != null && lastAccuracyRef.current <= GOOD_ACCURACY_M;

    let delta: number;
    if (accGood) {
      delta = gpsDelta;
      // Calibrate stride length from trustworthy GPS stretches.
      if (stepDelta >= 3 && gpsDelta > 1) {
        const s = gpsDelta / stepDelta;
        if (s > 0.3 && s < 2.2) strideMRef.current = strideMRef.current * 0.8 + s * 0.2;
      }
    } else {
      delta = stepDelta * strideMRef.current; // GPS weak -> trust the pedometer
    }
    fusedDistRef.current += Math.max(0, delta);
    lastGpsDistRef.current = gps;
    lastStepsRef.current = stepsRef.current;
  }, []);

  // The 1s tick: timer + distance + pause/stop bookkeeping only.
  const recompute = useCallback(() => {
    const elapsedSec = activeElapsedMs() / 1000;
    const now = Date.now();
    updateFusedDistance();
    const distanceMeters = distanceNow();

    // Auto-pause: pause once we've barely moved for PAUSE_AFTER_MS.
    if (settingsRef.current.autoPause && !isPausedRef.current) {
      distHistoryRef.current.push({ t: now, d: distanceMeters });
      distHistoryRef.current = distHistoryRef.current.filter(
        (h) => h.t >= now - PAUSE_AFTER_MS - 2000,
      );
      const old = distHistoryRef.current.find((h) => h.t <= now - PAUSE_AFTER_MS);
      if (old && distanceMeters - old.d < STOPPED_DIST_M) pause();
    }

    setStats((prev) => ({
      ...prev,
      elapsedSec,
      distanceMeters,
      gpsFixes: fixesRef.current,
      steps: stepsRef.current,
      paused: isPausedRef.current,
    }));

    // Seed the slower metrics as soon as we're moving, so nothing stays blank
    // until the first 10s/30s tick.
    if (!seededRef.current && distanceMeters > 0) {
      seededRef.current = true;
      refreshCurrent();
      refreshAverages();
    }
    maybeAutoStop(elapsedSec, distanceMeters);
  }, [
    activeElapsedMs,
    distanceNow,
    updateFusedDistance,
    maybeAutoStop,
    pause,
    refreshCurrent,
    refreshAverages,
  ]);

  const ingest = useCallback(
    (sample: GpsSample) => {
      lastPosRef.current = { lat: sample.lat, lng: sample.lng };
      lastAccuracyRef.current = sample.accuracy;

      if (isPausedRef.current) {
        // While paused we keep receiving GPS only to detect that we've moved on.
        const anchor = resumeAnchorRef.current;
        if (anchor && haversineMeters(anchor.lat, anchor.lng, sample.lat, sample.lng) > RESUME_DIST_M) {
          resume();
        }
        return;
      }

      // Feed the engine with ACTIVE-time timestamps so paused gaps never appear
      // in the trailing-pace window.
      const activeT = activeElapsedMs();
      if (
        engineRef.current.addSample({
          t: activeT,
          lat: sample.lat,
          lng: sample.lng,
          accuracy: sample.accuracy,
        })
      ) {
        fixesRef.current += 1;
      }
      recompute();
    },
    [activeElapsedMs, recompute, resume],
  );

  const start = useCallback(
    async (targetSecPerMile: number, settings: Settings, plan: RunPlan) => {
      setError(null);
      setState('starting');
      try {
        const perms = await requestLocationPermissions();
        if (!perms.foreground) {
          setState('error');
          setError('Location permission is required to track your run.');
          return;
        }
        await configureAudioForPrompts();
        await activateKeepAwakeAsync(KEEP_AWAKE_TAG);

        engineRef.current.reset();
        fixesRef.current = 0;
        finishingRef.current = false;
        seededRef.current = false;
        pausedAccumMsRef.current = 0;
        isPausedRef.current = false;
        distHistoryRef.current = [];
        lastPosRef.current = null;
        resumeAnchorRef.current = null;
        stepsRef.current = 0;
        lastStepsRef.current = 0;
        strideMRef.current = DEFAULT_STRIDE_M;
        fusedDistRef.current = 0;
        lastGpsDistRef.current = 0;
        lastAccuracyRef.current = null;
        pedActiveRef.current = false;
        targetRef.current = targetSecPerMile;
        settingsRef.current = settings;
        planRef.current = plan;
        startedAtRef.current = Date.now();
        setStats(EMPTY_STATS);

        let activeSource: LocationSource = null;
        if (perms.background) {
          try {
            await startBackgroundUpdates(ingest);
            usedBackgroundRef.current = true;
            activeSource = 'background';
          } catch {
            usedBackgroundRef.current = false;
          }
        }
        if (!activeSource) {
          unsubRef.current = await watchForeground(ingest);
          activeSource = 'foreground';
        }
        setSource(activeSource);

        // Pedometer is best-effort: if there's no step counter (e.g. simulator),
        // we stay GPS-only. When present it fuses in for weak-GPS accuracy.
        if (await isPedometerAvailable()) {
          await requestPedometerPermission();
          const sub = watchSteps((steps) => {
            stepsRef.current = steps;
          });
          pedSubRef.current = sub;
          pedActiveRef.current = sub != null;
        }

        tickRef.current = setInterval(recompute, TICK_MS);
        currentRef.current = setInterval(refreshCurrent, CURRENT_REFRESH_MS);
        avgRef.current = setInterval(refreshAverages, AVG_REFRESH_MS);
        checkRef.current = setInterval(() => {
          if (isPausedRef.current) return; // stay quiet while paused
          const check = engineRef.current.evaluate(
            targetRef.current,
            settingsRef.current.coachingWindowSec,
            activeElapsedMs(),
          );
          speak(check.spokenText);
        }, settings.promptIntervalSec * 1000);

        setState('running');
        speak('Run started. Good luck.');
      } catch (e) {
        await teardown();
        setState('error');
        setError(e instanceof Error ? e.message : 'Failed to start run.');
      }
    },
    [ingest, recompute, refreshCurrent, refreshAverages, activeElapsedMs, teardown],
  );

  const stop = useCallback(async (): Promise<RunStats | null> => {
    return finalize();
  }, [finalize]);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return { state, error, stats, source, start, stop };
}
