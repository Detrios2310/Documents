import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';

type Rect = { x: number; y: number; w: number; h: number };
type Mode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

type Props = {
  uri: string;
  /** Начальные пропорции рамки [ширина, высота]; дальше рамку можно менять свободно */
  aspect?: [number, number];
  onDone: (uri: string) => void;
  onCancel: () => void;
};

const MIN = 50; // минимальный размер рамки на экране
const PAD = 26; // отступ вокруг фото, чтобы ручки не обрезались
const HIT = 44; // размер зоны касания ручки

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function applyDrag(mode: Mode, s: Rect, dx: number, dy: number, bw: number, bh: number): Rect {
  if (mode === 'move') {
    return {
      x: clamp(s.x + dx, 0, bw - s.w),
      y: clamp(s.y + dy, 0, bh - s.h),
      w: s.w,
      h: s.h,
    };
  }
  let left = s.x;
  let top = s.y;
  let right = s.x + s.w;
  let bottom = s.y + s.h;
  if (mode.includes('l')) left = clamp(s.x + dx, 0, right - MIN);
  if (mode.includes('r')) right = clamp(right + dx, left + MIN, bw);
  if (mode.includes('t')) top = clamp(s.y + dy, 0, bottom - MIN);
  if (mode.includes('b')) bottom = clamp(bottom + dy, top + MIN, bh);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function initialRect(bw: number, bh: number, aspect?: [number, number]): Rect {
  if (!aspect) {
    return { x: bw * 0.05, y: bh * 0.05, w: bw * 0.9, h: bh * 0.9 };
  }
  const ratio = aspect[0] / aspect[1];
  let w = bw * 0.9;
  let h = w / ratio;
  if (h > bh * 0.9) {
    h = bh * 0.9;
    w = h * ratio;
  }
  return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
}

export default function CropScreen({ uri, aspect, onDone, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  // Исходное фото приводим к «правильной» ориентации, чтобы координаты совпали с экраном
  const [img, setImg] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const rectRef = useRef(rect);
  const boxRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = await ImageManipulator.manipulate(uri).renderAsync();
        const res = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
        if (!cancelled) setImg(res);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Не удалось открыть фото', String(e));
          onCancel();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // Кнопка «Назад» закрывает обрезку, а не весь экран
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  const box = useMemo(() => {
    if (!img || !area) return null;
    const scale = Math.min((area.w - PAD * 2) / img.width, (area.h - PAD * 2) / img.height);
    return { scale, w: img.width * scale, h: img.height * scale };
  }, [img, area]);

  // Когда известен размер фото на экране, ставим начальную рамку
  useEffect(() => {
    if (!box) return;
    boxRef.current = { w: box.w, h: box.h };
    const r = initialRect(box.w, box.h, aspect);
    rectRef.current = r;
    setRect(r);
  }, [box?.w, box?.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (r: Rect) => {
    rectRef.current = r;
    setRect(r);
  };

  const done = async () => {
    if (!img || !box) return;
    setBusy(true);
    try {
      const r = rectRef.current;
      const originX = clamp(Math.round(r.x / box.scale), 0, img.width - 1);
      const originY = clamp(Math.round(r.y / box.scale), 0, img.height - 1);
      const width = clamp(Math.round(r.w / box.scale), 1, img.width - originX);
      const height = clamp(Math.round(r.h / box.scale), 1, img.height - originY);
      const ctx = ImageManipulator.manipulate(img.uri);
      ctx.crop({ originX, originY, width, height });
      const ref = await ctx.renderAsync();
      const res = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
      onDone(res.uri);
    } catch (e) {
      setBusy(false);
      Alert.alert('Не удалось обрезать', String(e));
    }
  };

  const resetRect = () => box && update(initialRect(box.w, box.h, aspect));
  const wholePhoto = () => box && update({ x: 0, y: 0, w: box.w, h: box.h });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={styles.link}>Отмена</Text>
        </Pressable>
        <Text style={styles.title}>Обрезка</Text>
        <Pressable onPress={done} hitSlop={10} disabled={busy || !box}>
          <Text style={[styles.link, { fontWeight: '700' }]}>{busy ? '...' : 'Готово'}</Text>
        </Pressable>
      </View>

      <View
        style={styles.area}
        onLayout={(e) =>
          setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {!box || !img ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <View style={{ width: box.w, height: box.h }}>
            <Image source={{ uri: img.uri }} style={{ width: box.w, height: box.h }} />

            {/* Затемнение вокруг рамки */}
            <View pointerEvents="none" style={[styles.dim, { left: 0, top: 0, width: box.w, height: rect.y }]} />
            <View
              pointerEvents="none"
              style={[styles.dim, { left: 0, top: rect.y + rect.h, width: box.w, height: box.h - rect.y - rect.h }]}
            />
            <View pointerEvents="none" style={[styles.dim, { left: 0, top: rect.y, width: rect.x, height: rect.h }]} />
            <View
              pointerEvents="none"
              style={[styles.dim, { left: rect.x + rect.w, top: rect.y, width: box.w - rect.x - rect.w, height: rect.h }]}
            />

            {/* Рамка */}
            <View
              pointerEvents="none"
              style={[styles.frame, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}
            />

            <Handle mode="move" rectRef={rectRef} boxRef={boxRef} onChange={update} rect={rect} />
            {(['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'] as Mode[]).map((m) => (
              <Handle key={m} mode={m} rectRef={rectRef} boxRef={boxRef} onChange={update} rect={rect} />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Text style={styles.hint}>
          Тяните за углы и за стороны рамки, чтобы изменить размер, внутри рамки двигайте её целиком.
        </Text>
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={resetRect}>
            <Text style={styles.btnText}>Сбросить</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={wholePhoto}>
            <Text style={styles.btnText}>Всё фото</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type HandleProps = {
  mode: Mode;
  rect: Rect;
  rectRef: React.MutableRefObject<Rect>;
  boxRef: React.MutableRefObject<{ w: number; h: number }>;
  onChange: (r: Rect) => void;
};

function Handle({ mode, rect, rectRef, boxRef, onChange }: HandleProps) {
  const start = useRef<Rect>(rect);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = rectRef.current;
      },
      onPanResponderMove: (_, g) => {
        const { w, h } = boxRef.current;
        onChangeRef.current(applyDrag(mode, start.current, g.dx, g.dy, w, h));
      },
    }),
  ).current;

  const { x, y, w, h } = rect;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const half = HIT / 2;

  let style: object;
  let dot: object | null = null;
  switch (mode) {
    case 'move':
      style = { left: x + half, top: y + half, width: Math.max(w - HIT, 0), height: Math.max(h - HIT, 0) };
      break;
    case 'tl':
      style = { left: x - half, top: y - half, width: HIT, height: HIT };
      dot = styles.corner;
      break;
    case 'tr':
      style = { left: x + w - half, top: y - half, width: HIT, height: HIT };
      dot = styles.corner;
      break;
    case 'bl':
      style = { left: x - half, top: y + h - half, width: HIT, height: HIT };
      dot = styles.corner;
      break;
    case 'br':
      style = { left: x + w - half, top: y + h - half, width: HIT, height: HIT };
      dot = styles.corner;
      break;
    case 't':
      style = { left: cx - half, top: y - half, width: HIT, height: HIT };
      dot = styles.edgeH;
      break;
    case 'b':
      style = { left: cx - half, top: y + h - half, width: HIT, height: HIT };
      dot = styles.edgeH;
      break;
    case 'l':
      style = { left: x - half, top: cy - half, width: HIT, height: HIT };
      dot = styles.edgeV;
      break;
    default:
      style = { left: x + w - half, top: cy - half, width: HIT, height: HIT };
      dot = styles.edgeV;
  }

  return (
    <View {...responder.panHandlers} style={[styles.handle, style]}>
      {dot && <View style={dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E1220' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  link: { color: '#8FB0FF', fontSize: 16 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
  handle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  corner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  edgeH: { width: 34, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  edgeV: { width: 8, height: 34, borderRadius: 4, backgroundColor: '#fff' },
  footer: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 10 },
  hint: { color: '#B8C0D6', fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
