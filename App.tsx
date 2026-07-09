import { useEffect, useState } from 'react';
import { Linking, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { useRunTracker, type RunStats } from './src/hooks/useRunTracker';
import { SetupScreen } from './src/screens/SetupScreen';
import { RunScreen } from './src/screens/RunScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

type Screen = 'setup' | 'run' | 'summary' | 'history';

export default function App() {
  const { state, error, stats, start, stop } = useRunTracker();
  const [screen, setScreen] = useState<Screen>('setup');
  const [target, setTarget] = useState(540); // 9:00 /mi default
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);

  const handleStart = (targetSecPerMile: number) => {
    setTarget(targetSecPerMile);
    start(targetSecPerMile);
    setScreen('run');
  };

  const handleStop = async () => {
    const final = await stop();
    setFinalStats(final);
    setScreen('summary');
  };

  // Deep links: ronforestron://run?pace=<sec/mi> and ronforestron://stop.
  // Handy for Siri Shortcuts later; also lets the run flow be driven headlessly.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const body = url.split('://')[1] ?? '';
      const [rawAction, query = ''] = body.split('?');
      const action = rawAction.replace(/\/+$/, '');
      if (action === 'run') {
        const m = query.match(/pace=(\d+)/);
        handleStart(m ? parseInt(m[1], 10) : 540);
      } else if (action === 'stop') {
        void handleStop();
      } else if (action === 'history') {
        setScreen('history');
      } else if (action === 'setup') {
        setScreen('setup');
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {screen === 'setup' && (
        <SetupScreen onStart={handleStart} onHistory={() => setScreen('history')} />
      )}
      {screen === 'run' && (
        <RunScreen
          state={state}
          stats={stats}
          error={error}
          targetSecPerMile={target}
          onStop={handleStop}
        />
      )}
      {screen === 'summary' && finalStats && (
        <SummaryScreen stats={finalStats} onDone={() => setScreen('setup')} />
      )}
      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('setup')} />
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
