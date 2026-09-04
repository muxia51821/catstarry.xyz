import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { FeedPost, PaginatedResponse, SessionStatus, TimelineEntry } from '../../../shared/types';
import { loadPublicTimeline, normalizeApiBase, previewCandidateUrl } from '../../lib/feed-api';
import { appendDedupedById, parseFootprintSnapshot } from '../../lib/feed-entries';
import { groupTimelineByShanghai } from '../../lib/feed-chronology';
import { applyClipCapture, createClipDraft, editClipField } from '../../lib/feed-clip-draft';

interface FeedAppProps {
  apiBase: string;
  initial?: PaginatedResponse<TimelineEntry>;
}

interface UploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'failed';
  progress: number;
  key?: string;
  error?: string;
}

const EMPTY_TIMELINE: PaginatedResponse<TimelineEntry> = { items: [], cursor: null, has_more: false };
const mediaUrl = (apiBase: string, key: string) => `${normalizeApiBase(apiBase)}/api/feed/media/${encodeURIComponent(key)}`;
const isVideoKey = (key: string) => /\.(?:mp4|webm|mov)$/i.test(key);

function footprintCopy(entry: TimelineEntry): { label: string; title: string; summary: string | null; link: string | null; destination: string } {
  const data = entry.payload as unknown as Record<string, unknown>;
  const snapshot = parseFootprintSnapshot(entry) ?? {};
  const labels: Record<string, string> = {
    blog_published: 'BLOG · 发布',
    learn_section_completed: 'LEARN · 更新',
    learn_note_published: 'LEARN · 更新',
    learn_note_revised: 'LEARN · 更新',
    project_updated: 'PROJECT · 更新',
  };
  const destinations: Record<string, string> = {
    blog_published: '阅读文章 →',
    learn_section_completed: '查看内容 →',
    learn_note_published: '查看内容 →',
    learn_note_revised: '查看内容 →',
    project_updated: '查看项目 →',
  };
  return {
    label: labels[String(data.event_type)] ?? '系统足迹',
    title: String(snapshot.title ?? snapshot.label ?? data.source_ref ?? '公开足迹'),
    summary: typeof snapshot.summary === 'string' ? snapshot.summary : null,
    link: typeof snapshot.link === 'string' ? snapshot.link : null,
    destination: destinations[String(data.event_type)] ?? '查看内容 →',
  };
}

function externalDomain(value: string | null): string | null {
  if (!value) return null;
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return null; }
}

function ActivityEntry({
  entry,
  time,
  apiBase,
  onViewImage,
}: {
  entry: TimelineEntry;
  time: string;
  apiBase: string;
  onViewImage: (url: string) => void;
}) {
  if (entry.kind === 'system_footprint') {
    const copy = footprintCopy(entry);
    return <article className="feed-activity feed-footprint">
      <div className="feed-activity-meta">
        <p className="feed-activity-identity">{copy.label}</p>
        <time className="feed-activity-time" dateTime={entry.occurred_at}>{time}</time>
      </div>
      <div className="feed-activity-content">
        <h2>{copy.title}</h2>
        {copy.summary && <p className="feed-supporting-copy">{copy.summary}</p>}
        {copy.link && <a className="feed-destination" href={copy.link}>{copy.destination}</a>}
      </div>
    </article>;
  }

  const post = entry.payload as FeedPost;
  let media: string[] = [];
  try { media = post.media_json ? JSON.parse(post.media_json) as string[] : []; } catch { media = []; }
  const domain = externalDomain(post.link_url);
  return <article className={`feed-activity feed-activity--${post.type}`}>
    <div className="feed-activity-meta">
      <p className="feed-activity-identity">{post.type === 'clip' ? 'CLIP' : 'NOTE'}</p>
      <time className="feed-activity-time" dateTime={entry.occurred_at}>{time}</time>
    </div>
    <div className="feed-activity-content">
      {post.content && <p className="feed-content">{post.content}</p>}
      {post.type === 'clip' && post.link_url && <div className="feed-external-object">
        {post.link_image && <img className="feed-link-image" src={post.link_image} alt="" loading="lazy" />}
        <h2>{post.link_title ?? post.link_url}</h2>
        {post.link_summary && <p className="feed-supporting-copy">{post.link_summary}</p>}
        {domain && <p className="feed-external-source">{domain}</p>}
        <a className="feed-destination" href={post.link_url} target="_blank" rel="noreferrer">访问来源 ↗</a>
      </div>}
      {media.length > 0 && <div className={`feed-media-grid feed-media-grid--${Math.min(media.length, 6)}`}>
        {media.map((key, index) => isVideoKey(key)
          ? <video key={`${key}:${index}`} controls preload="metadata" src={mediaUrl(apiBase, key)} />
          : <button className="feed-media-button" key={`${key}:${index}`} type="button" onClick={() => onViewImage(mediaUrl(apiBase, key))} aria-label="查看 Feed 附图">
            <img src={mediaUrl(apiBase, key)} alt="Feed 附图" loading="lazy" onLoad={(event) => {
              if (media.length === 1 && event.currentTarget.naturalHeight > event.currentTarget.naturalWidth) {
                event.currentTarget.closest('.feed-media-grid')?.classList.add('feed-media-grid--portrait');
              }
            }} />
          </button>)}
      </div>}
    </div>
  </article>;
}

