import { useState } from 'react';
import type { BlogLifecycleEntry, BlogLifecycleState } from '../../../shared/types';

interface Props {
  initial: BlogLifecycleEntry[];
  initialError?: string;
}

const lifecycleLabel: Record<BlogLifecycleState, string> = {
  draft: '草稿',
  published: '已发布',
  withdrawn: '已撤下',
};

export default function BlogLifecycleAdmin({ initial, initialError = '' }: Props) {
  const [entries, setEntries] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(initialError);

  const update = async (slug: string, state: 'published' | 'withdrawn') => {
    setBusy(slug);
    setError('');
    try {
      const response = await fetch('/blog/admin/lifecycle', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, state }),
      });
      if (!response.ok) throw new Error('Blog 状态更新失败');
      const result = await response.json() as { entry: BlogLifecycleEntry };
      setEntries((current) => current.map((entry) => entry.slug === slug ? result.entry : entry));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Blog 状态更新失败');
    } finally {
      setBusy(null);
    }
  };

  return <section className="feed-admin" aria-labelledby="blog-lifecycle-title">
    <h2 id="blog-lifecycle-title">Blog 发布状态</h2>
    <p>草稿可发布；已发布文章可撤下；撤下后可恢复。恢复不会改变 Feed 中人工隐藏的足迹。</p>
    {error && <p className="feed-state--error" role="alert">{error}</p>}
    <div className="feed-admin-list">
      {entries.map((entry) => <article className="feed-admin-row" key={entry.slug}>
        <span className="feed-eyebrow">BLOG · {lifecycleLabel[entry.state]}</span>
        <p>{entry.title}</p>
        <div>
          <a className="feed-button feed-admin-preview" href={`/blog/preview/${encodeURIComponent(entry.slug)}/`}>预览</a>
          {entry.state === 'published'
            ? <button type="button" disabled={busy === entry.slug} onClick={() => void update(entry.slug, 'withdrawn')}>Withdraw</button>
            : <button type="button" disabled={busy === entry.slug} onClick={() => void update(entry.slug, 'published')}>{entry.state === 'withdrawn' ? 'Restore' : 'Publish'}</button>}
        </div>
      </article>)}
    </div>
  </section>;
}
