export interface TrackDefinition {
  slug: string;
  name: string;
  description: string;
}

export const TRACK_CATALOG: readonly TrackDefinition[] = [
  { slug: 'programming', name: '编程', description: '语言、框架与工具的实践笔记。' },
  { slug: 'english', name: '英语', description: '输入、表达与长期积累的方法。' },
  { slug: 'typing', name: '打字', description: '让输入更稳定、更准确。' },
  { slug: 'art', name: '艺术', description: '观察、创作与视觉训练。' },
  { slug: 'finance', name: '金融', description: '投资、理财与决策记录。' },
];

export type LearnBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'link'; href: string; text: string }
  | { kind: 'wikilink'; slug: string; label?: string };

export interface LearnNote {
  slug: string;
  title: string;
  track: string;
  section?: string;
  tags: string[];
  draft: boolean;
  publishDate: string;
  lastModified: string;
  excerpt: string;
  parentSlug?: string;
  sourceUrl?: string;
  blocks: LearnBlock[];
}

/**
 * Read-only snapshot synced from the public repository documents on
 * 2026-07-24. It intentionally contains no write endpoint or credential.
 */
export const LEARN_NOTES: LearnNote[] = [
  {
    slug: 'vibe-coding-mission',
    title: 'Vibe Coding：与 AI 协作的学习任务',
    track: 'programming',
    section: '编程',
    tags: ['Vibe Coding', 'AI 协作', 'JavaScript', '项目实践'],
    draft: false,
    publishDate: '2026-07-03',
    lastModified: '2026-07-03',
    excerpt: '通过理解 AI 生成的代码、掌握基础概念并积累项目经验，提升与 AI 协作的判断力。',
    sourceUrl: 'https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/teach/MISSION.md',
    blocks: [
      { kind: 'paragraph', text: '目标：作为 Vibe Coder 更高效地与 AI 协作，并服务于更深层的职业转型。' },
      { kind: 'heading', level: 2, text: '具体方向' },
      { kind: 'paragraph', text: '理解 AI 生成的代码，能判断对错、做决策；掌握基础编程概念，提升和 AI 对话的精准度；积累实际项目经验（以 catstarry.xyz 为主线）。' },
      { kind: 'paragraph', text: '项目实现时，先理解 [[site-context-and-terms]] 的领域约定，再回到 [[content-canvas-and-accessibility]] 检查内容页面的约束。' },
    ],
  },
  {
    slug: 'site-context-and-terms',
    title: 'catstarry.xyz 项目上下文与术语',
    track: 'programming',
    section: '项目基础',
    tags: ['Astro', 'React', 'shadcn/ui', 'Cloudflare', 'Learn', 'Projects'],
    draft: false,
    publishDate: '2026-07-03',
    lastModified: '2026-07-24',
    excerpt: '从项目简介、技术架构与板块职责进入 catstarry.xyz 的上下文。',
    parentSlug: 'vibe-coding-mission',
    sourceUrl: 'https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/CONTEXT.md',
    blocks: [
      { kind: 'heading', level: 2, text: '项目简介' },
      { kind: 'paragraph', text: 'catstarry.xyz 是木下的个人网站，用 AI 驱动搭建。' },
      { kind: 'heading', level: 2, text: '技术架构' },
      { kind: 'heading', level: 3, text: '前端与部署' },
      { kind: 'paragraph', text: '前端采用 Astro hybrid + React (shadcn/ui)，部署到 Cloudflare Pages；后端使用 Cloudflare Workers，结构化数据使用 D1，缓存与配置使用 KV，媒体使用 R2。' },
      { kind: 'heading', level: 3, text: '内容板块' },
      { kind: 'paragraph', text: 'Learn 是编程学习笔记板块，基于 teach skill 的 lesson 产出，按 track 组织；Projects 是成品项目展示，显示最近 2 个项目。' },
      { kind: 'heading', level: 2, text: '关联阅读' },
      { kind: 'paragraph', text: '内容画布与可访问性约束集中在 [[content-canvas-and-accessibility]]，学习任务见 [[vibe-coding-mission]]。' },
    ],
  },
  {
    slug: 'content-canvas-and-accessibility',
    title: 'Content 画布与可访问性',
    track: 'programming',
    section: '项目基础',
    tags: ['Content Canvas', 'CJK', '可访问性', '键盘', 'reduced-motion'],
    draft: false,
    publishDate: '2026-07-18',
    lastModified: '2026-07-24',
    excerpt: '记录内容页的 Cream Gallery 语境，以及 CJK、键盘、触控和动效降级约束。',
    parentSlug: 'site-context-and-terms',
    sourceUrl: 'https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/DESIGN.md',
    blocks: [
      { kind: 'heading', level: 2, text: 'Content / Cream Gallery' },
      { kind: 'paragraph', text: 'Blog、Feed、Learn、Projects 继续使用 Cream Gallery 的现有功能布局。星球只是入口与材质母题，内容本身始终是主角。' },
      { kind: 'heading', level: 3, text: 'CJK 优先' },
      { kind: 'paragraph', text: '中文正文字号 ≥16px，行高 ≥1.85；标点挤压使用 text-spacing-trim 与 hanging-punctuation；中英混排保留 1/4em 间距。' },
      { kind: 'heading', level: 3, text: '内容页面的边界' },
      { kind: 'paragraph', text: 'Content 页面不出现完整行星、星图滚动、3D 飞行或宇宙背景，只低剂量借用地质材质和光学残响。' },
      { kind: 'heading', level: 2, text: 'Learn 与 Projects 的表达' },
      { kind: 'paragraph', text: 'Learn 可借断层、刻线或矿脉关系表达章节与进度；Projects 可借台地、切面与嵌线表达项目状态和结构。' },
      { kind: 'heading', level: 3, text: '交互验证' },
      { kind: 'paragraph', text: '键盘焦点、触控尺寸与 prefers-reduced-motion 是内容页必须保留的交互约束。实现时可回看 [[site-context-and-terms]] 与 [[vibe-coding-mission]]。' },
      { kind: 'code', language: 'html', code: '<main data-canvas="content">...</main>' },
    ],
  },
  {
    slug: 'english-reading-resources',
    title: '英语：阅读技术文档与日常输入',
    track: 'english',
    section: '阅读',
    tags: ['English', '技术文档', 'MDN', 'JavaScript.info', 'DeepL'],
    draft: false,
    publishDate: '2026-07-03',
    lastModified: '2026-07-03',
    excerpt: '通过技术文档、文章、书籍与交流工具，建立持续的英语输入。',
    sourceUrl: 'https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/teach/MISSION.md',
    blocks: [
      { kind: 'paragraph', text: '目标：提升交流能力和阅读能力。' },
      { kind: 'heading', level: 2, text: '具体方向' },
      { kind: 'paragraph', text: '口语交流：能与人用英语自然对话；阅读：无障碍阅读英文技术文档、文章、书籍；作为 Vibe Coder 的辅助：英文 prompt 通常比中文更精准。' },
      { kind: 'heading', level: 3, text: '编程资源' },
      { kind: 'link', href: 'https://developer.mozilla.org/', text: 'MDN Web Docs：HTML、CSS 与 JavaScript 参考。' },
      { kind: 'link', href: 'https://javascript.info/', text: 'JavaScript.info：从基础到进阶的现代 JavaScript 教程。' },
      { kind: 'paragraph', text: '这条轨道与 [[vibe-coding-mission]] 相互连接：阅读能力服务于更精准的 AI 协作。' },
    ],
  },
  {
    slug: 'typing-foundation',
    title: '打字：把想法稳定地转成输出',
    track: 'typing',
    section: '练习',
    tags: ['typing speed', '盲打', 'Monkeytype', 'TypingClub', 'SpeedCoder'],
    draft: false,
    publishDate: '2026-07-03',
    lastModified: '2026-07-03',
    excerpt: '让中文、英文与代码输入更稳定，减少表达过程中的摩擦。',
    sourceUrl: 'https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/teach/MISSION.md',
    blocks: [
      { kind: 'paragraph', text: '目标：提升 typing speed，更快地将想法转化为输出。' },
      { kind: 'heading', level: 2, text: '具体方向' },
      { kind: 'paragraph', text: '提高英文和中文打字速度；培养盲打习惯；作为编程和写作的基础。' },
      { kind: 'heading', level: 3, text: '练习资源' },
      { kind: 'link', href: 'https://monkeytype.com/', text: 'Monkeytype：现代打字练习。' },
      { kind: 'link', href: 'https://www.typingclub.com/', text: 'TypingClub：结构化打字课程。' },
      { kind: 'link', href: 'https://www.speedcoder.net/', text: 'SpeedCoder：以代码符号为主的程序员练习。' },
    ],
  },
];

