import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { GpsSample } from './paceEngine';

export const BACKGROUND_LOCATION_TASK = 'ron-forest-ron-background-location';

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000, // ask for a fix ~1x/sec
  distanceInterval: 2, // ...or every 2 meters, whichever comes first
};

export type PermissionResult = {
  foreground: boolean;
  background: boolean;
};

/**
 * Ask for location permission. Foreground is required to track at all;
 * background ("Always") is needed for milestone #4 (screen off / pocket).
 */
export async function requestLocationPermissions(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  let background = false;
  if (fg.granted) {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      background = bg.granted;
    } catch {
      background = false; // not fatal for foreground tracking
    }
  }
  return { foreground: fg.granted, background };
}

function toSample(loc: Location.LocationObject): GpsSample {
  return {
    t: loc.timestamp,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
  };
}

/**
 * Stream foreground GPS fixes to `onSample`. Returns an unsubscribe function.
 * Works while the app is foregrounded; combine with the background task below
 * to keep tracking with the screen off.
 */
export async function watchForeground(
  onSample: (s: GpsSample) => void,
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(WATCH_OPTIONS, (loc) => {
    onSample(toSample(loc));
  });
  return () => sub.remove();
}

// ---- Background tracking (wired but not started until milestone #4) ---------
// The task must be defined at module top-level so the OS can invoke it after a
// cold relaunch. A subscriber is attached at runtime by startBackgroundUpdates.
type BackgroundSink = (s: GpsSample) => void;
let backgroundSink: BackgroundSink | null = null;

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!backgroundSink) return;
  for (const loc of locations) backgroundSink(toSample(loc));
});

export async function startBackgroundUpdates(sink: BackgroundSink): Promise<void> {
  backgroundSink = sink;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 2,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Ron Forest Ron',
      notificationBody: 'Tracking your run',
    },
  });
}

export async function stopBackgroundUpdates(): Promise<void> {
  backgroundSink = null;
  const started = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  ).catch(() => false);
  if (started) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
