---
slug: content-canvas-and-accessibility
title: "Content 画布与可访问性"
track: programming
section: 项目基础
tags: ["Content Canvas", "CJK", "可访问性", "键盘", "reduced-motion"]
draft: false
publishDate: 2026-07-18
lastModified: 2026-07-24
excerpt: "记录内容页的 Cream Gallery 语境，以及 CJK、键盘、触控和动效降级约束。"
parentSlug: site-context-and-terms
sourceUrl: "https://raw.githubusercontent.com/muxia51821/catstarry.xyz/main/DESIGN.md"
---

## Content / Cream Gallery

Blog、Feed、Learn、Projects 继续使用 Cream Gallery 的现有功能布局。星球只是入口与材质母题，内容本身始终是主角。

### CJK 优先

中文正文字号 ≥16px，行高 ≥1.85；标点挤压使用 `text-spacing-trim` 与 `hanging-punctuation`；中英混排保留 1/4em 间距。

### 内容页面的边界

Content 页面不出现完整行星、星图滚动、3D 飞行或宇宙背景，只低剂量借用地质材质和光学残响。

## Learn 与 Projects 的表达

Learn 可借断层、刻线或矿脉关系表达章节与进度；Projects 可借台地、切面与嵌线表达项目状态和结构。

### 交互验证

键盘焦点、触控尺寸与 `prefers-reduced-motion` 是内容页必须保留的交互约束。实现时可回看 [[site-context-and-terms]] 与 [[vibe-coding-mission]]。

```html
<main data-canvas="content">...</main>
```
