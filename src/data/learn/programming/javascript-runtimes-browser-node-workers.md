---
slug: javascript-runtimes-browser-node-workers
title: "JavaScript 运行时：Browser、Node.js 与 Workers 的能力边界"
track: programming
section: web-foundations
tags:
  - javascript
  - runtime
  - browser
  - nodejs
  - cloudflare-workers
excerpt: "同一种 JavaScript 语言可以运行在不同环境中；可用 API、数据边界和适合承担的职责由 runtime 决定。"
---

“这段代码也是 JavaScript，为什么不能放到这里运行？”通常不是语言问题，而是运行时问题。

同一种语言不等于同一个 runtime，更不等于拥有相同 API 或数据访问权限。

## 先区分语言、运行时与工具

以下几层很容易混在一起：

```text
JavaScript / TypeScript  编程语言
Browser / Node.js / Workers 运行时环境
Astro / React            framework or UI library
npm                      tooling
package.json             项目元数据
```

语言描述代码如何表达；runtime 决定代码实际执行在哪里、有哪些宿主 API，以及哪些能力不应直接暴露给它。

## Browser runtime 面向页面与用户交互

浏览器中的 JavaScript 可以处理页面交互，典型地会接触 DOM、`document`、`window` 和事件。它适合响应用户动作并更新界面。

但浏览器代码运行在用户设备上。数据库凭证或直接数据库连接不应因此暴露给它。浏览器通常通过 HTTP API 请求 server-side code：

```text
Browser
-> API request
-> Worker or server-side handler
-> database or storage
-> response
```

## Node.js 常用于开发、构建与本地脚本

Node.js 是浏览器之外的 JavaScript runtime。项目中的构建工具、测试、内容校验和许多命令行脚本都可在 Node.js 中运行。

Node.js 不是浏览器的替身：是否存在某个 API，仍取决于它的 runtime 与项目提供的依赖，而不是文件扩展名是 `.js`。

## Workers 面向 request handling 与受控服务端能力

Cloudflare Workers 运行在 server-side runtime 中，常用于处理 HTTP `Request` / `Response`，并通过明确配置的 bindings 访问 D1、KV、R2 或 secrets。

它不是 browser context，因此不能把 `document.querySelector(...)` 当作可用的页面 API。反过来，浏览器代码也不应直接取得 Worker 的敏感 bindings。

这种边界不是限制功能，而是把用户界面、请求处理和数据访问放在各自适合且可控的位置。

## 遇到 runtime 错误时先问什么

当某段 JavaScript 报“API 不存在”或数据访问失败时，先检查：

1. 代码正在 Browser、Node.js 还是 Worker 中运行？
2. 这个 API 是语言标准能力，还是某个 runtime 提供的宿主 API？
3. 需要的网络、存储或 secret binding 是否只应留在 server-side？

先回答这三点，通常比立刻换库或复制代码更容易定位问题。

## 参考

- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Node.js documentation](https://nodejs.org/docs/latest/api/)
- [Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
