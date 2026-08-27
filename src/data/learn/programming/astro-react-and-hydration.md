---
slug: astro-react-and-hydration
title: "Astro、React 与 Hydration：页面如何变成可交互 UI"
track: programming
section: web-foundations
tags:
  - astro
  - react
  - rendering
  - hydration
  - dom
excerpt: "从 SSG、SSR、CSR 的生成位置与时间出发，分清 Astro、React、DOM、State 和 Hydration 在网页交互中的职责。"
---

网页已经显示出内容，不代表浏览器已经下载并运行了客户端 JavaScript。要理解一个页面为什么能交互，先要把“什么时候生成 UI”“浏览器里有什么对象”“什么时候接上事件处理”拆开。

浏览器如何先取得页面，可结合 [[domain-dns-http]] 阅读；本文从响应到达浏览器之后开始。

## SSG、SSR 与 CSR 回答不同问题

三种常见渲染描述关注的是 UI 在哪里、何时生成或更新：

| 模式 | 生成位置与时间 |
| --- | --- |
| 静态站点生成（SSG） | build 时预先生成 HTML。 |
| 服务器端渲染（SSR） | request 到来时由 server 生成 HTML。 |
| 客户端渲染（CSR） | browser 运行 JavaScript，在客户端生成或更新 UI。 |

同一网站可以同时包含这些模式。例如一页的基础文章可以在 build 时成为 HTML，只有局部交互区域再在浏览器中更新。

## Astro、React、JavaScript 与 CSS 不是同一层

在常见的 Astro 页面中，可以先这样分工：

```text
Astro       页面、路由、内容组织与渲染策略
React       UI component、State 与状态驱动的更新
JavaScript  程序逻辑与交互行为
CSS         视觉表现、布局、尺寸与响应式规则
```

React component 出现在 Astro 项目中，不自动表示浏览器必须运行 React。Astro 可以输出静态 HTML；只有需要浏览器端行为的 island 才需要相应的客户端 JavaScript。

## DOM 在 JavaScript 之前就存在

HTML 是文档标记；浏览器解析它后建立文档对象模型（Document Object Model，DOM）。静态 HTML 仍然有 DOM，并不需要 JavaScript 才“运行”。

事件（Event）是浏览器检测到的点击、输入或键盘操作等事实。JavaScript handler 可以响应事件，但事件本身不等于某个框架的 State。

State 是 UI 或 component 为确定当前界面而需要记住的信息。例如：

```text
isOpen = false
-> click event
-> isOpen = true
-> React updates the UI
```

## Hydration 把已有 UI 接上行为

Hydration 指客户端 JavaScript 将事件处理器和 State 逻辑连接到已有 HTML / DOM 的过程：

```text
HTML response
-> browser creates DOM
-> client JavaScript loads
-> hydration connects behavior
-> event changes state
-> UI updates
```

它不是“内容必须从客户端加载”的同义词。CSR 描述 browser 使用 JavaScript 生成或更新 UI；Hydration 描述把行为接到已经存在的 UI。两者相关，但不能互相替代。

## 参考

- [Astro: On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro: Islands architecture](https://docs.astro.build/en/concepts/islands/)
- [MDN: Client-side rendering](https://developer.mozilla.org/en-US/docs/Glossary/CSR)
- [MDN: Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [React: State — A Component's Memory](https://react.dev/learn/state-a-components-memory)