export default function FeedApp({ apiBase, initial = EMPTY_TIMELINE }: FeedAppProps) {
  const [timeline, setTimeline] = useState(initial);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [paginationError, setPaginationError] = useState('');
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const refreshTimeline = useCallback(async () => {
    setInitialLoading(true);
    setInitialError('');
    try { setTimeline(await loadPublicTimeline(apiBase)); }
    catch (cause) { setInitialError(cause instanceof Error ? cause.message : 'Feed 时间线暂时不可用'); }
    finally { setInitialLoading(false); }
  }, [apiBase]);

  useEffect(() => { void refreshTimeline(); }, [refreshTimeline]);

  async function loadMore() {
    if (!timeline.cursor || paginationLoading) return;
    setPaginationLoading(true);
    setPaginationError('');
    try {
      const next = await loadPublicTimeline(apiBase, timeline.cursor);
      setTimeline((current) => ({
        ...next,
        items: appendDedupedById(current.items, next.items),
      }));
    } catch (cause) {
      setPaginationError(cause instanceof Error ? cause.message : '无法加载更早的内容');
    } finally { setPaginationLoading(false); }
  }

  const chronology = useMemo(() => groupTimelineByShanghai(timeline.items), [timeline.items]);
  return <>
    <section className="feed-timeline" aria-live="polite">
      {initialLoading && !timeline.items.length && <p className="feed-state" role="status">正在读取时间线…</p>}
      {initialError && !timeline.items.length && <div className="feed-state feed-state--error" role="alert">
        <p>{initialError}</p><button className="feed-button" type="button" onClick={() => void refreshTimeline()}>重试</button>
      </div>}
      {!initialLoading && !initialError && !timeline.items.length && <p className="feed-state">还没有公开活动。</p>}
      {chronology.map((year) => <section className="feed-year" key={year.year} aria-labelledby={`feed-year-${year.year}`}>
        <h2 className="feed-year-label" id={`feed-year-${year.year}`}>{year.year}</h2>
        {year.days.map((day) => <section className="feed-day" key={`${year.year}-${day.date}`}>
          <div className="feed-date-heading"><h3>{day.date}</h3><span aria-hidden="true" /></div>
          <div className="feed-day-activities">
            {day.activities.map(({ entry, time }) => <ActivityEntry
              key={`${entry.kind}:${entry.id}`}
              entry={entry}
              time={time}
              apiBase={apiBase}
              onViewImage={setViewerImage}
            />)}
          </div>
        </section>)}
      </section>)}
      {timeline.items.length > 0 && <div className="feed-timeline-end">
        {paginationError && <div className="feed-pagination-error" role="alert"><p>{paginationError}</p><button className="feed-button" type="button" onClick={() => void loadMore()}>重试</button></div>}
        {!paginationError && timeline.has_more && <button className="feed-button" type="button" onClick={() => void loadMore()} disabled={paginationLoading}>{paginationLoading ? '正在加载…' : '更早的内容'}</button>}
        {!timeline.has_more && <p>止步于此。</p>}
      </div>}
    </section>
    <FeedOwnerControls
      apiBase={apiBase}
      session={session}
      setSession={setSession}
      showLogin={showLogin}
      setShowLogin={setShowLogin}
      showPublish={showPublish}
      setShowPublish={setShowPublish}
    />
    {viewerImage && <ImageViewer image={viewerImage} onClose={() => setViewerImage(null)} />}
  </>;
}

