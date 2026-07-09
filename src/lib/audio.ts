import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

/**
 * Configure the shared audio session so our TTS prompts play *over* Spotify
 * (ducking its volume for the prompt) instead of pausing it.
 *
 * `duckOthers` = other apps' audio is temporarily lowered while we speak, then
 * restored. `shouldPlayInBackground` keeps prompts firing with the screen off.
 *
 * NOTE: This is the highest-risk behavior in the app. It must be verified on a
 * real device with Spotify actually playing — simulators don't reproduce the
 * audio-session mixing. See milestone #3 in PLAN.md.
 */
export async function configureAudioForPrompts(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
}

/** Speak a prompt using the phone's native (offline) TTS engine. */
export function speak(text: string): void {
  Speech.speak(text, {
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
  });
}

/** Stop any in-progress speech (e.g. when the run is stopped). */
export function stopSpeaking(): void {
  Speech.stop();
}
