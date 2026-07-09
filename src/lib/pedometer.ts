import { Pedometer } from 'expo-sensors';

export type StepSubscription = { remove: () => void };

/** Is a hardware step counter available? (false on simulators / devices w/o one.) */
export async function isPedometerAvailable(): Promise<boolean> {
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Request Motion & Fitness (iOS) / Activity Recognition (Android) permission. */
export async function requestPedometerPermission(): Promise<boolean> {
  try {
    const res = await Pedometer.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/**
 * Watch cumulative steps since the watch started. `onSteps` receives the running
 * total. Returns null if watching isn't possible (so callers stay GPS-only).
 */
export function watchSteps(
  onSteps: (steps: number) => void,
): StepSubscription | null {
  try {
    return Pedometer.watchStepCount(({ steps }) => onSteps(steps));
  } catch {
    return null;
  }
}
