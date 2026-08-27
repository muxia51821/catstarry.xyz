import { readBlogPublicationEntries } from './blog-publications.mjs';
import { assertLearnProductionTransition, readLearnPublicationEntries } from './learn-publications.mjs';

const LEARN_PUBLICATION_SLUGS = [
  'domain-dns-http',
  'git-recovery-reflog-reset',
  'git-commit-graph-branch-ref-head',
  'git-rebase-conflicts-and-force-with-lease',
  'git-remotes-fetch-and-divergence',
  'astro-react-and-hydration',
  'javascript-runtimes-browser-node-workers',
];

export async function readLocalPreviewFixture(now = new Date()) {
  const [learnEntries, blogEntries] = await Promise.all([
    readLearnPublicationEntries(),
    readBlogPublicationEntries(),
  ]);
  const learnBySlug = new Map(learnEntries.map((entry) => [entry.slug, entry]));
  const learnPublications = LEARN_PUBLICATION_SLUGS.map((slug, index) => {
    const entry = learnBySlug.get(slug);
    if (!entry) throw new Error(`Local Learn fixture source is unavailable: ${slug}`);
    return {
      ...entry,
      published_at: new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1_000).toISOString(),
    };
  });
  assertLearnProductionTransition(LEARN_PUBLICATION_SLUGS, learnEntries);

  const publishedBlog = blogEntries.find((entry) => entry.state === 'published');
  if (!publishedBlog) throw new Error('Local preview needs one published Blog source for its visual fixture');

  const at = (daysAgo) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1_000).toISOString();
  return {
    learnPublications,
    feedPosts: [
      {
        id: '2f95a853-276b-4f2b-a6b0-0c6e5a54a101',
        type: 'note',
        content: '本地预览的代表性 Feed：用于检查真实长度、时间线节奏与阅读密度。',
        created_at: at(1),
      },
      {
        id: '2f95a853-276b-4f2b-a6b0-0c6e5a54a102',
        type: 'clip',
        content: null,
        link_url: 'https://developer.mozilla.org/',
        link_title: 'MDN Web Docs',
        link_summary: '本地预览用的代表性剪藏，不连接或修改外部数据。',
        created_at: at(4),
      },
    ],
    footprints: [
      {
        id: '2f95a853-276b-4f2b-a6b0-0c6e5a54a201',
        source_module: 'blog',
        source_ref: publishedBlog.slug,
        source_version: 'local-preview-fixture-v1',
        event_type: 'blog_published',
        snapshot_json: JSON.stringify({
          title: publishedBlog.title,
          summary: publishedBlog.summary,
          link: `/blog/${publishedBlog.slug}/`,
        }),
        occurred_at: at(18),
        idempotency_key: `local-preview-blog-${publishedBlog.slug}`,
      },
      {
        id: '2f95a853-276b-4f2b-a6b0-0c6e5a54a202',
        source_module: 'learn',
        source_ref: learnPublications[0].slug,
        source_version: 'local-preview-fixture-v1',
        event_type: 'learn_note_published',
        snapshot_json: JSON.stringify({
          title: learnPublications[0].title,
          summary: learnPublications[0].excerpt,
          link: `/learn/notes/${learnPublications[0].slug}/`,
        }),
        occurred_at: at(2),
        idempotency_key: `local-preview-learn-${learnPublications[0].slug}`,
      },
      {
        id: '2f95a853-276b-4f2b-a6b0-0c6e5a54a203',
        source_module: 'projects',
        source_ref: 'local-preview-project',
        source_version: 'local-preview-fixture-v1',
        event_type: 'project_updated',
        snapshot_json: JSON.stringify({
          title: '本地预览 Projects 更新',
          summary: '用于检查 Home Activity Signal 的 dormant 状态。',
          link: '/projects/',
        }),
        occurred_at: at(90),
        idempotency_key: 'local-preview-project-update',
      },
    ],
    activitySignals: {
      schema_version: 1,
      signals: {
        blog: { state: 'active' },
        feed: { state: 'active' },
        learn: { state: 'active' },
        projects: { state: 'dormant' },
      },
    },
  };
}

export function localPreviewFixtureSql(fixture) {
  const value = (input) => input === null || input === undefined
    ? 'NULL'
    : `'${String(input).replaceAll("'", "''")}'`;
  const statements = [];
  for (const entry of fixture.learnPublications) {
    statements.push(`INSERT INTO learn_publications (slug, visibility, published_at, last_revised_at, updated_at)
      VALUES (${value(entry.slug)}, 'public', ${value(entry.published_at)}, ${value(entry.revised_at)}, ${value(entry.published_at)});`);
  }
  for (const post of fixture.feedPosts) {
    statements.push(`INSERT INTO feed_posts (
      id, type, content, media_json, link_url, link_title, link_summary, link_image,
      visibility, created_at, updated_at
    ) VALUES (
      ${value(post.id)}, ${value(post.type)}, ${value(post.content)}, NULL,
      ${value(post.link_url)}, ${value(post.link_title)}, ${value(post.link_summary)}, NULL,
      'public', ${value(post.created_at)}, ${value(post.created_at)}
    );`);
  }
  for (const footprint of fixture.footprints) {
    statements.push(`INSERT INTO public_footprints (
      id, source_module, source_ref, source_version, event_type, snapshot_json,
      occurred_at, visibility, idempotency_key, created_at
    ) VALUES (
      ${value(footprint.id)}, ${value(footprint.source_module)}, ${value(footprint.source_ref)},
      ${value(footprint.source_version)}, ${value(footprint.event_type)}, ${value(footprint.snapshot_json)},
      ${value(footprint.occurred_at)}, 'public', ${value(footprint.idempotency_key)}, ${value(footprint.occurred_at)}
    );`);
  }
  return `${statements.join('\n')}\n`;
}

export function localPreviewFixtureSummary(fixture) {
  return {
    learn: fixture.learnPublications.length,
    feed: fixture.feedPosts.length,
    footprints: fixture.footprints.length,
  };
}
