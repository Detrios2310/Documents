import type { CropFormat, DocCategory } from './types';

export const CATEGORIES: { key: DocCategory; label: string; icon: string }[] = [
  { key: 'identity', label: 'Личные', icon: '🪪' },
  { key: 'transport', label: 'Авто и права', icon: '🚗' },
  { key: 'medical', label: 'Медицина', icon: '🏥' },
  { key: 'finance', label: 'Финансы', icon: '💳' },
  { key: 'education', label: 'Образование', icon: '🎓' },
  { key: 'property', label: 'Недвижимость', icon: '🏠' },
  { key: 'work', label: 'Работа', icon: '💼' },
  { key: 'other', label: 'Другое', icon: '📁' },
];

export const categoryLabel = (key: DocCategory) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? 'Другое';

export const categoryIcon = (key: DocCategory) =>
  CATEGORIES.find((c) => c.key === key)?.icon ?? '📁';

/**
 * Форматы обрезки. Рамка обрезки сразу выставляется в нужные пропорции,
 * поэтому фото получается «по документу» без ручной подгонки.
 */
export const CROP_FORMATS: CropFormat[] = [
  {
    key: 'card',
    label: 'Карта / права',
    hint: '85,6 × 54 мм: права, СТС, СНИЛС, полис, банковская карта',
    crop: true,
    aspect: [856, 540],
  },
  {
    key: 'passport',
    label: 'Паспорт (разворот)',
    hint: '125 × 88 мм: разворот паспорта',
    crop: true,
    aspect: [125, 88],
  },
  {
    key: 'a4p',
    label: 'A4 книжный',
    hint: '210 × 297 мм: справки, договоры, выписки',
    crop: true,
    aspect: [210, 297],
  },
  {
    key: 'a4l',
    label: 'A4 альбомный',
    hint: '297 × 210 мм: дипломы, сертификаты',
    crop: true,
    aspect: [297, 210],
  },
  {
    key: 'free',
    label: 'Свободная рамка',
    hint: 'Любые пропорции, рамку двигаете сами',
    crop: true,
  },
  {
    key: 'none',
    label: 'Без обрезки',
    hint: 'Фото сохраняется как есть, можно выбрать сразу несколько',
    crop: false,
  },
];
