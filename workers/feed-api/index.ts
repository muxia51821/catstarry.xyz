/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  VIEW_KV: KVNamespace;
}

interface ViewResponse {
  slug: string;
  count: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // POST /api/views — record a view
    if (url.pathname === '/api/views' && request.method === 'POST') {
      const { slug } = (await request.json()) as { slug: string };
      if (!slug) return new Response('Missing slug', { status: 400 });

      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const today = new Date().toISOString().split('T')[0];
      const kvKey = `view:${ip}:${slug}:${today}`;

      // Check KV dedup
      const existing = await env.VIEW_KV.get(kvKey);
      if (existing) {
        // Already counted today — return current count without incrementing
        const row = await env.DB.prepare('SELECT count FROM blog_views WHERE slug = ?').bind(slug).first<{ count: number }>();
        return Response.json({ slug, count: row?.count ?? 0 });
      }

      // Set dedup key (TTL until end of day)
      const ttl = 86400 - (Date.now() / 1000) % 86400;
      await env.VIEW_KV.put(kvKey, '1', { expirationTtl: Math.ceil(ttl) });

      // Upsert count
      await env.DB.prepare(
        'INSERT INTO blog_views (slug, count) VALUES (?1, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1'
      ).bind(slug).run();

      const row = await env.DB.prepare('SELECT count FROM blog_views WHERE slug = ?').bind(slug).first<{ count: number }>();
      return Response.json({ slug, count: row?.count ?? 0 });
    }

    // GET /api/views — query views
    if (url.pathname === '/api/views' && request.method === 'GET') {
      const slugParam = url.searchParams.get('slug');
      const slugsParam = url.searchParams.get('slugs');

      if (slugParam) {
        const row = await env.DB.prepare('SELECT slug, count FROM blog_views WHERE slug = ?').bind(slugParam).first<ViewResponse>();
        return Response.json(row ?? { slug: slugParam, count: 0 });
      }

      if (slugsParam) {
        const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (slugs.length === 0) return Response.json({ views: [] });

        const placeholders = slugs.map(() => '?').join(',');
        const result = await env.DB.prepare(
          `SELECT slug, count FROM blog_views WHERE slug IN (${placeholders})`
        ).bind(...slugs).all<ViewResponse>();

        // Fill in zero for slugs not found
        const found = new Map(result.results.map((r) => [r.slug, r.count]));
        const views = slugs.map((slug) => ({ slug, count: found.get(slug) ?? 0 }));
        return Response.json({ views });
      }

      return new Response('Missing slug or slugs parameter', { status: 400 });
    }

    return new Response('Not found', { status: 404 });
  },
};
