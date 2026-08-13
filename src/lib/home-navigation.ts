export const STAR_MAP_DESTINATION = '/?stage=overview';

export type InitialHomeStage = 'overview';

export function parseInitialHomeStage(search: string): InitialHomeStage | null {
  const stage = new URLSearchParams(search).get('stage');
  return stage === 'overview' ? stage : null;
}
