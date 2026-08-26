import { useMemo, useState } from 'react';
import type { PaginatedResponse, TimelineEntry } from '../../../shared/types';
import { summarizeBatchResults } from '../../lib/batch-results';

interface Props {
  apiBase: string;
  initial: PaginatedResponse<TimelineEntry>;
  initialError?: string;
}

function label(entry: TimelineEntry): string {
  if (entry.kind === 'native_post') return (entry.payload as { type: string }).type === 'clip' ? '剪藏' : '碎碎念';
  return '系统足迹';
}

function summary(entry: TimelineEntry): string {
  if (entry.kind === 'native_post') {
    const payload = entry.payload as { content?: string | null; link_title?: string | null };
    return String(payload.content ?? payload.link_title ?? '无文字');
  }
  try {
    return String((JSON.parse(String((entry.payload as { snapshot_json: string }).snapshot_json)) as { title?: string }).title ?? '公开足迹');
  } catch {
    return '公开足迹';
  }
}

function projectionLabel(entry: TimelineEntry): string {
  if (entry.projection_state === 'source_hidden') return '随来源隐藏';
  if (entry.projection_state === 'own_private' || entry.visibility === 'private') return '仅我可见';
  return '公开';
}

export default function FeedAdmin({ apiBase, initial, initialError = '' }: Props) {
  const [page, setPage] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState(initialError);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibility, setVisibility] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const selectedEntries = useMemo(() => page.items.filter((entry) => selected.has(entry.id)), [page.items, selected]);

  const query = (cursor?: string) => new URLSearchParams({
    limit: '20',
    ...(visibility ? { visibility } : {}),
    ...(type ? { type } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(cursor ? { cursor } : {}),
  }).toString();

  const fetchPage = async (cursor?: string) => {
    const response = await fetch(`${apiBase}/api/feed/admin?${query(cursor)}`, { credentials: 'include' });
    if (!response.ok) throw new Error('无法读取管理列表');
    return response.json() as Promise<PaginatedResponse<TimelineEntry>>;
  };

  const reload = async () => {
    setPage(await fetchPage());
    setSelected(new Set());
  };

  const loadMore = async () => {
    if (!page.cursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const next = await fetchPage(page.cursor);
      setPage((current) => ({
        ...next,
        items: [...current.items, ...next.items.filter((item) => !current.items.some((known) => known.id === item.id))],
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法加载更多记录');
    } finally {
      setLoadingMore(false);
    }
  };

  const update = async (entries: TimelineEntry[], nextVisibility: 'public' | 'private') => {
    setError('');
    try {
      const results = await Promise.allSettled(entries.map(async (entry) => {
        const response = await fetch(`${apiBase}/api/feed/${entry.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: entry.kind, visibility: nextVisibility }),
        });
        if (!response.ok) throw new Error('更新失败');
      }));
      await reload();
      const summary = summarizeBatchResults(results);
      if (summary) setError(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '更新失败');
    }
  };

  const remove = async (entry: TimelineEntry) => {
    if (entry.kind !== 'native_post' || !window.confirm('删除后不可恢复，继续吗？')) return;
    try {
      const response = await fetch(`${apiBase}/api/feed/${entry.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('删除失败');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败');
    }
  };

  const deleteSelected = async () => {
    const native = selectedEntries.filter((entry) => entry.kind === 'native_post');
    if (!native.length || !window.confirm('删除选中的原生内容后不可恢复，继续吗？')) return;
    setError('');
    try {
      const results = await Promise.allSettled(native.map(async (entry) => {
        const response = await fetch(`${apiBase}/api/feed/${entry.id}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) throw new Error('删除失败');
      }));
      await reload();
      const summary = summarizeBatchResults(results);
      if (summary) setError(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '批量删除失败');
    }
  };

  const selectAll = page.items.length > 0 && page.items.every((entry) => selected.has(entry.id));
  const toggleAll = () => setSelected(selectAll ? new Set() : new Set(page.items.map((entry) => entry.id)));

  return <section className="feed-admin" aria-label="Feed 管理">
    <form className="feed-admin-filters" onSubmit={(event) => {
      event.preventDefault();
      if (from && to && from > to) {
        setError('起始日期不能晚于结束日期');
        return;
      }
      void reload().catch((cause) => setError(cause instanceof Error ? cause.message : '筛选失败'));
    }}>
      <label>状态<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="">全部</option><option value="public">公开</option><option value="private">仅我可见</option></select></label>
      <label>类型<select value={type} onChange={(event) => setType(event.target.value)}><option value="">全部</option><option value="note">碎碎念</option><option value="clip">剪藏</option><option value="system_footprint">系统足迹</option><option value="blog">Blog</option><option value="learn">Learn</option><option value="projects">Projects</option></select></label>
      <label>起始日期<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>结束日期<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <button className="feed-button">筛选</button>
    </form>
    <div className="feed-admin-actions">
      <button className="feed-button" type="button" onClick={toggleAll} disabled={!page.items.length}>{selectAll ? '取消全选' : '全选当前页'}</button>
      <button className="feed-button" type="button" onClick={() => void update(selectedEntries, 'private')} disabled={!selectedEntries.length}>隐藏选中项</button>
      <button className="feed-button" type="button" onClick={() => void update(selectedEntries, 'public')} disabled={!selectedEntries.length}>恢复公开</button>
      <button className="feed-button" type="button" onClick={() => void deleteSelected()} disabled={!selectedEntries.some((entry) => entry.kind === 'native_post')}>删除原生内容</button>
    </div>
    {error && <p className="feed-state--error" role="alert">{error}</p>}
    <div className="feed-admin-list">
      {page.items.map((entry) => <article className="feed-admin-row" key={entry.id}>
        <label><input type="checkbox" checked={selected.has(entry.id)} onChange={() => setSelected((current) => {
          const next = new Set(current);
          next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
          return next;
        })} /><span className="feed-eyebrow">{label(entry)} · {projectionLabel(entry)}</span></label>
        <p>{summary(entry).slice(0, 50)}</p>
        <time dateTime={entry.occurred_at}>{new Date(entry.occurred_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</time>
        <div><button type="button" onClick={() => void update([entry], entry.visibility === 'public' ? 'private' : 'public')}>{entry.visibility === 'public' ? '隐藏' : '恢复'}</button>{entry.kind === 'native_post' && <button type="button" onClick={() => void remove(entry)}>删除</button>}</div>
      </article>)}
    </div>
    {page.has_more && <button className="feed-button" type="button" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? '加载中…' : '加载更多'}</button>}
  </section>;
}
