import { useViewCount } from '../lib/useViewCount';

export default function ViewCounter({ slug }: { slug: string }) {
  const count = useViewCount(slug);

  if (count === null) {
    return <span class="post-views">--- 次阅读</span>;
  }

  return <span class="post-views">{count} 次阅读</span>;
}
