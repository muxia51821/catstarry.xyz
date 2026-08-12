import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { FeedPost, PaginatedResponse, SessionStatus, TimelineEntry } from '../../../shared/types';
import { loadPublicTimeline, normalizeApiBase, previewCandidateUrl } from '../../lib/feed-api';

interface FeedAppProps {
  apiBase: string;
  initial?: PaginatedResponse<TimelineEntry>;
}

const EMPTY_TIMELINE: PaginatedResponse<TimelineEntry> = { items: [], cursor: null, has_more: false };
const mediaUrl = (apiBase: string, key: string) => `${normalizeApiBase(apiBase)}/api/feed/media/${encodeURIComponent(key)}`;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function footprintCopy(entry: TimelineEntry): { label: string; title: string; summary: string | null; link: string | null } {
  const data = entry.payload as unknown as Record<string, unknown>;
  let snapshot: Record<string, unknown> = {};
  try { snapshot = JSON.parse(String(data.snapshot_json ?? '{}')) as Record<string, unknown>; } catch { /* immutable snapshot may be legacy */ }
  const labels: Record<string, string> = {
    blog_published: 'Blog 发布',
    learn_section_completed: 'Learn 历史足迹',
    learn_note_published: 'LEARN · 更新',
    learn_note_revised: 'LEARN · 更新',
    project_updated: 'Projects 实质更新',
  };
  return {
    label: labels[String(data.event_type)] ?? '系统足迹',
    title: String(snapshot.title ?? snapshot.label ?? data.source_ref ?? '公开足迹'),
    summary: typeof snapshot.summary === 'string' ? snapshot.summary : null,
    link: typeof snapshot.link === 'string' ? snapshot.link : null,
  };
}

function EntryCard({ entry, apiBase }: { entry: TimelineEntry; apiBase: string }) {
  if (entry.kind === 'system_footprint') {
    const copy = footprintCopy(entry);
    return <article className="feed-card feed-footprint">
      <p className="feed-eyebrow">{copy.label}</p>
      <h2>{copy.link ? <a href={copy.link}>{copy.title}</a> : copy.title}</h2>
      {copy.summary && <p>{copy.summary}</p>}
      <time dateTime={entry.occurred_at}>{formatDate(entry.occurred_at)}</time>
    </article>;
  }
  const post = entry.payload as FeedPost;
  let media: string[] = [];
  try { media = post.media_json ? JSON.parse(post.media_json) as string[] : []; } catch { media = []; }
  return <article className={`feed-card feed-card--${post.type}`}>
    <p className="feed-eyebrow">{post.type === 'clip' ? '剪藏' : '碎碎念'}</p>
    {post.type === 'clip' && post.link_url && <h2><a href={post.link_url} rel="noreferrer">{post.link_title ?? post.link_url}</a></h2>}
    {post.type === 'clip' && post.link_summary && <p className="feed-clip-summary">{post.link_summary}</p>}
    {post.content && <p className="feed-content">{post.content}</p>}
    {post.link_image && <img className="feed-link-image" src={post.link_image} alt="" loading="lazy" />}
    {media.length > 0 && <div className={`feed-media-grid feed-media-grid--${Math.min(media.length, 6)}`}>
      {media.map((key) => key.endsWith('.mp4') || key.endsWith('.webm') || key.endsWith('.mov')
        ? <video key={key} controls preload="metadata" src={mediaUrl(apiBase, key)} />
        : <a key={key} href={mediaUrl(apiBase, key)} target="_blank" rel="noreferrer"><img src={mediaUrl(apiBase, key)} alt="Feed 附图" loading="lazy" /></a>)}
    </div>}
    <time dateTime={entry.occurred_at}>{formatDate(entry.occurred_at)}</time>
  </article>;
}

