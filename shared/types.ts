export type PostType = 'note' | 'clip';
export type Visibility = 'public' | 'private';
export type FootprintSource = 'blog' | 'learn' | 'projects';
export type FootprintEventType =
  | 'blog_published'
  | 'learn_section_completed'
  | 'learn_note_published'
  | 'learn_note_revised'
  | 'project_updated';
export type ActivityState = 'active' | 'stable' | 'dormant';
export type BlogLifecycleState = 'draft' | 'published' | 'withdrawn';

export interface BlogLifecycleEntry {
  slug: string;
  title: string;
  summary: string;
  state: BlogLifecycleState;
}

export type LearnPublicationVisibility = 'public' | 'hidden';

export interface LearnPublicationRecord {
  slug: string;
  visibility: LearnPublicationVisibility;
  published_at: string;
  last_revised_at: string | null;
  updated_at: string;
}

export interface ActivitySignalsManifest {
  schema_version: 1;
  signals: Record<'blog' | 'feed' | 'learn' | 'projects', { state: ActivityState }>;
}

export interface FeedPost {
  id: string;
  type: PostType;
  content: string | null;
  media_json: string | null;
  link_url: string | null;
  link_title: string | null;
  link_summary: string | null;
  link_image: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface PublicFootprint {
  id: string;
  source_module: FootprintSource;
  source_ref: string;
  source_version: string;
  event_type: FootprintEventType;
  snapshot_json: string;
  occurred_at: string;
  visibility: Visibility;
}

export interface TimelineEntry {
  id: string;
  kind: 'native_post' | 'system_footprint';
  occurred_at: string;
  visibility: Visibility;
  projection_state?: 'public' | 'own_private' | 'source_hidden';
  payload: FeedPost | PublicFootprint;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor: string | null;
  has_more: boolean;
}

export interface BlogViewCount {
  slug: string;
  count: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
}

export interface SessionStatus {
  authenticated: boolean;
  username: string | null;
}

export interface FeedPostInput {
  type: PostType;
  content?: string | null;
  media_keys?: string[];
  link_url?: string | null;
  link_title?: string | null;
  link_summary?: string | null;
  link_image?: string | null;
}

export interface FeedMediaUploadResponse {
  key: string;
  content_type: string;
  size: number;
}

export interface ClipPreview {
  status: 'article' | 'metadata' | 'failed';
  reason: 'fetch_failed' | 'non_html' | 'content_too_large' | 'article_unavailable' | 'extraction_failed' | null;
  link_url: string;
  retrieval_url: string | null;
  link_title: string | null;
  link_summary: string | null;
  link_image: string | null;
  metadata_description: string | null;
  article: {
    byline: string | null;
    excerpt: string | null;
    site_name: string | null;
    published_time: string | null;
    character_count: number;
  } | null;
  summary_status: 'generated' | 'failed' | 'not_requested';
}

export interface PublicFootprintCandidate {
  source_module: FootprintSource;
  source_ref: string;
  source_version: string;
  event_type: FootprintEventType;
  snapshot_json: string;
  occurred_at: string;
  idempotency_key: string;
}
