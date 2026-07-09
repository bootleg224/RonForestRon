# Ron Forest Ron — build plan

A personal running app: set a target pace, hit GO, get GPS pace tracking with
spoken pace-check prompts every 30s that play *over* Spotify (ducking, not
pausing). No backend — everything runs on-device.

## Stack

- **Expo SDK 57** + React Native 0.86 + React 19 (TypeScript)
- `expo-location` + `expo-task-manager` — GPS (foreground now, background wired)
- `expo-speech` — native, offline text-to-speech
- `expo-audio` — audio session set to `duckOthers` so prompts talk over Spotify
- `expo-sqlite` — installed, for run history (not wired yet)
- `expo-dev-client` — required; this app **cannot run in Expo Go**

## Project layout

```
App.tsx                     screen router: setup -> run -> summary
src/theme.ts                colors + MILE_IN_METERS
src/lib/format.ts           clock / pace / distance formatting
src/lib/geo.ts              haversine distance
src/lib/paceEngine.ts       GPS filtering + avg/trailing pace + pace-check logic
src/lib/audio.ts            audio-session ducking + speak()
src/lib/location.ts         permissions, foreground watch, background task
src/hooks/useRunTracker.ts  ties timer + GPS + pace engine + spoken prompts
src/components/StatTile.tsx reusable stat display
src/screens/*               SetupScreen, RunScreen, SummaryScreen
```

## Milestones

- [x] **1. Toolchain** — scaffold + deps + config. Verified: full native build
      runs on the iOS Simulator (`npx expo run:ios`).
- [x] **2. Foreground tracker** — GO -> timer, GPS distance, avg + last-mile
      pace. Verified on the Simulator with simulated GPS movement: at a true
      8:56/mi (3 m/s) feed, the app read 8:54–8:56 avg and converged correctly.
- [~] **3. TTS + Spotify ducking** — implemented in `audio.ts`. The pace-check
      *text* pipeline is verified on the Simulator (the spoken string drives the
      on-screen banner, e.g. "Speed up about 10 percent"). The **ducking over
      Spotify itself is NOT simulator-testable — verify on a real device with
      Spotify playing.** Highest remaining risk.
- [~] **4. Backgrounding** — `startBackgroundUpdates` is wired and is the active
      GPS source when "Always" permission is granted (exercised on the
      Simulator). **True screen-off / pocket behavior needs a real-device check.**
- [x] **5. History** — runs persist to SQLite on STOP; History screen lists them.
      Verified: DB row written (queried directly) and the screen renders it.

### Verified on the Mac
- `npm test` — 15/15 pure-logic tests (pace engine, GPS filtering, formatting).
- `npm run typecheck` — clean.
- Bug found + fixed during simulator testing: the run-screen timer rendered
  blank (a `flex: 1` StatTile layout issue); replaced with a dedicated timer
  card.

### Deep links (also handy for Siri Shortcuts later)
`ronforestron://run?pace=<sec/mi>`, `://stop`, `://history`, `://setup`.

### Known minor follow-ups
- Swap `SafeAreaView` (deprecated) for `react-native-safe-area-context` (native
  module — needs a rebuild).
- Pace-check tuning knobs + splits (see paceEngine.ts) once tested outdoors.

## How to build & run (dev build — NOT Expo Go)

```bash
# one-time
npm i -g eas-cli && eas login

# Android (fast loop): build an APK, install on your phone
eas build --profile development --platform android

# iOS: needs an Apple Developer account for TestFlight (recommended),
# or free signing for a 7-day install
eas build --profile development --platform ios

# then start the dev server and open the dev build
npx expo start --dev-client
```

## Things to tune once you're running outdoors (in paceEngine.ts)

- `MAX_ACCURACY_M` (25m) — raise if fixes get rejected in tree cover.
- `PACE_CHECK_WINDOW_SEC` (60s) — shorter = twitchier advice, longer = smoother.
- deadband in `paceCheck` (4%) — how close counts as "on track".
- pace-check interval (30s) — in `useRunTracker.ts`.
