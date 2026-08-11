import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(file, 'utf8');
const [archive, list, pagination, detail, css] = await Promise.all([
  read('src/components/blog/BlogArchive.astro'),
  read('src/components/blog/BlogPostList.astro'),
  read('src/components/blog/BlogPagination.astro'),
  read('src/pages/blog/[...slug].astro'),
  read('src/styles/blog.css'),
]);

assert.match(archive, /<h1>\{title\}<\/h1>/);
assert.doesNotMatch(archive, /BlogTaxonomy|blog-eyebrow|intro=|showTaxonomy/);
assert.equal((archive.match(/<BlogPagination/g) ?? []).length, 1);

assert.match(list, /formatBlogArchiveDate/);
assert.match(list, /class="blog-post-entry"/);
assert.match(list, /class="blog-post-entry__date"/);
assert.match(list, /class="blog-post-entry__mobile-meta"/);
assert.doesNotMatch(list, /blog-post-card|data-blog-view-count|BatchViewHydrator|\/blog\/tag\//);

assert.match(pagination, /← 较新的文章/);
assert.match(pagination, /更早的文章 →/);
assert.doesNotMatch(pagination, /<ol|第 \$\{page\} 页|上一页|下一页/);

assert.match(detail, /href="\/blog\/"/);
assert.match(detail, /返回博客/);
assert.doesNotMatch(detail, /返回星图|BLOG \/ READING|blog-reading-nav__wordmark/);
assert.match(detail, /class="blog-article__paper"/);
assert.match(detail, /class="blog-article__tags"/);
assert.match(detail, /blog-prev-next/);
assert.match(detail, /较新的文章/);
assert.match(detail, /更早的文章/);
assert.doesNotMatch(detail, /<ViewCounter[\s\S]*?blog-article__category/);

for (const marker of [
  '.blog-post-entry',
  '.blog-post-entry__content:is(:hover, :focus-within)',
  '.blog-article__paper',
  '.blog-prev-next',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(css.includes(marker), `Blog stylesheet is missing ${marker}`);
}
assert.doesNotMatch(css, /\.blog-post-card|\.blog-taxonomy|\.blog-pagination__pages/);

console.log('Blog reconciliation contract passed.');
