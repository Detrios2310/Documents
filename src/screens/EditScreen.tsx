import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES, CROP_FORMATS } from '../constants';
import CropScreen from './CropScreen';
import { formatRuDate, parseRuDate } from '../dates';
import { deleteImage, newId, persistImage } from '../storage';
import { colors } from '../theme';
import type { CropFormat, DocCategory, DocItem } from '../types';

type Props = {
  /** Документ для редактирования; без него создаётся новый */
  doc?: DocItem;
  onSave: (doc: DocItem) => void;
  onCancel: () => void;
};

type Page = { uri: string; isNew: boolean };

export default function EditScreen({ doc, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<DocCategory>(doc?.category ?? 'identity');
  const [note, setNote] = useState(doc?.note ?? '');
  const [expiryText, setExpiryText] = useState(doc ? formatRuDate(doc.expiry) : '');
  const [pages, setPages] = useState<Page[]>(
    (doc?.pages ?? []).map((uri) => ({ uri, isNew: false })),
  );
  const [format, setFormat] = useState<CropFormat>(CROP_FORMATS[0]);
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [cropJob, setCropJob] = useState<{ uri: string; aspect?: [number, number] } | null>(null);

  const addUris = (uris: string[]) =>
    setPages((prev) => [...prev, ...uris.map((uri) => ({ uri, isNew: true }))]);

  // Фото из камеры/галереи: с обрезкой открываем свой экран с рамкой, которую можно тянуть
  const handlePicked = (uris: string[]) => {
    if (uris.length === 0) return;
    if (format.crop) {
      setCropJob({ uri: uris[0], aspect: format.aspect });
    } else {
      addUris(uris);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках телефона.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!res.canceled) handlePicked(res.assets.map((a) => a.uri));
  };

  const pickFromGallery = async () => {
    // С обрезкой выбирается одно фото за раз; без обрезки можно сразу несколько.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: !format.crop,
      selectionLimit: format.crop ? 1 : 20,
      quality: 0.9,
    });
    if (!res.canceled) handlePicked(res.assets.map((a) => a.uri));
  };

  const removePage = (index: number) =>
    setPages((prev) => prev.filter((_, i) => i !== index));

  const movePage = (index: number, dir: -1 | 1) =>
    setPages((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Укажите название', 'Например: «Паспорт», «Права», «Полис ОМС».');
      return;
    }
    const expiry = parseRuDate(expiryText);
    if (expiry === null) {
      Alert.alert('Неверная дата', 'Введите срок действия в формате ДД.ММ.ГГГГ или оставьте пустым.');
      return;
    }
    if (pages.length === 0) {
      Alert.alert('Нет фото', 'Добавьте хотя бы одну страницу: снимите документ или выберите из галереи.');
      return;
    }

    setSaving(true);
    try {
      const id = doc?.id ?? newId();
      const savedUris: string[] = [];
      for (const page of pages) {
        savedUris.push(page.isNew ? await persistImage(page.uri, id) : page.uri);
      }
      // Удаляем файлы страниц, которые пользователь убрал при редактировании.
      for (const oldUri of doc?.pages ?? []) {
        if (!savedUris.includes(oldUri)) deleteImage(oldUri);
      }
      onSave({
        id,
        title: trimmed,
        category,
        pages: savedUris,
        note: note.trim(),
        expiry,
        createdAt: doc?.createdAt ?? Date.now(),
      });
    } catch (e) {
      setSaving(false);
      Alert.alert('Не удалось сохранить', String(e));
    }
  };

  if (cropJob) {
    return (
      <CropScreen
        uri={cropJob.uri}
        aspect={cropJob.aspect}
        onCancel={() => setCropJob(null)}
        onDone={(uri) => {
          addUris([uri]);
          setCropJob(null);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={styles.headerLink}>Отмена</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{doc ? 'Изменить' : 'Новый документ'}</Text>
        <Pressable onPress={save} hitSlop={10} disabled={saving}>
          <Text style={[styles.headerLink, { fontWeight: '700' }]}>{saving ? '...' : 'Готово'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.label}>Название</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Например, Паспорт"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Категория</Text>
        <View style={styles.wrap}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.chip, category === c.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                {c.icon} {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Формат обрезки фото</Text>
        <View style={styles.wrap}>
          {CROP_FORMATS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFormat(f)}
              style={[styles.chip, format.key === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, format.key === f.key && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{format.hint}</Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { flex: 1 }]} onPress={takePhoto}>
            <Text style={styles.btnText}>📷 Снять</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={pickFromGallery}>
            <Text style={[styles.btnText, { color: colors.primary }]}>🖼 Из галереи</Text>
          </Pressable>
        </View>

        {pages.length > 0 && (
          <>
            <Text style={styles.label}>Страницы ({pages.length})</Text>
            {pages.map((p, i) => (
              <View key={p.uri} style={styles.pageCard}>
                <Image source={{ uri: p.uri }} style={styles.pageImg} resizeMode="contain" />
                <View style={styles.pageActions}>
                  <Text style={styles.pageNum}>Стр. {i + 1}</Text>
                  <View style={styles.row}>
                    <Pressable onPress={() => movePage(i, -1)} style={styles.small}>
                      <Text>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => movePage(i, 1)} style={styles.small}>
                      <Text>↓</Text>
                    </Pressable>
                    <Pressable onPress={() => removePage(i)} style={[styles.small, { backgroundColor: '#FBE4E3' }]}>
                      <Text style={{ color: colors.danger }}>Убрать</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.label}>Срок действия (необязательно)</Text>
        <TextInput
          style={styles.input}
          value={expiryText}
          onChangeText={setExpiryText}
          placeholder="ДД.ММ.ГГГГ"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Заметка</Text>
        <TextInput
          style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Номер, где оригинал, что-то важное"
          placeholderTextColor={colors.muted}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  headerLink: { fontSize: 16, color: colors.primary },
  label: { marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 8, color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnOutline: { backgroundColor: colors.card },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pageCard: { backgroundColor: colors.card, borderRadius: 14, padding: 10, marginBottom: 10 },
  pageImg: { width: '100%', height: 220, borderRadius: 8, backgroundColor: colors.bg },
  pageActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageNum: { marginTop: 14, color: colors.muted },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
});
