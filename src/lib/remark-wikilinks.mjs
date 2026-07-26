const WIKILINK = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]]+))?\]\]/g;

export default function remarkWikilinks() {
  return (tree) => transform(tree);
}

function transform(node) {
  if (!node?.children) return;
  const nextChildren = [];
  for (const child of node.children) {
    if (child.type !== 'text') {
      transform(child);
      nextChildren.push(child);
      continue;
    }

    let cursor = 0;
    for (const match of child.value.matchAll(WIKILINK)) {
      if (match.index > cursor) nextChildren.push({ type: 'text', value: child.value.slice(cursor, match.index) });
      const slug = match[1];
      nextChildren.push({
        type: 'link',
        url: `/learn/notes/${slug}/`,
        children: [{ type: 'text', value: match[2] ?? slug }],
        data: {
          hProperties: {
            className: ['learn-wikilink__link'],
            'data-wikilink-trigger': '',
            'data-wikilink-slug': slug,
            'aria-expanded': 'false',
          },
        },
      });
      cursor = match.index + match[0].length;
    }
    if (cursor === 0) nextChildren.push(child);
    else if (cursor < child.value.length) nextChildren.push({ type: 'text', value: child.value.slice(cursor) });
  }
  node.children = nextChildren;
}
