# Projects 上架流程

Projects 只保存独立项目的公开索引，不接管项目源码或项目自身部署。

## 四步流程

1. 复制 `src/data/projects/template.json`，填写项目的真实名称、说明、HTTPS URL、标签和日期。
2. 准备真实截图：建议 `1600×1000`、WebP、单文件不超过 350 KB，放入 `public/assets/projects/<projectId>.webp`。不得用行星图、空白图或生成占位图替代项目截图。
3. 运行 `npm run project:add -- <entry.json>`，再执行与本次改动相关的构建、Projects contract 与浏览器验收。
4. 由木下提交并推送 source change。Commit / push 只使 Projects entry 进入 repository / release flow；公开站点只有在对应 Site production deployment 完成并验证后才算上线。独立项目本身仍由自己的部署系统维护。

## 实质更新与 Feed

- 普通索引编辑、截图替换、构建、部署失败与重复部署不创建 Feed Footprint。
- 只有木下明确确认“这是一次值得公开记录的项目更新”时，才向该条目加入新的稳定 `updateId`。
- `npm run signal:footprint -- <payload.json>` 是独立的 Footprint ingest 操作，不随 commit、push 或 Site deployment 自动发生。正式写入前可以先使用 `--dry-run` 检查 candidate；实际写入需要当前任务明确授权，并提供对应 Feed API / ingest token 环境。
- 生产更新已经真实上线并确认后，再用该 `projectId`、`updateId` 和 event-time snapshot 写入 Projects Footprint。
- Footprint snapshot 的 canonical Feed destination 固定为 `/projects/`；进入 Projects 索引后，Project Card 继续使用各自的 external `project.url`。
- Feed Worker 以 `projects:<projectId>:<updateId>` 去重；旧项目与历史更新不回填。
