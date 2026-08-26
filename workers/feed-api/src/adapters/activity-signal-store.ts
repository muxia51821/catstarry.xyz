import type { ActivitySignalsManifest, FootprintSource } from '../../../../shared/types';

type LatestActivity = Partial<Record<'feed' | FootprintSource, string | null>>;

interface LatestActivityRow {
  latest_at: string | null;
}

interface LatestFootprintRow {
  source_module: FootprintSource;
  latest_at: string | null;
}

export class ActivitySignalStore {
  constructor(
    private readonly database: D1Database,
    private readonly projections: R2Bucket,
  ) {}

  async readLatestActivity(publishedBlogSlugs: string[], publishedLearnSlugs: string[]): Promise<LatestActivity> {
    const publicFootprint = `(visibility = 'public'
      AND (source_module != 'blog' OR source_ref IN (SELECT value FROM json_each(?)))
      AND (source_module != 'learn' OR event_type = 'learn_section_completed'
        OR source_ref IN (SELECT value FROM json_each(?))))`;
    const [feedPost, footprints] = await Promise.all([
      this.database
        .prepare(
          `SELECT MAX(activity_at) AS latest_at FROM (
            SELECT created_at AS activity_at FROM feed_posts WHERE visibility = 'public'
            UNION ALL SELECT occurred_at AS activity_at FROM public_footprints WHERE ${publicFootprint}
          )`,
        )
        .bind(JSON.stringify(publishedBlogSlugs), JSON.stringify(publishedLearnSlugs))
        .first<LatestActivityRow>(),
      this.database
        .prepare(
          `SELECT source_module, MAX(occurred_at) AS latest_at FROM public_footprints
            WHERE ${publicFootprint} GROUP BY source_module`,
        )
        .bind(JSON.stringify(publishedBlogSlugs), JSON.stringify(publishedLearnSlugs))
        .all<LatestFootprintRow>(),
    ]);

    const latest: LatestActivity = { feed: feedPost?.latest_at ?? null };
    for (const footprint of footprints.results) {
      latest[footprint.source_module] = footprint.latest_at;
    }
    return latest;
  }

  async publish(manifest: ActivitySignalsManifest): Promise<void> {
    await this.projections.put('activity-signals.json', JSON.stringify(manifest), {
      httpMetadata: {
        contentType: 'application/json; charset=utf-8',
        cacheControl: 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  }
}
