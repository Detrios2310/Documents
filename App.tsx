import * as LocalAuthentication from 'expo-local-authentication';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import EditScreen from './src/screens/EditScreen';
import ListScreen from './src/screens/ListScreen';
import ViewScreen from './src/screens/ViewScreen';
import {
  deleteImage,
  loadDocs,
  loadLockEnabled,
  saveDocs,
  saveLockEnabled,
} from './src/storage';
import { colors } from './src/theme';
import type { DocItem } from './src/types';

type Screen =
  | { name: 'list' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id?: string };

export default function App() {
  const [ready, setReady] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Откройте доступ к документам',
      cancelLabel: 'Отмена',
    });
    if (res.success) setUnlocked(true);
  }, []);

  // Первоначальная загрузка данных и настроек защиты
  useEffect(() => {
    (async () => {
      const [loadedDocs, lock] = await Promise.all([loadDocs(), loadLockEnabled()]);
      setDocs(loadedDocs);
      setLockEnabled(lock);
      setReady(true);
      if (lock) {
        await unlock();
      } else {
        setUnlocked(true);
      }
    })();
  }, [unlock]);

  // Кнопка «Назад» на Android ведёт по экранам приложения
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'list') return false;
      if (screen.name === 'edit' && screen.id) {
        setScreen({ name: 'view', id: screen.id });
      } else {
        setScreen({ name: 'list' });
      }
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const persist = async (next: DocItem[]) => {
    setDocs(next);
    await saveDocs(next);
  };

  const toggleLock = async () => {
    if (lockEnabled) {
      await saveLockEnabled(false);
      setLockEnabled(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert(
        'Защита экрана не настроена',
        'Сначала включите на телефоне блокировку экрана (PIN, графический ключ или отпечаток), тогда её можно будет использовать для входа в приложение.',
      );
      return;
    }
    await saveLockEnabled(true);
    setLockEnabled(true);
    Alert.alert('Готово', 'Теперь при каждом запуске приложение будет просить подтвердить вход.');
  };

  if (!ready) return <View style={styles.center} />;

  if (lockEnabled && !unlocked) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Text style={styles.lockTitle}>🔒 Документы</Text>
        <Text style={styles.lockText}>Подтвердите, что это вы</Text>
        <Pressable style={styles.lockBtn} onPress={unlock}>
          <Text style={styles.lockBtnText}>Открыть</Text>
        </Pressable>
      </View>
    );
  }

  const current = screen.name !== 'list' && screen.id ? docs.find((d) => d.id === screen.id) : undefined;

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {screen.name === 'list' && (
        <ListScreen
          docs={docs}
          lockEnabled={lockEnabled}
          onOpen={(id) => setScreen({ name: 'view', id })}
          onAdd={() => setScreen({ name: 'edit' })}
          onToggleLock={toggleLock}
        />
      )}

      {screen.name === 'view' && current && (
        <ViewScreen
          doc={current}
          onBack={() => setScreen({ name: 'list' })}
          onEdit={() => setScreen({ name: 'edit', id: current.id })}
          onDelete={async () => {
            current.pages.forEach(deleteImage);
            await persist(docs.filter((d) => d.id !== current.id));
            setScreen({ name: 'list' });
          }}
        />
      )}

      {screen.name === 'edit' && (
        <EditScreen
          key={screen.id ?? 'new'}
          doc={current}
          onCancel={() =>
            setScreen(screen.id ? { name: 'view', id: screen.id } : { name: 'list' })
          }
          onSave={async (saved) => {
            const exists = docs.some((d) => d.id === saved.id);
            await persist(exists ? docs.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...docs]);
            setScreen({ name: 'view', id: saved.id });
          }}
        />
      )}
    </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  lockText: { marginTop: 8, color: colors.muted },
  lockBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  lockBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
