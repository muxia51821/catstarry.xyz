import { useViewCount } from '../lib/useViewCount';

export default function ViewCounter({ slug }: { slug: string }) {
  const count = useViewCount(slug);

  if (count === null) {
    return null;
  }

  return <span className="post-views">{count} 次阅读</span>;
}
