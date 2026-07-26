export async function cleanExpiredViewVisitors(database: D1Database, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - (2 * 86_400_000)).toISOString();
  await database.prepare('DELETE FROM blog_view_visitors WHERE created_at < ?').bind(cutoff).run();
}
