export const CATEGORY_LABELS = {
  tech: '技术',
  life: '生活',
  opinion: '观点',
} as const;

export type Category = keyof typeof CATEGORY_LABELS;

export function getCategoryLabel(category: Category): string {
  return CATEGORY_LABELS[category];
}
