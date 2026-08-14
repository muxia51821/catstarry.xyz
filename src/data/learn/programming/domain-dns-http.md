---
slug: domain-dns-http
title: "域名、DNS 与 HTTP：浏览器如何找到 catstarry.xyz"
track: programming
section: web-foundations
tags:
  - web
  - dns
  - http
  - browser
excerpt: "从 URL、DNS、HTTPS 到 HTTP Request / Response，理解浏览器访问 catstarry.xyz 时最基础的一条 Web 请求链。"
---

我以前每天都会输入网址，却没有认真想过一个很基础的问题：

**在浏览器里输入 `https://catstarry.xyz/learn/` 之后，浏览器到底做了什么？**

以前我会很笼统地理解成“浏览器访问服务器，然后服务器把网站发回来”。这当然不算完全错，但里面其实把域名、DNS、HTTPS、请求和网页混成了一件事。

把这条链路拆开以后，我发现理解网站故障也容易了很多。

最基础的一次网页访问，可以先记成：

```text
URL
↓
DNS
↓
建立 HTTPS 连接
↓
HTTP Request
↓
服务器处理
↓
HTTP Response
↓
Browser
```

这篇只解释这条最基础的链。

---

## 先从地址栏里的 URL 开始

以这个地址为例：

```text
https://example.com/learn/
```

暂时只需要认识三个部分：

```text
https://          协议 / Scheme
example.com        域名 / Domain
/learn/           路径 / Path
```

它们回答的是不同问题。

`https` 告诉浏览器应该使用什么通信方式。

`example.com` 告诉浏览器我要访问哪个域名。

`/learn/` 则进一步指出，我希望访问这个域名下面的哪个资源或路径。

这里有一个容易产生误解的地方：**Path 不一定对应服务器上的真实文件夹。**

今天的 Web 应用经常根据 `/learn/`、`/api/feed` 这样的路径决定用哪段程序处理请求，而不是简单地去硬盘里寻找一个同名目录。

---

## DNS 不是“网站存放在哪里”

知道域名之后，浏览器仍然面临一个问题：

> `example.com` 到底应该去哪里找？

这就是域名系统（Domain Name System，DNS）参与的地方。

对于刚开始理解 Web 的人，可以先把 DNS 记成：

```text
域名
↓
DNS
↓
找到对应的网络目标或地址信息
```

这有点像通讯录。

我记住的是一个人的名字，但真正拨打电话时，需要的是电话号码。

同样，我比较容易记住：

```text
example.com
```

而网络需要能够把请求送向正确的目标。

但 DNS **不会返回网页内容**。

它不负责生成 HTML，也不负责登录认证，更不会替网站查询数据库。

它解决的核心问题只是：

> 这个域名的请求应该往哪里去？

现实中的 DNS、CDN 和代理网络会比这张图复杂得多。对于理解一次基本网页访问，先建立“域名 → 网络目标”这层模型已经够用了。

---

## HTTPS 不是“比较新的 HTTP”

我以前对 HTTP 和 HTTPS 的区别也很模糊，一度把 HTTPS 理解成一种更新、兼容性更好的 HTTP。

这个理解并不准确。

HTTP（Hypertext Transfer Protocol）是 Web 中客户端和服务器交换请求与响应的一套协议。

HTTPS 可以先理解为：

```text
HTTP
+
加密连接
+
服务器身份验证
```

因此：

```text
https://example.com
```

不只是告诉浏览器“访问这个域名”，同时也要求这次 Web 通信通过安全连接进行。

这里不需要马上理解 TLS、证书链或者握手过程。

对日常判断来说，先知道：

> HTTPS 的主要区别在安全通信，而不是简单的新旧版本。

就足够了。

---

## 浏览器真正发送的是 Request

DNS 帮浏览器找到方向、连接建立以后，浏览器才能真正提出：

> 我想要 `/learn/`。

这就是一次 HTTP Request（请求）。

一个非常简化的请求可以想象成：

```text
GET /learn/
```

`GET` 可以暂时理解为：

> 我要读取这个资源。

浏览器是 Client（客户端）。

处理这个请求的一侧是 Server（服务器端）。

所以最基本的关系是：

