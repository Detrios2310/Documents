export type DocCategory =
  | 'identity'
  | 'transport'
  | 'medical'
  | 'finance'
  | 'education'
  | 'property'
  | 'work'
  | 'other';

export type DocItem = {
  id: string;
  title: string;
  category: DocCategory;
  /** Локальные URI страниц (копии внутри приложения) */
  pages: string[];
  note: string;
  /** Срок действия в формате YYYY-MM-DD или пусто */
  expiry: string;
  createdAt: number;
};

export type CropFormat = {
  key: string;
  label: string;
  hint: string;
  /** Нужно ли открывать экран обрезки */
  crop: boolean;
  /** Пропорции рамки [ширина, высота]; без значения рамка свободная */
  aspect?: [number, number];
};
