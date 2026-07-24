export interface ProjectIndexEntry {
  name: string;
  description: string;
  url: string;
  screenshot: string;
  tags: string[];
  date: string;
}

/**
 * Read-only snapshot of the two publicly available owner projects checked on
 * 2026-07-24. No admin endpoint, credential, or write path is involved.
 */
export const PROJECTS: ProjectIndexEntry[] = [
  {
    name: "Underwood's table agent",
    description: '独立子域名上的 Poker PWA 应用，已上线。',
    url: 'https://poker.catstarry.xyz/',
    screenshot: '',
    tags: ['Poker', 'PWA', '独立部署'],
    date: '2026-07-24',
  },
  {
    name: 'catstarry.xyz',
    description: '以 Astro hybrid、React 与 Cloudflare 为基础的个人网站。',
    url: 'https://github.com/muxia51821/catstarry.xyz',
    screenshot: '',
    tags: ['Astro', 'React', 'Cloudflare'],
    date: '2026-07-23',
  },
];

export function getVisibleProjects(entries: ProjectIndexEntry[] = PROJECTS) {
  return [...entries]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 2);
}