function FeedOwnerControls(props: {
  apiBase: string;
  session: SessionStatus | null;
  setSession: (session: SessionStatus | null) => void;
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;
  showPublish: boolean;
  setShowPublish: (show: boolean) => void;
}) {
  const { apiBase, session, setSession, showLogin, setShowLogin, showPublish, setShowPublish } = props;
  const [checked, setChecked] = useState(false);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => setMount(document.getElementById('feed-owner-controls')), []);
  useEffect(() => {
    void fetch(`${apiBase}/api/auth/session`, { credentials: 'include' })
      .then((response) => response.json() as Promise<SessionStatus>)
      .then(setSession)
      .catch(() => setSession({ authenticated: false, username: null }))
      .finally(() => setChecked(true));
  }, [apiBase, setSession]);
  const controls = <div className="feed-owner-actions" data-session-ready={checked ? 'true' : 'false'}>
    {session?.authenticated ? <>
      <a className="feed-owner-action" href="/feed/admin">管理</a>
      <button className="feed-owner-action feed-owner-publish" type="button" onClick={() => setShowPublish(true)}>＋ 发布</button>
    </> : <button className="feed-owner-action" type="button" disabled={!checked} onClick={() => setShowLogin(true)}>管理</button>}
  </div>;
  return <>
    {mount && createPortal(controls, mount)}
    {showLogin && <LoginDialog apiBase={apiBase} onClose={() => setShowLogin(false)} onLoggedIn={(next) => { setSession(next); setShowLogin(false); }} />}
    {showPublish && <PublishDialog
      apiBase={apiBase}
      onClose={() => setShowPublish(false)}
      onAuthExpired={() => setSession({ authenticated: false, username: null })}
    />}
  </>;
}

function useModalDialog<T extends HTMLElement>(onClose: () => void) {
  const panelRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const dialog = panel?.closest<HTMLElement>('.feed-dialog');
    const background = dialog?.parentElement
      ? Array.from(dialog.parentElement.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== dialog)
      : [];
    const backgroundState = background.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));
    for (const element of background) { element.inert = true; element.setAttribute('aria-hidden', 'true'); }
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]') ?? []);
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const state of backgroundState) {
        state.element.inert = state.inert;
        if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden'); else state.element.setAttribute('aria-hidden', state.ariaHidden);
      }
      previous?.focus();
    };
  }, []);
  return panelRef;
}

function LoginDialog({ apiBase, onClose, onLoggedIn }: { apiBase: string; onClose: () => void; onLoggedIn: (session: SessionStatus) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const panelRef = useModalDialog<HTMLFormElement>(onClose);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!response.ok) throw new Error((await response.json() as { error?: { message?: string } }).error?.message ?? '登录失败');
      onLoggedIn({ authenticated: true, username });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '登录失败'); }
    finally { setBusy(false); }
  }
  return <div className="feed-dialog" role="dialog" aria-modal="true" aria-label="登录"><form ref={panelRef} className="feed-panel" onSubmit={login}>
    <button type="button" className="feed-close" onClick={onClose} aria-label="关闭">×</button><h2>管理 Feed</h2>
    <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
    <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
    {error && <p className="feed-state--error" role="alert">{error}</p>}<button className="feed-button" disabled={busy}>{busy ? '验证中…' : '登录'}</button>
  </form></div>;
}

