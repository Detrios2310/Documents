import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoryIcon, categoryLabel } from '../constants';
import { daysUntil, formatRuDate } from '../dates';
import { colors } from '../theme';
import type { DocItem } from '../types';

type Props = {
  doc: DocItem;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ViewScreen({ doc, onBack, onEdit, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const days = daysUntil(doc.expiry);

  const share = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Недоступно', 'На этом устройстве нельзя поделиться файлом.');
        return;
      }
      await Sharing.shareAsync(doc.pages[index], { mimeType: 'image/jpeg', dialogTitle: doc.title });
    } catch (e) {
      Alert.alert('Не удалось поделиться', String(e));
    }
  };

  const confirmDelete = () =>
    Alert.alert('Удалить документ?', `«${doc.title}» и все его фото будут удалены с телефона.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>← Назад</Text>
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={10}>
          <Text style={styles.link}>Изменить</Text>
        </Pressable>
      </View>

      <FlatList
        data={doc.pages}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={{ width, height: 420, padding: 12 }}>
            <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />
      {doc.pages.length > 1 && (
        <Text style={styles.counter}>
          Страница {index + 1} из {doc.pages.length}
        </Text>
      )}

      <View style={styles.info}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.meta}>
          {categoryIcon(doc.category)} {categoryLabel(doc.category)}
        </Text>
        {doc.expiry ? (
          <Text
            style={[
              styles.meta,
              days !== null && days < 0 && { color: colors.danger },
              days !== null && days >= 0 && days <= 30 && { color: colors.warn },
            ]}
          >
            Срок действия: {formatRuDate(doc.expiry)}
            {days !== null && days < 0 ? ' (истёк)' : ''}
          </Text>
        ) : null}
        {doc.note ? <Text style={styles.note}>{doc.note}</Text> : null}
      </View>

      <View style={[styles.actions, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable style={styles.btn} onPress={share}>
          <Text style={styles.btnText}>Поделиться</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnDanger]} onPress={confirmDelete}>
          <Text style={[styles.btnText, { color: colors.danger }]}>Удалить</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: { fontSize: 16, color: colors.primary },
  image: { flex: 1, borderRadius: 10, backgroundColor: colors.card },
  counter: { textAlign: 'center', color: colors.muted, marginBottom: 4 },
  info: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, fontSize: 14, color: colors.muted },
  note: { marginTop: 12, fontSize: 15, color: colors.text, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, padding: 16, marginTop: 'auto' },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnDanger: { backgroundColor: '#FBE4E3' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
