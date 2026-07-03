# 部署指南 (DEPLOY)

> catstarry.xyz 项目的部署步骤。适用于首次部署和后续更新。

---

## 1. Cloudflare Pages（主站）

主站通过 Cloudflare Pages 托管，自动连接 GitHub 仓库。

| 配置项 | 值 |
|--------|-----|
| **GitHub 仓库** | `muxia51821/catstarry.xyz` |
| **构建命令** | `npm install && npm run build` |
| **输出目录** | `dist` |
| **框架预设** | Astro |

**部署方式**：Git push 到主分支后，Cloudflare Pages 自动触发构建和部署。无需手动操作。

---

## 2. Workers（feed-api）

`workers/feed-api/` 目录下的 Cloudflare Worker。

**部署命令**：

```bash
cd workers/feed-api
npx wrangler deploy
```

**绑定资源**：

| 绑定名 | 类型 | 资源名 |
|--------|------|--------|
| `DB` | D1 | `feed-db` |
| `VIEW_KV` | KV | `VIEW_KV` |

> 绑定已在 `wrangler.toml` 中配置，部署时自动关联。

---

## 3. DNS 配置

| 记录类型 | 名称 | 目标 | 代理状态 |
|----------|------|------|----------|
| CNAME | `catstarry.xyz` | `catstarry-xyz.pages.dev` | Proxied |

> 在 Cloudflare DNS 面板中配置，代理状态保持 Proxied（橙色云朵）以启用 CF 的 CDN 和安全功能。

---

## 4. 环境变量

当前无需额外配置环境变量。Pages 和 Workers 均使用默认设置。

如需新增，在 Cloudflare Dashboard 对应项目设置中添加。

---

## 更新记录

- 2026-07-04：初始版本