function PublishDialog({ apiBase, onClose, onAuthExpired }: { apiBase: string; onClose: () => void; onAuthExpired: () => void }) {
  const [type, setType] = useState<'note' | 'clip'>('note');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [clipDraft, setClipDraft] = useState(createClipDraft);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const idempotency = useRef<string | null>(null);
  const publishing = useRef(false);
  const previewVersion = useRef(0);
  const { title, summary, image } = clipDraft.values;
  const successfulKeys = uploads.flatMap((item) => item.status === 'success' && item.key ? [item.key] : []);
  const hasSubstantialDraft = Boolean(content.trim() || linkUrl.trim() || title.trim() || summary.trim() || image.trim() || uploads.length);
  const closeSafely = useCallback(() => {
    if (!hasSubstantialDraft || window.confirm('尚有未发布的内容，确定关闭吗？')) onClose();
  }, [hasSubstantialDraft, onClose]);
  const panelRef = useModalDialog<HTMLFormElement>(closeSafely);
  const uploading = uploads.some((item) => item.status === 'uploading');
  const noteIsValid = Boolean(content.trim() || successfulKeys.length);
  const clipIsValid = Boolean(linkUrl.trim() && title.trim());
  const publishIsValid = type === 'note' ? noteIsValid : clipIsValid;
  const canPublish = publishIsValid && !uploading && !submitting;
  const publishReason = !publishIsValid ? (type === 'note' ? '请输入文字，或上传图片或视频。' : '请填写链接和标题。') : uploading ? '上传完成后才能发布。' : submitting ? '正在发布，请稍候。' : '';

  async function preview() {
    const candidate = previewCandidateUrl(linkUrl); if (!candidate) return;
    const version = ++previewVersion.current;
    setMessage('');
    try {
      const response = await fetch(`${normalizeApiBase(apiBase)}/api/feed/clip-preview`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: candidate }) });
      if (version !== previewVersion.current) return;
      if (!response.ok) {
        if (response.status === 401) onAuthExpired();
        setMessage(response.status === 401 ? '登录已过期，请重新认证；当前内容已保留。' : '无法自动读取该页面，可继续手动填写');
        return;
      }
      const data = await response.json() as {
        status: 'article' | 'metadata' | 'failed';
        link_title: string | null;
        link_summary: string | null;
        link_image: string | null;
        summary_status: 'generated' | 'failed' | 'not_requested';
      };
      setClipDraft((current) => applyClipCapture(current, data));
      setMessage(data.status === 'failed'
        ? '无法自动读取该页面，可继续手动填写'
        : data.status === 'metadata'
          ? '已获取基本信息，正文未能可靠读取'
          : data.summary_status === 'generated'
            ? '已读取文章并生成摘要'
            : data.summary_status === 'failed'
              ? '已读取文章，但摘要生成失败，可手动填写'
              : '已读取文章');
    } catch {
      if (version === previewVersion.current) setMessage('无法自动读取该页面，可继续手动填写');
    }
  }

  async function startUpload(item: UploadItem) {
    setUploads((current) => current.map((known) => known.id === item.id ? { ...known, status: 'uploading', progress: 0, error: undefined } : known));
    try {
      const result = await uploadFeedFile(apiBase, item.file, (progress) => setUploads((current) => current.map((known) => known.id === item.id ? { ...known, progress } : known)));
      setUploads((current) => current.map((known) => known.id === item.id ? { ...known, status: 'success', progress: 100, key: result.key } : known));
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes('登录已过期')) onAuthExpired();
      setUploads((current) => current.map((known) => known.id === item.id ? { ...known, status: 'failed', error: cause instanceof Error ? cause.message : '上传失败' } : known));
    }
  }

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const existingFiles = uploads.map((item) => item.file);
    const combined = [...existingFiles, ...selected];
    const imageFiles = combined.filter((file) => file.type.startsWith('image/'));
    const videoFiles = combined.filter((file) => file.type.startsWith('video/'));
    if ((imageFiles.length && videoFiles.length) || imageFiles.length > 6 || videoFiles.length > 1) { setMessage('图片和视频不能混用；最多 6 张图片或 1 个视频。'); return; }
    if (videoFiles[0]) {
      let duration: number;
      try { duration = await videoDuration(videoFiles[0]); }
      catch { setMessage('无法读取视频信息，请选择其他视频。'); return; }
      if (!Number.isFinite(duration)) { setMessage('无法读取视频信息，请选择其他视频。'); return; }
      if (duration > 60) { setMessage('视频不得超过 1 分钟。'); return; }
    }
    setMessage('');
    const items = selected.map((file) => ({ id: crypto.randomUUID(), file, status: 'uploading' as const, progress: 0 }));
    setUploads((current) => [...current, ...items]);
    await Promise.all(items.map(startUpload));
  }

  async function removeUpload(item: UploadItem) {
    setUploads((current) => current.filter((known) => known.id !== item.id));
    if (item.key) {
      await fetch(`${apiBase}/api/feed/media/${encodeURIComponent(item.key)}`, { method: 'DELETE', credentials: 'include' }).catch(() => undefined);
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault(); if (!canPublish || publishing.current) return;
    publishing.current = true; setSubmitting(true); setMessage(''); idempotency.current ??= crypto.randomUUID();
    try {
      const body = type === 'note'
        ? { type, content, media_keys: successfulKeys }
        : { type, content, media_keys: successfulKeys, link_url: linkUrl, link_title: title, link_summary: summary, link_image: image };
      const response = await fetch(`${apiBase}/api/feed`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotency.current }, body: JSON.stringify(body) });
      if (!response.ok) {
        if (response.status === 401) onAuthExpired();
        setMessage(response.status === 401 ? '登录已过期，请重新认证；当前内容与已上传文件已保留。' : (await response.json() as { error?: { message?: string } }).error?.message ?? '发布失败');
        return;
      }
      window.location.reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : '发布失败'); }
    finally { publishing.current = false; setSubmitting(false); }
  }

  return <div className="feed-dialog" role="dialog" aria-modal="true" aria-label="发布 Feed"><form ref={panelRef} className="feed-panel feed-publish-panel" onSubmit={publish}>
    <button type="button" className="feed-close" onClick={closeSafely} aria-label="关闭">×</button>
    <h2>发布</h2>
    <div className="feed-tabs" role="tablist"><button type="button" aria-pressed={type === 'note'} onClick={() => setType('note')}>碎碎念</button><button type="button" aria-pressed={type === 'clip'} onClick={() => setType('clip')}>剪藏</button></div>
    {type === 'clip' && <><label>链接<input type="url" value={linkUrl} onBlur={() => void preview()} onChange={(event) => { previewVersion.current += 1; setLinkUrl(event.target.value); }} required /></label><label>标题<input value={title} onChange={(event) => setClipDraft((current) => editClipField(current, 'title', event.target.value))} required /></label><label>摘要{clipDraft.sources.summary === 'machine' && summary && <span className="feed-field-note">自动生成，可编辑</span>}<textarea value={summary} onChange={(event) => setClipDraft((current) => editClipField(current, 'summary', event.target.value))} /></label><label>封面图 URL（可选）<input type="url" value={image} onChange={(event) => setClipDraft((current) => editClipField(current, 'image', event.target.value))} /></label></>}
    <label>{type === 'clip' ? '点评（可选）' : '文字'}<textarea value={content} onChange={(event) => setContent(event.target.value)} required={!successfulKeys.length && type === 'note'} /></label>
    <label>图片或视频<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime" multiple onChange={(event) => { void chooseFiles(event.target.files); event.currentTarget.value = ''; }} /></label>
    {uploads.length > 0 && <ul className="feed-upload-list">{uploads.map((item) => <li key={item.id}>
      <span>{item.file.name}</span><span>{item.status === 'uploading' ? `${item.progress}%` : item.status === 'success' ? '已上传' : item.error ?? '上传失败'}</span>
      {item.status === 'failed' && <button type="button" onClick={() => void startUpload(item)}>重试</button>}
      {item.status !== 'uploading' && <button type="button" onClick={() => void removeUpload(item)}>移除</button>}
    </li>)}</ul>}
    {publishReason && <p className="feed-state" role="status">{publishReason}</p>}{message && <p className={message.includes('失败') || message.includes('过期') ? 'feed-state--error' : ''} role="status">{message}</p>}
    <button className="feed-button" type="submit" disabled={!canPublish}>{submitting ? '正在发布…' : '发布'}</button>
  </form></div>;
}

