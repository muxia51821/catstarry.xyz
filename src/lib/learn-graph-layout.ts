export interface LearnGraphLayoutNode {
  slug: string;
  track: string;
  width: number;
  height: number;
}

export interface LearnGraphLayoutRelation {
  source: string;
  target: string;
}

export interface LearnGraphLayoutOptions {
  width: number;
  height: number;
  portrait: boolean;
}

export interface LearnGraphLayoutPosition {
  x: number;
  y: number;
}

interface MutablePosition extends LearnGraphLayoutPosition {
  node: LearnGraphLayoutNode;
  anchorX: number;
  anchorY: number;
}

const EDGE_LENGTH = 228;
const OUTER_GUTTER = 26;

export function layoutLearnGraph(
  nodes: LearnGraphLayoutNode[],
  relations: LearnGraphLayoutRelation[],
  options: LearnGraphLayoutOptions,
) {
  const byTrack = new Map<string, LearnGraphLayoutNode[]>();
  const degree = new Map(nodes.map((node) => [node.slug, 0]));
  for (const relation of relations) {
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    const group = byTrack.get(node.track) ?? [];
    group.push(node);
    byTrack.set(node.track, group);
  }

  const tracks = [...byTrack.keys()].sort((a, b) => a.localeCompare(b, 'en'));
  const positions = new Map<string, MutablePosition>();
  for (const [trackIndex, track] of tracks.entries()) {
    const group = [...(byTrack.get(track) ?? [])].sort((a, b) =>
      (degree.get(b.slug) ?? 0) - (degree.get(a.slug) ?? 0) || a.slug.localeCompare(b.slug, 'en'),
    );
    const anchor = trackAnchor(trackIndex, tracks.length, options);
    for (const [index, node] of group.entries()) {
      const offset = seedOffset(index, group.length, options.portrait);
      positions.set(node.slug, {
        node,
        anchorX: anchor.x,
        anchorY: anchor.y,
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
      });
    }
  }

  const edges = relations
    .map((relation) => [positions.get(relation.source), positions.get(relation.target)] as const)
    .filter((pair): pair is readonly [MutablePosition, MutablePosition] => Boolean(pair[0] && pair[1]));

  for (let iteration = 0; iteration < 72; iteration += 1) {
    for (const position of positions.values()) {
      position.x += (position.anchorX - position.x) * 0.018;
      position.y += (position.anchorY - position.y) * 0.018;
    }
    for (const [source, target] of edges) {
      const deltaX = target.x - source.x;
      const deltaY = target.y - source.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const shift = Math.max(-6, Math.min(6, (distance - EDGE_LENGTH) * 0.03));
      const moveX = (deltaX / distance) * shift;
      const moveY = (deltaY / distance) * shift;
      source.x += moveX;
      source.y += moveY;
      target.x -= moveX;
      target.y -= moveY;
    }
    separateOverlappingLabels([...positions.values()], options);
    for (const position of positions.values()) clampToField(position, options);
  }

  return new Map([...positions].map(([slug, position]) => [slug, { x: position.x, y: position.y }]));
}

function trackAnchor(index: number, count: number, options: LearnGraphLayoutOptions) {
  const ratio = (index + 0.5) / Math.max(count, 1);
  return options.portrait
    ? { x: options.width / 2, y: 70 + ratio * Math.max(80, options.height - 140) }
    : { x: 70 + ratio * Math.max(120, options.width - 140), y: options.height / 2 };
}

function seedOffset(index: number, count: number, portrait: boolean) {
  if (index === 0) return { x: 0, y: 0 };
  const angle = -Math.PI / 2 + (index - 1) * 2.399963229728653;
  const radius = 132 + Math.floor((index - 1) / 5) * 74 + Math.min(count, 6) * 5;
  return portrait
    ? { x: Math.cos(angle) * Math.min(132, radius * 0.76), y: Math.sin(angle) * radius }
    : { x: Math.cos(angle) * radius * 1.22, y: Math.sin(angle) * radius * 0.82 };
}

function separateOverlappingLabels(positions: MutablePosition[], options: LearnGraphLayoutOptions) {
  for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
      const left = positions[leftIndex];
      const right = positions[rightIndex];
      const horizontal = Math.abs(right.x - left.x);
      const vertical = Math.abs(right.y - left.y);
      const minimumHorizontal = (left.node.width + right.node.width) / 2 + 24;
      const minimumVertical = (left.node.height + right.node.height) / 2 + 20;
      if (horizontal >= minimumHorizontal || vertical >= minimumVertical) continue;
      const horizontalPressure = (minimumHorizontal - horizontal) / minimumHorizontal;
      const verticalPressure = (minimumVertical - vertical) / minimumVertical;
      if (!options.portrait && horizontalPressure >= verticalPressure) {
        const direction = right.x >= left.x ? 1 : -1;
        const separation = (minimumHorizontal - horizontal) / 2 + 2;
        left.x -= direction * separation;
        right.x += direction * separation;
      } else {
        const direction = right.y >= left.y ? 1 : -1;
        const separation = (minimumVertical - vertical) / 2 + 2;
        left.y -= direction * separation;
        right.y += direction * separation;
      }
      if (options.portrait && horizontal < minimumHorizontal * 0.6) {
        const direction = right.x >= left.x ? 1 : -1;
        left.x -= direction * 6;
        right.x += direction * 6;
      }
    }
  }
}

function clampToField(position: MutablePosition, options: LearnGraphLayoutOptions) {
  const halfWidth = position.node.width / 2;
  const halfHeight = position.node.height / 2;
  position.x = Math.max(OUTER_GUTTER + halfWidth, Math.min(options.width - OUTER_GUTTER - halfWidth, position.x));
  position.y = Math.max(OUTER_GUTTER + halfHeight, Math.min(options.height - OUTER_GUTTER - halfHeight, position.y));
}
