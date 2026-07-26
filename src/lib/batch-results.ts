export function summarizeBatchResults(results: readonly PromiseSettledResult<unknown>[]): string | null {
  const failed = results.filter((result) => result.status === 'rejected').length;
  return failed
    ? `部分操作失败：成功 ${results.length - failed} 项，失败 ${failed} 项`
    : null;
}