function ImageViewer({ image, onClose }: { image: string; onClose: () => void }) {
  const panelRef = useModalDialog<HTMLDivElement>(onClose);
  return <div className="feed-dialog feed-viewer" role="dialog" aria-modal="true" aria-label="查看 Feed 图片" onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div ref={panelRef} className="feed-viewer-panel" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}><img src={image} alt="Feed 附图大图" /></div>
  </div>;
}

function uploadFeedFile(apiBase: string, file: File, onProgress: (progress: number) => void): Promise<{ key: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData(); form.set('file', file); const request = new XMLHttpRequest();
    request.open('POST', `${apiBase}/api/feed/upload`); request.withCredentials = true;
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onerror = () => reject(new Error('文件上传失败'));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) { reject(new Error(request.status === 401 ? '登录已过期，请重新认证；当前内容已保留。' : '文件上传失败')); return; }
      try { resolve(JSON.parse(request.responseText) as { key: string }); } catch { reject(new Error('上传响应无效')); }
    };
    request.send(form);
  });
}

async function videoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try { return await new Promise((resolve, reject) => { const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => Number.isFinite(video.duration) ? resolve(video.duration) : reject(new Error('无法读取视频时长')); video.onerror = () => reject(new Error('无法读取视频时长')); video.src = url; }); }
  finally { URL.revokeObjectURL(url); }
}
