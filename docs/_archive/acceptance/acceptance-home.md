# Home 星图入口验收清单

> 本清单描述用户可观察的 Home 验收行为。星球材质、豹猫、HAS 与 Cursor Meteor 的视觉合同以 current `DESIGN.md` 为准；selector、runtime 参数与实现方式以 current source / tests 为准。清单条目是验收标准，不表示任意未来 HEAD 已经完成验收或部署。

## 1. 宇宙入口

- [ ] 打开 catstarry.xyz，第一眼进入的是宇宙入口，不是 about 卡片、内容列表或混合时间线。
- [ ] 首屏能让访客理解可继续滚动，或可点击「DISCOVER MORE」继续探索。
- [ ] 首次滚动后，访客从远处接近同一片星域；2–3 个滚动阶段只表达空间纵深，不暗示栏目重要性。
- [ ] 远处的抽象星点在接近后逐步显现为具有体积、光照和不同地貌的完整星球，而不是永久的发光圆点或分类按钮。
- [ ] 首次滚动后出现低音量的侧边航行索引，可定位 Home 阶段，但不替代全站导航。

## 2. 自由星图总览

- [ ] 接近完成后出现 About、Blog、Feed、Learn、Projects 五颗自由分布的星球。
- [ ] Drift 构图保持稳定语义区域：About 在右上远端，Blog 在左上，Feed 位于更容易接近的中右区域，Projects 在左下，Learn 在右下。
- [ ] 星球可在各自语义区域内做少量人工编排变化，但不会在每次打开页面时随机换位；豹猫星座始终跟随 About。
- [ ] 总览能看见五颗星球的完整全貌；聚焦或推进时能看到同一材质体系的高细节局部。
- [ ] 星球名称在总览时若隐若现；鼠标悬停或键盘聚焦时，名称和可进入状态更清楚。
- [ ] 星图默认保持静态，不自动循环旋转、自动巡航或持续改变焦点。
- [ ] 星球仅作为对应板块的入口与状态索引；Home 不展示文章、项目、笔记或时间线卡片。

## 3. 进入与导航

- [ ] 星图总览后可继续自然滚动，依次观察 About、Feed、Blog、Projects、Learn 的单星 Focus；该顺序不表达栏目重要性，也不限制直接跳转。
- [ ] 点击、键盘触发或航行索引选择任一星球，可从总览直接进入该星球 Focus，不必先经过其他星球。
- [ ] 每个 Focus 只显示星球近景、同源材质细节、标题、极短说明和 action，不加载对应板块内容。
- [ ] 在 Blog、Feed、Learn 或 Projects Focus 中触发 action 后，才短暂推进并进入对应功能页面；不需要第三次确认。
- [ ] 每颗星球、Focus action 与返回入口均可用键盘聚焦和触发。
- [ ] 首次滚动后的侧边航行索引能回到 Home 的入口、接近和星图阶段。
- [ ] 页面自然结束后进入页脚，不出现 Home 的 Recently 区块或内容瀑布流。

## 4. About 星球

- [ ] About 是星图中的一部分，不是中心天体、首屏卡片或独立信息流。
- [ ] 从总览点击 About 星球或文字标签后，镜头轻推近并连续在 Home 原地展开介绍，不要求额外确认，也不跳转至独立 About 页面。
- [ ] 自然滚动进入 About Focus 时，可通过明确 action 进入同一个 About 展开态。
- [ ] 豹猫星座作为可选彩蛋：Desktop 第一次独立点击进入蓄能，再次点击后仅豹猫粒子局部爆开，并进入同一 About 展开态；这不是 browser `dblclick`。Touch 可按 current Design 直接进入。
- [ ] About 展开态可关闭，并恢复到星图状态；关闭后焦点回到合理的触发位置。
- [ ] 关闭由豹猫彩蛋打开的 About 后，粒子反向回收并恢复豹猫星座；它不改变 About 作为普通星图成员的层级。

## 5. 非目标与数据边界

- [ ] Home 不请求或展示混合时间线、五源内容聚合、类型筛选、内容分页或无限滚动。
- [ ] Home 不展示 Public Timeline / Public Footprint 内容；这些内容属于 Feed。
- [ ] 草稿、隐藏来源和普通维护编辑不会以任何内容卡片形式进入 Home；Activity Signal 只反映符合 current source eligibility 的公开活动。

## 6. 星球活动信号

- [ ] Blog、Feed、Learn、Projects 星球只显示“活跃、稳定、沉寂”之一的低音量活动状态；Home 不显示任何活动内容。
- [ ] 最近 7 天内有符合规则的公开活动时，对应星球为活跃；超过 7 天且不超过 60 天时为稳定；超过 60 天或没有合资格公开活动时为沉寂。
- [ ] Feed 星球参考公开碎碎念、剪藏和合资格 Public Footprint；Blog、Learn、Projects 星球只参考各自符合 current publication / visibility rules 的公开事件。
- [ ] 活动状态不是访客未读提醒；不会显示事件数量、发布时间、标题、正文、摘要或列表。
- [ ] About 不参与活动状态；豹猫星座不是活动信号。
- [ ] 活动卫星是有暗面、边缘光和不完整开放轨道的微小天体，不是每颗星球旁相同的蓝色通知点。
- [ ] Active / stable 卫星可沿低频圆形或椭圆路径完整公转，并在经过主星前后时呈现正确遮挡关系；stable 的能量、尺度和运动强度弱于 active；dormant 保持更低能量的静态状态但仍可辨认。
- [ ] Hover / keyboard focus 可以提供克制的 attention response，但活动卫星不得自动聚焦、诱导点击、持续闪烁或抢占主星视角。
- [ ] Activity Signal projection 缺失、过期、请求失败或无效时，四颗功能星球都不显示活动卫星；不得将不可用状态伪装成沉寂。

## 7. 可访问性与设备适配

- [ ] 使用触控设备时，悬停所承载的关键信息可通过点按获得。
- [ ] 启用“减少动态效果”后，滚动与进入动效降级，不阻碍导航或阅读。
- [ ] 启用“减少动态效果”后，活动卫星停止连续公转与装饰性 pulse，但三态仍能通过静态材质、轨道残留和可访问状态区分。
- [ ] 精细指针设备上，Home Cursor Meteor 清晰但克制；reduced-motion 或不适合的 pointer environment 下关闭，不影响任何 required interaction。
- [ ] 手机、平板与桌面端均能完成星图浏览、进入板块和 About 展开。

## 8. 星球 selected assets

- [ ] 五颗星球的 Overview / Focus / Mobile selected assets 分别读出已确认主地貌，并保持同一星球 identity、主光方向、主地貌和校色，不出现明显换图感。
- [ ] selected assets 通过集中 asset path 接入；资源组织或性能调整不改变 Star Map、Focus、action 与星球 identity contract。
- [ ] 页面实际加载 selected assets 时不存在明显首帧占位残留、错误资源切换或破坏导航的加载失败。
- [ ] 资源优先级、移动端降级和高分辨率加载不会造成不可接受的 LCP / CLS，也不会迫使用户等待全部高细节资源后才能导航。

## 9. SEO

- [ ] 首页标题、描述和社交分享预览表达 catstarry 的宇宙入口 / 星图身份，而不是数字生活混合时间线。
- [ ] sitemap.xml 保留首页。
