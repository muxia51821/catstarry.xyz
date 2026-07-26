# Projects 上架流程

Projects 只保存独立项目的公开索引，不接管项目源码或部署。

## 四步流程

1. 复制 `src/data/projects/template.json`，填写项目的真实名称、说明、HTTPS URL、标签和日期。
2. 准备真实截图：建议 `1600×1000`、WebP、单文件不超过 350 KB，放入 `public/assets/projects/<projectId>.webp`。不得用行星图、空白图或生成占位图替代项目截图。
3. 运行 `npm run project:add -- <entry.json>`，再执行构建、路由与浏览器验收。
4. 由木下提交并推送；Cloudflare Pages 自动部署索引。项目仍由自己的部署系统维护。

## 实质更新与 Feed

- 普通索引编辑、截图替换、构建、部署失败与重复部署不创建 Feed 足迹。
- 只有木下明确确认“这是一次实质更新”时，才向该条目加入新的稳定 `updateId`。
- 生产更新确认后，用该 `projectId`、`updateId` 和创建时快照运行 `npm run signal:footprint -- <payload.json>`，并设置 `EXPLICIT_FOOTPRINT_CONFIRMATION=true`。
- Feed Worker 以 `projects:<projectId>:<updateId>` 去重；旧项目与历史更新不回填。
