import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

/**
 * TTS voice selection. The OS default is the flat "accessibility" voice; both
 * platforms ship much nicer ones (iOS Enhanced/Premium/Siri, Android neural),
 * but you have to pick them. We score the installed English voices and use the
 * best one, with an optional user override (for a Settings picker).
 */
let autoVoiceId: string | null = null;
let overrideVoiceId: string | null = null;
let voiceInited = false;

// iOS "novelty" voices (Bells, Zarvox, …) — never pick these automatically.
const NOVELTY =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|reed|rocko|sandy|shelley|flo|eddy/i;

function isEnglish(v: Speech.Voice): boolean {
  return (v.language ?? '').toLowerCase().startsWith('en') && !NOVELTY.test(v.name ?? '');
}

/** Higher = nicer. Prefers enhanced/premium/Siri/neural voices, US English. */
function scoreVoice(v: Speech.Voice): number {
  let s = 0;
  const id = (v.identifier ?? '').toLowerCase();
  const name = (v.name ?? '').toLowerCase();
  if (v.quality === Speech.VoiceQuality.Enhanced) s += 100;
  if (id.includes('premium')) s += 70;
  if (id.includes('siri')) s += 60;
  if (id.includes('enhanced')) s += 40;
  if (id.includes('neural') || id.includes('natural') || name.includes('natural')) s += 40;
  if ((v.language ?? '').toLowerCase() === 'en-us') s += 10;
  return s;
}

/** Pick the best installed English voice (runs once). */
export async function initVoice(): Promise<void> {
  if (voiceInited) return;
  voiceInited = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const en = voices.filter(isEnglish).sort((a, b) => scoreVoice(b) - scoreVoice(a));
    autoVoiceId = en[0]?.identifier ?? null;
  } catch {
    autoVoiceId = null; // fall back to the system default voice
  }
}

/** Installed English voices, best-first — for a Settings voice picker. */
export async function getEnglishVoices(): Promise<Speech.Voice[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.filter(isEnglish).sort((a, b) => scoreVoice(b) - scoreVoice(a));
  } catch {
    return [];
  }
}

/** Override the auto-picked voice (pass null to go back to automatic). */
export function setPreferredVoice(identifier: string | null): void {
  overrideVoiceId = identifier;
}

/**
 * Configure the shared audio session so our TTS prompts play *over* Spotify
 * (ducking its volume) instead of pausing it, and pick the nicest voice.
 *
 * NOTE: The ducking-over-Spotify behavior must be verified on a real device.
 */
export async function configureAudioForPrompts(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
  await initVoice();
}

/** Speak a prompt using the nicest available native voice. */
export function speak(text: string): void {
  const voice = overrideVoiceId ?? autoVoiceId ?? undefined;
  Speech.speak(text, {
    voice,
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
  });
}

/** Stop any in-progress speech (e.g. when the run is stopped). */
export function stopSpeaking(): void {
  Speech.stop();
}
