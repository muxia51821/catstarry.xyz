import { useViewTracker } from '../lib/useViewCount';

export default function ViewTracker({ slug }: { slug: string }) {
  useViewTracker(slug);
  return null;
}
