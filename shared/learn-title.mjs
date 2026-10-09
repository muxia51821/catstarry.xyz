/** @param {{title: string, subtitle?: string}} note */
export function formatLearnTitle(note) {
  return note.subtitle ? `${note.title}：${note.subtitle}` : note.title;
}
