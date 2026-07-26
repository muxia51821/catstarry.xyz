import { useEffect } from 'react';

import { useBatchViewCount } from '../../lib/useViewCount';

export default function BatchViewHydrator({ slugs }: { slugs: string[] }) {
  const counts = useBatchViewCount(slugs);

  useEffect(() => {
    if (!counts) return;
    for (const slot of document.querySelectorAll<HTMLElement>('[data-blog-view-count]')) {
      const slug = slot.dataset.blogViewCount;
      if (!slug || !(slug in counts)) continue;
      slot.textContent = `${counts[slug]} 次阅读`;
      slot.hidden = false;
    }
  }, [counts]);

  return null;
}
