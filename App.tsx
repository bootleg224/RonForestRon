import { useCallback, useEffect, useState } from 'react';
import { Linking, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, MILE_IN_METERS } from './src/theme';
import {
  useRunTracker,
  type RunStats,
  type RunMode,
  type RunPlan,
  OPEN_PLAN,
} from './src/hooks/useRunTracker';
import {
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from './src/lib/db';
import { SetupScreen } from './src/screens/SetupScreen';
import { RunScreen } from './src/screens/RunScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'setup' | 'run' | 'summary' | 'history' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);

  const handleComplete = useCallback((final: RunStats) => {
    setFinalStats(final);
    setScreen('summary');
  }, []);

  const { state, error, stats, start, stop, togglePause } = useRunTracker(handleComplete);

  const [pace, setPace] = useState(540); // 9:00 /mi default
  const [mode, setMode] = useState<RunMode>('open');
  const [goalTimeSec, setGoalTimeSec] = useState(1800); // 30:00
  const [goalDistanceMi, setGoalDistanceMi] = useState(3.1); // 5K-ish
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [runPlan, setRunPlan] = useState<RunPlan>(OPEN_PLAN);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    saveSettings(patch).catch(() => {});
  };

  const beginRun = (targetPace: number, planOverride?: RunPlan) => {
    const plan: RunPlan = planOverride ?? {
      mode,
      goalSeconds: goalTimeSec,
      goalMeters: goalDistanceMi * MILE_IN_METERS,
    };
    setPace(targetPace);
    setRunPlan(plan);
    start(targetPace, settings, plan);
    setScreen('run');
  };

  const handleStop = async () => {
    const final = await stop();
    if (final) {
      setFinalStats(final);
      setScreen('summary');
    }
  };

  // Deep links: ronforestron://run?pace=<sec/mi>, ://stop, ://history,
  // ://settings, ://setup. Handy for testing and Siri Shortcuts later.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const body = url.split('://')[1] ?? '';
      const [rawAction, query = ''] = body.split('?');
      const action = rawAction.replace(/\/+$/, '');
      if (action === 'run') {
        const paceM = query.match(/pace=(\d+)/);
        const p = paceM ? parseInt(paceM[1], 10) : pace;
        const modeM = query.match(/mode=(open|time|distance)/);
        if (modeM) {
          const secsM = query.match(/secs=(\d+)/);
          const milesM = query.match(/miles=([\d.]+)/);
          beginRun(p, {
            mode: modeM[1] as RunMode,
            goalSeconds: secsM ? parseInt(secsM[1], 10) : goalTimeSec,
            goalMeters: milesM ? parseFloat(milesM[1]) * MILE_IN_METERS : goalDistanceMi * MILE_IN_METERS,
          });
        } else {
          beginRun(p);
        }
      } else if (action === 'stop') {
        void handleStop();
      } else if (action === 'history') {
        setScreen('history');
      } else if (action === 'settings') {
        setScreen('settings');
      } else if (action === 'setup') {
        setScreen('setup');
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, pace, mode, goalTimeSec, goalDistanceMi]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {screen === 'setup' && (
        <SetupScreen
          pace={pace}
          onPace={setPace}
          mode={mode}
          onMode={setMode}
          goalTimeSec={goalTimeSec}
          onGoalTime={setGoalTimeSec}
          goalDistanceMi={goalDistanceMi}
          onGoalDistance={setGoalDistanceMi}
          onStart={() => beginRun(pace)}
          onHistory={() => setScreen('history')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'run' && (
        <RunScreen
          state={state}
          stats={stats}
          error={error}
          targetSecPerMile={pace}
          plan={runPlan}
          onStop={handleStop}
          onTogglePause={togglePause}
        />
      )}
      {screen === 'summary' && finalStats && (
        <SummaryScreen stats={finalStats} onDone={() => setScreen('setup')} />
      )}
      {screen === 'history' && <HistoryScreen onBack={() => setScreen('setup')} />}
      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen('setup')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
