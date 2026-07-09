import { useCallback, useEffect, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { PaceEngine, type PaceCheck, type GpsSample } from '../lib/paceEngine';
import { MILE_IN_METERS } from '../theme';
import { configureAudioForPrompts, speak, stopSpeaking } from '../lib/audio';
import {
  requestLocationPermissions,
  watchForeground,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../lib/location';
import { saveRun, type Settings, DEFAULT_SETTINGS } from '../lib/db';

const TICK_MS = 1000;
const CURRENT_REFRESH_MS = 10000; // refresh the "current pace" estimate every 10s
const KEEP_AWAKE_TAG = 'ron-forest-ron-run';

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
  elapsedSec: number;
  distanceMeters: number;
  avgPace: number | null; // sec/mile, whole run
  currentPace: number | null; // sec/mile over the coaching window (the hero)
  lastMilePace: number | null; // sec/mile over the most recent mile
  check: PaceCheck | null; // live coaching evaluation (drives hero color)
  gpsFixes: number;
};

const EMPTY_STATS: RunStats = {
  elapsedSec: 0,
  distanceMeters: 0,
  avgPace: null,
  currentPace: null,
  lastMilePace: null,
  check: null,
  gpsFixes: 0,
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
  const usedBackgroundRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the latest completion callback without re-creating start().
  const onAutoCompleteRef = useRef(onAutoComplete);
  onAutoCompleteRef.current = onAutoComplete;

  const elapsed = useCallback(
    () => (Date.now() - startedAtRef.current) / 1000,
    [],
  );

  const teardown = useCallback(async () => {
    for (const r of [tickRef, currentRef, checkRef]) {
      if (r.current) clearInterval(r.current);
      r.current = null;
    }
    unsubRef.current?.();
    unsubRef.current = null;
    if (usedBackgroundRef.current) {
      await stopBackgroundUpdates().catch(() => {});
      usedBackgroundRef.current = false;
    }
    stopSpeaking();
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  // Shared finish path for both the manual STOP and mode auto-stop.
  const finalize = useCallback(async (): Promise<RunStats | null> => {
    if (finishingRef.current) return null;
    finishingRef.current = true;
    await teardown();

    const engine = engineRef.current;
    const elapsedSec = elapsed();
    const final: RunStats = {
      elapsedSec,
      distanceMeters: engine.totalDistance,
      avgPace: engine.averagePace(elapsedSec),
      currentPace: null,
      lastMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
      check: null,
      gpsFixes: fixesRef.current,
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
  }, [elapsed, teardown]);

  // Auto-stop when a time/distance goal is met.
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

  // Base metrics on the 1s tick (and on each GPS fix): time, distance, average,
  // last-mile. Current pace is refreshed separately every 10s.
  const recompute = useCallback(() => {
    const engine = engineRef.current;
    const elapsedSec = elapsed();
    const distanceMeters = engine.totalDistance;
    setStats((prev) => ({
      ...prev,
      elapsedSec,
      distanceMeters,
      avgPace: engine.averagePace(elapsedSec),
      lastMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
      gpsFixes: fixesRef.current,
    }));
    maybeAutoStop(elapsedSec, distanceMeters);
  }, [elapsed, maybeAutoStop]);

  // Current-pace estimate + coaching color. Held steady between 10s refreshes.
  const refreshCurrent = useCallback(() => {
    const check = engineRef.current.evaluate(
      targetRef.current,
      settingsRef.current.coachingWindowSec,
    );
    setStats((prev) => ({ ...prev, currentPace: check.currentPace, check }));
  }, []);

  const ingest = useCallback(
    (sample: GpsSample) => {
      if (engineRef.current.addSample(sample)) fixesRef.current += 1;
      recompute();
    },
    [recompute],
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

        tickRef.current = setInterval(recompute, TICK_MS);
        currentRef.current = setInterval(refreshCurrent, CURRENT_REFRESH_MS);
        // Spoken pace checks fire on a fixed timer, independent of GPS fixes.
        checkRef.current = setInterval(() => {
          const check = engineRef.current.evaluate(
            targetRef.current,
            settingsRef.current.coachingWindowSec,
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
    [ingest, recompute, refreshCurrent, teardown],
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
