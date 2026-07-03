export const CATEGORY_LABELS: Record<string, string> = {
  tech: "技术",
  life: "生活",
  opinion: "观点",
};

export type Category = keyof typeof CATEGORY_LABELS;

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
