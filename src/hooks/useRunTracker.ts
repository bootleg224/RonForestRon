import { useCallback, useEffect, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { PaceEngine, type PaceCheck, type GpsSample } from '../lib/paceEngine';
import { MILE_IN_METERS } from '../theme';
import {
  configureAudioForPrompts,
  speak,
  stopSpeaking,
} from '../lib/audio';
import {
  requestLocationPermissions,
  watchForeground,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../lib/location';
import { saveRun } from '../lib/db';

const TICK_MS = 1000;
const PACE_CHECK_INTERVAL_SEC = 30;
const KEEP_AWAKE_TAG = 'ron-forest-ron-run';

export type RunState = 'idle' | 'starting' | 'running' | 'error';
export type LocationSource = 'foreground' | 'background' | null;

export type RunStats = {
  elapsedSec: number;
  distanceMeters: number;
  avgPace: number | null; // sec/mile
  trailingMilePace: number | null; // sec/mile over last mile
  lastCheck: PaceCheck | null;
  gpsFixes: number;
};

const EMPTY_STATS: RunStats = {
  elapsedSec: 0,
  distanceMeters: 0,
  avgPace: null,
  trailingMilePace: null,
  lastCheck: null,
  gpsFixes: 0,
};

export function useRunTracker() {
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats>(EMPTY_STATS);
  const [source, setSource] = useState<LocationSource>(null);

  const engineRef = useRef(new PaceEngine());
  const targetRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastCheckAtSecRef = useRef(0);
  const fixesRef = useRef(0);
  const usedBackgroundRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const elapsed = useCallback(
    () => (Date.now() - startedAtRef.current) / 1000,
    [],
  );

  const teardown = useCallback(async () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    unsubRef.current?.();
    unsubRef.current = null;
    if (usedBackgroundRef.current) {
      await stopBackgroundUpdates().catch(() => {});
      usedBackgroundRef.current = false;
    }
    stopSpeaking();
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  const recompute = useCallback(() => {
    const engine = engineRef.current;
    const elapsedSec = elapsed();
    setStats((prev) => ({
      ...prev,
      elapsedSec,
      distanceMeters: engine.totalDistance,
      avgPace: engine.averagePace(elapsedSec),
      trailingMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
      gpsFixes: fixesRef.current,
    }));
  }, [elapsed]);

  // Called for every GPS fix (foreground or background). Feeds the engine and
  // fires a pace check when the interval has elapsed — driving checks off GPS
  // fixes (not a timer) keeps them working when JS timers are throttled in the
  // background.
  const ingest = useCallback(
    (sample: GpsSample) => {
      if (engineRef.current.addSample(sample)) fixesRef.current += 1;

      const now = elapsed();
      if (now - lastCheckAtSecRef.current >= PACE_CHECK_INTERVAL_SEC) {
        lastCheckAtSecRef.current = now;
        const check = engineRef.current.paceCheck(targetRef.current);
        speak(check.spokenText);
        setStats((prev) => ({ ...prev, lastCheck: check }));
      }
      recompute();
    },
    [elapsed, recompute],
  );

  const start = useCallback(
    async (targetSecPerMile: number) => {
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
        targetRef.current = targetSecPerMile;
        startedAtRef.current = Date.now();
        lastCheckAtSecRef.current = 0;
        setStats(EMPTY_STATS);

        // Prefer background updates (keeps tracking with the screen off). Fall
        // back to a foreground watch if background isn't granted or fails.
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
        setState('running');
        speak('Run started. Good luck.');
      } catch (e) {
        await teardown();
        setState('error');
        setError(e instanceof Error ? e.message : 'Failed to start run.');
      }
    },
    [ingest, recompute, teardown],
  );

  const stop = useCallback(async (): Promise<RunStats> => {
    await teardown();
    const engine = engineRef.current;
    const elapsedSec = elapsed();
    const final: RunStats = {
      elapsedSec,
      distanceMeters: engine.totalDistance,
      avgPace: engine.averagePace(elapsedSec),
      trailingMilePace: engine.trailingPaceByDistance(MILE_IN_METERS),
      lastCheck: null,
      gpsFixes: fixesRef.current,
    };
    setStats(final);
    setSource(null);
    setState('idle');

    // Persist the run (best-effort — a failed save shouldn't block the UI).
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

  // Safety net: tear down timers/subscription if the component unmounts.
  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return { state, error, stats, source, start, stop };
}
