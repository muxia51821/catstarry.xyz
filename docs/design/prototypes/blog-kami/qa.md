# Blog Kami prototype QA

## Static checks

- [x] `index.html` renders in the local browser.
- [x] Required article elements exist: title, date, category, tags, reading count position, H2, H3, unordered list, ordered list, link, inline code, code block, table, image, figure, caption, blockquote.
- [x] ArticleFooter visual region contains share buttons and a Giscus placeholder.
- [x] No external script, font CDN, production CSS import, API call, or production runtime dependency exists.
- [x] Static marker check passed: 20 required markers found.
- [x] `git diff --check` passed for the prototype worktree.
- [x] `git status --short` contains only the prototype directory in this worktree.

## Responsive checks

- [x] Desktop viewport: 1440px wide; title, metadata and real article body are visible.
- [x] Mobile viewport: 390px wide; no clipping or horizontal overflow.
- [x] Narrow viewport: 360px wide; no horizontal overflow.
- [x] Narrow viewport: 320px wide; no horizontal overflow.
- [ ] 125% browser zoom was not run; optional and non-blocking.

Measured browser layout:

| Viewport | Scroll width | Overflow | Image | Required markers |
| --- | ---: | --- | --- | --- |
| 1440 × 1000 | 1425 | no | loaded | complete |
| 390 × 844 | 390 | no | loaded | complete |
| 360 × 844 | 360 | no | loaded | complete |
| 320 × 844 | 320 | no | loaded | complete |

## Component checks

- [x] Code block remains readable and scrolls locally when needed.
- [x] Table remains readable and scrolls locally when needed.
- [x] Figure image, caption and surrounding whitespace remain balanced.
- [x] Blockquote keeps readable contrast without becoming a card.
- [x] Share buttons expose visible hover/focus treatment in CSS.
- [x] Giscus placeholder is clearly identified as a non-networked prototype area.

## Evidence

- Desktop screenshot: `C:\Users\a3593\.codex\visualizations\2026\08\01\019fbb83-148e-7191-a196-c500005256f4\blog-kami-desktop-1440x1000.png`
- Mobile screenshot: `C:\Users\a3593\.codex\visualizations\2026\08\01\019fbb83-148e-7191-a196-c500005256f4\blog-kami-mobile-390x844.png`
- Additional narrow screenshots: same directory, `blog-kami-narrow-360x844.png` and `blog-kami-narrow-320x844.png`
- Browser console: no error or warning diagnostics observed.
- Static checks: passed.