export function getPublishedNotes(entries: LearnNote[] = LEARN_NOTES) {
  return [...entries]
    .filter((note) => !note.draft)
    .sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
}

export function getTrackDefinition(slug: string) {
  return (
    TRACK_CATALOG.find((track) => track.slug === slug) ?? {
      slug,
      name: slug,
      description: '尚未填写轨道说明。',
    }
  );
}

export function getActiveTracks(notes: LearnNote[]) {
  const activeSlugs = [...new Set(notes.map((note) => note.track))];
  const known = TRACK_CATALOG.filter((track) => activeSlugs.includes(track.slug));
  const additional = activeSlugs
    .filter((slug) => !TRACK_CATALOG.some((track) => track.slug === slug))
    .map((slug) => getTrackDefinition(slug));
  return [...known, ...additional];
}

export function getTrackNotes(notes: LearnNote[], trackSlug: string) {
  return notes.filter((note) => note.track === trackSlug);
}

export function getTrackSections(notes: LearnNote[]) {
  return [...new Set(notes.map((note) => note.section).filter((section): section is string => Boolean(section)))];
}

export function formatLearnDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export interface LearnTreeRow {
  note: LearnNote;
  depth: number;
}

export function getTreeRows(notes: LearnNote[]) {
  const rows: LearnTreeRow[] = [];
  const byParent = new Map<string | undefined, LearnNote[]>();

  for (const note of notes) {
    const siblings = byParent.get(note.parentSlug) ?? [];
    siblings.push(note);
    byParent.set(note.parentSlug, siblings);
  }

  const visited = new Set<string>();
  const visit = (parentSlug: string | undefined, depth: number) => {
    const children = byParent.get(parentSlug) ?? [];
    for (const note of children) {
      if (visited.has(note.slug)) continue;
      visited.add(note.slug);
      rows.push({ note, depth });
      visit(note.slug, depth + 1);
    }
  };

  visit(undefined, 0);
  for (const note of notes) {
    if (!visited.has(note.slug)) rows.push({ note, depth: 0 });
  }
  return rows;
}
