import { useState } from 'react';
import type { LearnPublicationRecord } from '../../../shared/types';

export interface LearnAdminEntry {
  slug: string;
  title: string;
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

export default function LearnLifecycleAdmin({ initial, mutationEnabled = true }: Props) {
  const [entries, setEntries] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
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
          title: entry.title,
          excerpt: entry.excerpt,
          revised_at: entry.revisedAt ?? null,
        }),
      });
      if (!response.ok) throw new Error('Learn 发布状态更新失败');
      const result = await response.json() as { entry: LearnPublicationRecord };
      setEntries((current) => current.map((candidate) => candidate.slug === entry.slug
        ? { ...candidate, state: result.entry.visibility, everPublished: true }
        : candidate));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Learn 发布状态更新失败');
    } finally {
      setBusy(null);
    }
  };

  return <section className="learn-admin-list" aria-label="Learn Note 管理列表">
    {error && <p className="learn-admin-error" role="alert">{error}</p>}
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
          <h2>{entry.title}</h2>
          <p className="learn-admin-row__context">{entry.trackLabel}{entry.section ? ` · ${entry.section}` : ''}</p>
          <p className="learn-admin-row__excerpt">{entry.excerpt}</p>
        </div>
        <span className="learn-admin-row__state">{stateLabel}</span>
        <div className="learn-admin-row__actions">
          <a className="learn-admin-row__preview" href={`/learn/preview/${encodeURIComponent(entry.slug)}/`}>预览</a>
          {mutationEnabled && !historical && (entry.state === 'public'
            ? <button type="button" disabled={busy === entry.slug} onClick={() => void update(entry, 'hidden')}>Hide</button>
            : <button type="button" disabled={busy === entry.slug} onClick={() => void update(entry, 'public')}>{entry.everPublished ? 'Show' : 'Publish'}</button>)}
        </div>
      </article>;
    })}
    {!mutationEnabled && <p className="learn-admin-read-only">Local Preview 只提供登录、管理列表与阅读预览；正式发布状态请在 Production Admin 管理。</p>}
  </section>;
}
