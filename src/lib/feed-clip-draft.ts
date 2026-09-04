export type ClipFieldName = 'title' | 'summary' | 'image';
export type ClipFieldSource = 'machine' | 'owner';

export type ClipDraft = {
  values: Record<ClipFieldName, string>;
  sources: Record<ClipFieldName, ClipFieldSource>;
};

export type ClipCaptureFields = {
  status: 'article' | 'metadata' | 'failed';
  link_title: string | null;
  link_summary: string | null;
  link_image: string | null;
  metadata_description?: string | null;
};

export function createClipDraft(): ClipDraft {
  return {
    values: { title: '', summary: '', image: '' },
    sources: { title: 'machine', summary: 'machine', image: 'machine' },
  };
}

export function editClipField(draft: ClipDraft, field: ClipFieldName, value: string): ClipDraft {
  return {
    values: { ...draft.values, [field]: value },
    sources: { ...draft.sources, [field]: 'owner' },
  };
}

export function applyClipCapture(draft: ClipDraft, capture: ClipCaptureFields): ClipDraft {
  if (capture.status === 'failed') return draft;
  const incoming: Record<ClipFieldName, string> = {
    title: capture.link_title ?? '',
    summary: capture.link_summary ?? '',
    image: capture.link_image ?? '',
  };
  const values = { ...draft.values };
  for (const field of ['title', 'summary', 'image'] as const) {
    if (draft.sources[field] === 'machine') values[field] = incoming[field];
  }
  return { values, sources: draft.sources };
}
