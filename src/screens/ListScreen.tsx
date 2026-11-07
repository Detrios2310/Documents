import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CATEGORIES, categoryLabel } from '../constants';
import { daysUntil, formatRuDate } from '../dates';
import { colors } from '../theme';
import type { DocCategory, DocItem } from '../types';

type Props = {
  docs: DocItem[];
  lockEnabled: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onToggleLock: () => void;
};

function expiryInfo(expiry: string): { text: string; color: string } | null {
  const days = daysUntil(expiry);
  if (days === null) return null;
  if (days < 0) return { text: `Срок истёк ${formatRuDate(expiry)}`, color: colors.danger };
  if (days <= 30) return { text: `Истекает ${formatRuDate(expiry)} (дней: ${days})`, color: colors.warn };
  return { text: `Действует до ${formatRuDate(expiry)}`, color: colors.muted };
}

export default function ListScreen({ docs, lockEnabled, onOpen, onAdd, onToggleLock }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DocCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter((d) => category === 'all' || d.category === category)
      .filter(
        (d) =>
          !q || d.title.toLowerCase().includes(q) || d.note.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [docs, query, category]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои документы</Text>
        <Pressable onPress={onToggleLock} hitSlop={10} style={styles.lockBtn}>
          <Text style={styles.lockText}>{lockEnabled ? '🔒 Вход по защите' : '🔓 Без защиты'}</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Поиск по названию и заметке"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Все" active={category === 'all'} onPress={() => setCategory('all')} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              active={category === c.key}
              onPress={() => setCategory(c.key)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {docs.length === 0 ? 'Пока нет документов' : 'Ничего не найдено'}
            </Text>
            {docs.length === 0 && (
              <Text style={styles.emptyText}>
                Нажмите «+», сфотографируйте документ или выберите фото из галереи.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const info = expiryInfo(item.expiry);
          return (
            <Pressable style={styles.card} onPress={() => onOpen(item.id)}>
              {item.pages[0] ? (
                <Image source={{ uri: item.pages[0] }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Text style={{ fontSize: 24 }}>📄</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {categoryLabel(item.category)} · страниц: {item.pages.length}
                </Text>
                {info && <Text style={[styles.cardMeta, { color: info.color }]}>{info.text}</Text>}
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={onAdd}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  lockBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.card },
  lockText: { fontSize: 12, color: colors.muted },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  chips: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 8, textAlign: 'center', color: colors.muted, lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 34, marginTop: -2 },
});