```text
Browser / Client
↓
HTTP Request
↓
Server
```

服务器收到请求以后会执行对应的处理逻辑，然后给出一个结果。

这个结果叫：

**HTTP Response（响应）。**

---

## Response 不等于“网页”

服务器的 Response 里通常会包含状态信息以及可能存在的 Body。

例如：

```text
200 OK
```

表示这次请求成功处理。

Body 可能是一份 HTML：

```html
<h1>Learn</h1>
<p>...</p>
```

但 HTTP Response 并不只能返回网页。

它也可能返回：

```text
HTML
CSS
JavaScript
JSON
图片
字体
文件
错误信息
```

所以更准确的模型是：

```text
Browser
↓ Request
Server
↓ Response
Browser
```

而不是：

```text
Browser
↓
服务器
↓
整个网站
```

HTTP 本身处理的是一次又一次独立的请求和响应。

---

## 打开一个页面，通常不只发送一个 Request

这是我以前没有明确意识到的一点。

假设第一次 Response 返回了 HTML，其中写着：

```html
<link href="/styles.css">
<script src="/app.js"></script>
<img src="/planet.webp">
```

浏览器读取 HTML 后，会发现：

> 这个页面还需要 CSS。

于是再发送 Request。

> 还需要 JavaScript。

再发送 Request。

> 还需要一张图片。

继续发送 Request。

最终可能形成：

```text
GET /learn/
GET /styles.css
GET /app.js
GET /planet.webp
...
```

如果页面还需要动态数据，它甚至可能继续调用 API。

所以：

> **打开一个网页，不等于浏览器向服务器请求一次，然后把“网站”整体下载回来。**

更接近事实的是：

> 浏览器先取得一个资源，再根据已经得到的内容继续发现并请求其他资源，最终组合成我们看到的页面。

---

## 把一个网站放回这条链

忽略项目内部更复杂的实现以后，可以把一次访问先简化为：

```text
Browser
↓
输入 https://example.com/learn/
↓
解析 URL
↓
DNS
↓
建立 HTTPS 连接
↓
HTTP Request
↓
这个域名背后的 Web 服务体系
↓
HTTP Response
↓
Browser
↓
继续取得页面需要的其他资源
↓
显示页面
```

真实站点的 CDN、路由和不同程序如何处理请求，属于下一层。

对于理解最基础的一次 Web 访问，现在最重要的是先把：

```text
域名
DNS
HTTPS
Request
Response
Browser
```

放在正确的位置。

---

## 为什么我觉得这件事值得弄清楚

这些概念看起来很基础，但它们会直接改变判断网站故障的方式。

例如网站无法打开时，以前我可能只会说：

> 网站坏了。

现在至少可以继续追问：

```text
域名能不能解析？
HTTPS 连接有没有建立？
Request 有没有发出去？
服务器有没有返回 Response？
返回的是 200、404 还是 500？
HTML 回来了以后，是不是某个其他资源加载失败？
```

问题没有因此自动解决。

但“网站坏了”开始变成了一条可以逐层检查的链路。

这也是我现在认为非程序员在使用 AI 和 Codex 维护 Web 产品时，真正值得理解的东西：

不一定要自己写出整套系统，但至少要知道**一次请求正在经过什么，以及问题可能断在哪里**。

---

## 一张最后的速查图

```text
https://example.com/learn/
│
├─ https://          → 使用 HTTPS
├─ example.com        → Domain
└─ /learn/           → Path

Domain
↓
DNS
↓
网络目标
↓
HTTPS connection
↓
HTTP Request
↓
Server
↓
HTTP Response
↓
Browser
↓
继续请求 CSS / JS / Images / API ...
↓
最终页面
```

如果只保留一句话：

> **浏览器访问网站，本质上不是“打开一个网站文件”，而是通过网络不断请求资源，并根据服务器返回的 Response 组合出最终页面。**

---

## 参考资料

通用 Web 概念主要参考：

* [MDN — How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
* [MDN — Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)
* [MDN — URI schemes](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes)
* [MDN — URI path](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Path)

本文只覆盖最基础的浏览器访问链路；CDN、应用路由、API 和数据层留到后续内容。
