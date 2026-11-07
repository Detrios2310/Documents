import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { DocItem } from './types';

const DOCS_KEY = 'documents:v1';
const LOCK_KEY = 'documents:lock';

export async function loadDocs(): Promise<DocItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DOCS_KEY);
    return raw ? (JSON.parse(raw) as DocItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveDocs(docs: DocItem[]): Promise<void> {
  await AsyncStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export async function loadLockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOCK_KEY)) === '1';
}

export async function saveLockEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCK_KEY, value ? '1' : '0');
}

/** Копирует выбранное/снятое фото в постоянное хранилище приложения. */
export async function persistImage(sourceUri: string, docId: string): Promise<string> {
  const dir = new Directory(Paths.document, 'docs');
  dir.create({ idempotent: true, intermediates: true });
  const name = `${docId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
  const dest = new File(dir, name);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export function deleteImage(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // файла уже нет, ничего страшного
  }
}

export const newId = () =>
  `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