export default function FeedApp({ apiBase, initial = EMPTY_TIMELINE }: FeedAppProps) {
  const [timeline, setTimeline] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    async function loadInitial() {
      try {
        const next = await loadPublicTimeline(apiBase);
        if (active) setTimeline(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Feed 时间线暂时不可用');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => { active = false; };
  }, [apiBase]);

  async function loadMore() {
    if (!timeline.cursor || loading) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/feed?limit=20&cursor=${encodeURIComponent(timeline.cursor)}`, { credentials: 'include' });
      if (!response.ok) throw new Error('无法加载更早的足迹');
      const next = await response.json() as PaginatedResponse<TimelineEntry>;
      setTimeline((current) => ({ ...next, items: [...current.items, ...next.items.filter((item) => !current.items.some((known) => known.id === item.id))] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : '加载失败'); }
    finally { setLoading(false); }
  }

  const entries = useMemo(() => timeline.items, [timeline.items]);
  return <>
    <section className="feed-timeline" aria-live="polite">
      {entries.map((entry) => <EntryCard key={`${entry.kind}:${entry.id}`} entry={entry} apiBase={apiBase} />)}
      {!entries.length && !error && !loading && <p className="feed-state">还没有公开足迹。</p>}
      {error && <p className="feed-state feed-state--error" role="alert">{error}</p>}
      {timeline.has_more && <button className="feed-button" type="button" onClick={loadMore} disabled={loading}>{loading ? '加载中…' : '加载更多'}</button>}
    </section>
    <FeedAuthAndPublish
      apiBase={apiBase}
      session={session}
      setSession={setSession}
      showLogin={showLogin}
      setShowLogin={setShowLogin}
      showPublish={showPublish}
      setShowPublish={setShowPublish}
      onCreated={(entry) => setTimeline((current) => ({ ...current, items: [entry, ...current.items] }))}
    />
  </>;
}

function FeedAuthAndPublish(props: {
  apiBase: string; session: SessionStatus | null; setSession: (session: SessionStatus | null) => void;
  showLogin: boolean; setShowLogin: (show: boolean) => void; showPublish: boolean; setShowPublish: (show: boolean) => void;
  onCreated: (entry: TimelineEntry) => void;
}) {
  const { apiBase, session, setSession, showLogin, setShowLogin, showPublish, setShowPublish, onCreated } = props;
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState('');
  const requestSession = async () => {
    const response = await fetch(`${apiBase}/api/auth/session`, { credentials: 'include' });
    const next = await response.json() as SessionStatus;
    setSession(next); setChecked(true); return next;
  };
  useEffect(() => { void requestSession().catch(() => { setSession({ authenticated: false, username: null }); setChecked(true); }); }, []);
  const loggedIn = !!session?.authenticated;
  return <>
    <div className="feed-fab-wrap">
      {loggedIn ? <>
        <button className="feed-admin-link" type="button" onClick={() => void fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' }).then(() => { setSession({ authenticated: false, username: null }); setShowPublish(false); })}>退出</button>
        <a className="feed-admin-link" href="/feed/admin">管理</a>
        <button className="feed-fab" type="button" onClick={() => setShowPublish(true)} aria-label="发布 Feed">+</button>
      </> : <button
        className="feed-fab feed-fab--login"
        type="button"
        disabled={!checked}
        data-session-ready={checked ? 'true' : 'false'}
        onClick={() => setShowLogin(true)}
      >登录</button>}
    </div>
    {showLogin && <LoginDialog apiBase={apiBase} onClose={() => setShowLogin(false)} onLoggedIn={(next) => { setSession(next); setShowLogin(false); setShowPublish(true); }} />}
    {showPublish && <PublishDialog apiBase={apiBase} onClose={() => setShowPublish(false)} onCreated={(entry) => { onCreated(entry); setShowPublish(false); setMessage('已发布'); }} />}
    {message && <p className="feed-toast" role="status">{message}</p>}
  </>;
}

function useModalDialog(onClose: () => void) {
  const panelRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const dialog = panel?.closest<HTMLElement>('.feed-dialog');
    const background = dialog?.parentElement
      ? Array.from(dialog.parentElement.children).filter((element): element is HTMLElement => (
        element instanceof HTMLElement && element !== dialog
      ))
      : [];
    const backgroundState = background.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden'),
    }));
    for (const element of background) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    const focusables = () => Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'
      ) ?? []
    );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const state of backgroundState) {
        state.element.inert = state.inert;
        if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
        else state.element.setAttribute('aria-hidden', state.ariaHidden);
      }
      previous?.focus();
    };
  }, [onClose]);

  return panelRef;
}

function LoginDialog({ apiBase, onClose, onLoggedIn }: { apiBase: string; onClose: () => void; onLoggedIn: (session: SessionStatus) => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const panelRef = useModalDialog(onClose);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!response.ok) throw new Error((await response.json() as { error?: { message?: string } }).error?.message ?? '登录失败');
      onLoggedIn({ authenticated: true, username });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '登录失败'); } finally { setBusy(false); }
  }
  return <div className="feed-dialog" role="dialog" aria-modal="true" aria-label="登录"><form ref={panelRef} className="feed-panel" onSubmit={login}><button type="button" className="feed-close" onClick={onClose} aria-label="关闭">×</button><h2>登录后发布</h2><label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="feed-state--error" role="alert">{error}</p>}<button className="feed-button" disabled={busy}>{busy ? '验证中…' : '登录'}</button></form></div>;
}

function PublishDialog({ apiBase, onClose, onCreated }: { apiBase: string; onClose: () => void; onCreated: (entry: TimelineEntry) => void }) {
  const [type, setType] = useState<'note' | 'clip'>('note'); const [content, setContent] = useState(''); const [linkUrl, setLinkUrl] = useState(''); const [title, setTitle] = useState(''); const [summary, setSummary] = useState(''); const [image, setImage] = useState(''); const [keys, setKeys] = useState<string[]>([]); const [uploading, setUploading] = useState(false); const [submitting, setSubmitting] = useState(false); const [uploadProgress, setUploadProgress] = useState(0); const [message, setMessage] = useState(''); const idempotency = useRef<string | null>(null); const publishing = useRef(false);
  const panelRef = useModalDialog(onClose);
  const noteIsValid = Boolean(content.trim() || keys.length);
  const clipIsValid = Boolean(linkUrl.trim() && title.trim());
  const publishIsValid = type === 'note' ? noteIsValid : clipIsValid;
  const canPublish = publishIsValid && !uploading && !submitting;
  const publishReason = !publishIsValid ? (type === 'note' ? '请输入文字，或上传图片或视频。' : '请填写链接和标题。') : uploading ? '上传完成后才能发布。' : submitting ? '正在发布，请稍候。' : '';
  async function preview() { const candidate = previewCandidateUrl(linkUrl); if (!candidate) return; setMessage(''); const response = await fetch(`${normalizeApiBase(apiBase)}/api/feed/clip-preview`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: candidate }) }); if (!response.ok) { setMessage('无法获取链接信息，请手动填写。'); return; } const data = await response.json() as { link_title: string | null; link_summary: string | null; link_image: string | null }; setTitle(data.link_title ?? ''); setSummary(data.link_summary ?? ''); setImage(data.link_image ?? ''); }
  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return; const selected = Array.from(files); const imageFiles = selected.filter((file) => file.type.startsWith('image/')); const videoFiles = selected.filter((file) => file.type.startsWith('video/'));
    if ((imageFiles.length && videoFiles.length) || imageFiles.length > 6 || videoFiles.length > 1 || keys.length + selected.length > 6 || (keys.length && ((imageFiles.length && keys.some((key) => /\.(mp4|webm|mov)$/.test(key))) || (videoFiles.length && keys.some((key) => !/\.(mp4|webm|mov)$/.test(key)))))) { setMessage('图片和视频不能混用；最多 6 张图片或 1 个视频。'); return; }
    if (videoFiles[0] && await videoDuration(videoFiles[0]) > 60) { setMessage('视频不得超过 1 分钟。'); return; }
    setUploading(true); setUploadProgress(0); setMessage('上传中 0%');
    try { const next: string[] = []; for (const [index, file] of selected.entries()) { next.push((await uploadFeedFile(apiBase, file, (progress) => { const total = Math.round(((index + progress / 100) / selected.length) * 100); setUploadProgress(total); setMessage(`上传中 ${total}%`); })).key); } setKeys((current) => [...current, ...next]); setUploadProgress(100); setMessage('上传完成'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : '上传失败'); } finally { setUploading(false); }
  }
  async function publish(event: FormEvent) { event.preventDefault(); if (!canPublish || publishing.current) return; publishing.current = true; setSubmitting(true); setMessage(''); idempotency.current ??= crypto.randomUUID(); try { const body = type === 'note' ? { type, content, media_keys: keys } : { type, content, media_keys: keys, link_url: linkUrl, link_title: title, link_summary: summary, link_image: image }; const response = await fetch(`${apiBase}/api/feed`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotency.current }, body: JSON.stringify(body) }); if (!response.ok) { setMessage((await response.json() as { error?: { message?: string } }).error?.message ?? '发布失败'); return; } const post = (await response.json() as { post: FeedPost }).post; onCreated({ id: post.id, kind: 'native_post', occurred_at: post.created_at, visibility: post.visibility, payload: post }); } catch (cause) { setMessage(cause instanceof Error ? cause.message : '发布失败'); } finally { publishing.current = false; setSubmitting(false); } }
  return <div className="feed-dialog" role="dialog" aria-modal="true" aria-label="发布 Feed"><form ref={panelRef} className="feed-panel feed-publish-panel" onSubmit={publish}><button type="button" className="feed-close" onClick={onClose} aria-label="关闭">×</button><div className="feed-tabs"><button type="button" aria-pressed={type === 'note'} onClick={() => setType('note')}>碎碎念</button><button type="button" aria-pressed={type === 'clip'} onClick={() => setType('clip')}>剪藏</button></div>{type === 'clip' && <><label>链接<input type="url" value={linkUrl} onBlur={() => void preview()} onChange={(event) => setLinkUrl(event.target.value)} required /></label><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>摘要<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label>封面图 URL（可选）<input type="url" value={image} onChange={(event) => setImage(event.target.value)} /></label></>}<label>{type === 'clip' ? '点评（可选）' : '文字'}<textarea value={content} onChange={(event) => setContent(event.target.value)} required={!keys.length && type === 'note'} /></label><label>图片或视频<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime" multiple disabled={uploading} onChange={(event) => void chooseFiles(event.target.files)} /></label>{uploading && <progress value={uploadProgress} max="100" aria-label="上传进度">{uploadProgress}%</progress>}{keys.length > 0 && <p>已上传 {keys.length} 个文件 <button type="button" onClick={() => setKeys([])}>清空</button></p>}{publishReason && <p className="feed-state" role="status">{publishReason}</p>}{message && <p className={message.includes('失败') ? 'feed-state--error' : ''} role="status">{message}</p>}<button className="feed-button" type="submit" disabled={!canPublish} aria-disabled={!canPublish}>{submitting ? '正在发布…' : uploading ? '正在上传…' : '发布'}</button></form></div>;
}

function uploadFeedFile(apiBase: string, file: File, onProgress: (progress: number) => void): Promise<{ key: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${apiBase}/api/feed/upload`);
    request.withCredentials = true;
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onerror = () => reject(new Error('文件上传失败'));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) { reject(new Error('文件上传失败')); return; }
      try { resolve(JSON.parse(request.responseText) as { key: string }); } catch { reject(new Error('上传响应无效')); }
    };
    const form = new FormData();
    form.set('file', file);
    request.send(form);
  });
}

async function videoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try { return await new Promise((resolve, reject) => { const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => reject(new Error('无法读取视频时长')); video.src = url; }); } finally { URL.revokeObjectURL(url); }
}
