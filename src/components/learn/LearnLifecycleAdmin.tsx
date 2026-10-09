import { useState } from 'react';
import type { LearnPublicationRecord } from '../../../shared/types';
import { formatLearnTitle } from '../../../shared/learn-title.mjs';

export interface LearnAdminEntry {
  slug: string;
  title: string;
  subtitle?: string;
  trackLabel: string;
  section?: string;
  excerpt: string;
  revisedAt?: string;
  state: 'hidden' | 'public' | 'superseded' | 'withdrawn';
  everPublished: boolean;
}

interface Props {
  initial: LearnAdminEntry[];
  mutationEnabled?: boolean;
}

async function lifecycleError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: { message?: unknown } };
    if (typeof body.error?.message === 'string') return body.error.message;
  } catch {
    // Keep the local message when the lifecycle service has no JSON error body.
  }
  return fallback;
}

export default function LearnLifecycleAdmin({ initial, mutationEnabled = true }: Props) {
  const [entries, setEntries] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async (entry: LearnAdminEntry, visibility: 'public' | 'hidden') => {
    setBusy(entry.slug);
    setError('');
    try {
      const response = await fetch('/learn/admin/lifecycle', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: entry.slug,
          visibility,
          title: formatLearnTitle(entry),
          excerpt: entry.excerpt,
          revised_at: entry.revisedAt ?? null,
        }),
      });
      if (!response.ok) throw new Error(await lifecycleError(response, 'Learn 发布状态更新失败'));
      const result = await response.json() as { entry: LearnPublicationRecord };
      setEntries((current) => current.map((candidate) => candidate.slug === entry.slug
        ? { ...candidate, state: result.entry.visibility, everPublished: true }
        : candidate));
      setSelectedSlugs((current) => current.filter((slug) => slug !== entry.slug));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Learn 发布状态更新失败');
    } finally {
      setBusy(null);
    }
  };

  const publishSelected = async () => {
    const selected = entries.filter((entry) => selectedSlugs.includes(entry.slug)
      && !entry.everPublished && entry.state === 'hidden');
    if (!selected.length) return;
    setBatchBusy(true);
    setError('');
    try {
      const response = await fetch('/learn/admin/lifecycle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: selected.map((entry) => ({
            slug: entry.slug,
            title: formatLearnTitle(entry),
            excerpt: entry.excerpt,
            revised_at: entry.revisedAt ?? null,
          })),
        }),
      });
      if (!response.ok) throw new Error(await lifecycleError(response, 'Learn 批量首次发布失败'));
      const result = await response.json() as { entries: LearnPublicationRecord[]; created: number };
      const bySlug = new Map(result.entries.map((entry) => [entry.slug, entry]));
      setEntries((current) => current.map((entry) => {
        const publication = bySlug.get(entry.slug);
        return publication
          ? { ...entry, state: publication.visibility, everPublished: true }
          : entry;
      }));
      setSelectedSlugs([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Learn 批量首次发布失败');
    } finally {
      setBatchBusy(false);
    }
  };

  const batchCandidates = entries.filter((entry) => !entry.everPublished && entry.state === 'hidden');

  return <section className="learn-admin-list" aria-label="Learn Note 管理列表">
    {error && <p className="learn-admin-error" role="alert">{error}</p>}
    {mutationEnabled && batchCandidates.length > 0 && <div className="learn-admin-batch">
      <p>勾选未发布的笔记后可一起首次公开。系统会先核验这批笔记与当前公开笔记之间的全部关系；校验失败时不会写入。</p>
      <button type="button" disabled={selectedSlugs.length === 0 || busy !== null || batchBusy} onClick={() => void publishSelected()}>
        批量首次发布（{selectedSlugs.length}）
      </button>
    </div>}
    {entries.map((entry) => {
      const historical = entry.state === 'withdrawn' || entry.state === 'superseded';
      const stateLabel = entry.state === 'public'
        ? 'Public'
        : entry.state === 'hidden'
          ? 'Hidden'
          : entry.state === 'withdrawn'
            ? 'Legacy withdrawn'
            : 'Superseded';
      return <article className="learn-admin-row" data-note-slug={entry.slug} key={entry.slug}>
        <div>
          <h2>{formatLearnTitle(entry)}</h2>
          <p className="learn-admin-row__context">{entry.trackLabel}{entry.section ? ` · ${entry.section}` : ''}</p>
          <p className="learn-admin-row__excerpt">{entry.excerpt}</p>
        </div>
        <span className="learn-admin-row__state">{stateLabel}</span>
        <div className="learn-admin-row__actions">
          <a className="learn-admin-row__preview" href={`/learn/preview/${encodeURIComponent(entry.slug)}/`}>预览</a>
          {mutationEnabled && !entry.everPublished && entry.state === 'hidden' && <label className="learn-admin-row__batch-select">
            <input
              type="checkbox"
              checked={selectedSlugs.includes(entry.slug)}
              disabled={busy !== null || batchBusy}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setSelectedSlugs((current) => checked
                  ? [...new Set([...current, entry.slug])]
                  : current.filter((slug) => slug !== entry.slug));
              }}
            />
            批量首次发布
          </label>}
          {mutationEnabled && !historical && (entry.state === 'public'
            ? <button type="button" disabled={busy === entry.slug || batchBusy} onClick={() => void update(entry, 'hidden')}>Hide</button>
            : <button type="button" disabled={busy === entry.slug || batchBusy} onClick={() => void update(entry, 'public')}>{entry.everPublished ? 'Show' : 'Publish'}</button>)}
        </div>
      </article>;
    })}
    {!mutationEnabled && <p className="learn-admin-read-only">Local Preview 只提供登录、管理列表与阅读预览；正式发布状态请在 Production Admin 管理。</p>}
  </section>;
}
