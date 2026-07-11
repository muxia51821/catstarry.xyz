from pathlib import Path
path = Path("D:/catstarry.xyz/GLOSSARY.md")
c = path.read_text(encoding="utf-8")

# 1. DESIGN.md: 9 sections -> 11 sections (added Motion + Imagery)
c = c.replace(
    "9 节标准格式（Visual Theme → Agent Prompt Guide）",
    "11 节标准格式（Visual Theme → Imagery，含 Motion Principles + 粒子星座 + 图片 Token）"
)

# 2. Add animation terms after frontend-rules.md
anim_terms = """
| **`.anim-fade-up`**  | CSS 动画工具类，元素进入视口时从下方 24px 淡入上浮，animation-timeline: view() 驱动 |
| **`.anim-stagger`**  | CSS 动画工具类，父容器子元素逐项错开淡入，基础延迟 80ms                     |
| **`.parallax-container`** | CSS 动画工具类，背景/前景层不同速率视差滚动                           |
| **`animation-timeline`**  | CSS 原生滚动驱动动画，view() 函数根据元素在视口中的位置控制动画进度              |
"""
c = c.replace(
    "各模块开发线程必须引用                                                     |",
    "各模块开发线程必须引用                                                     |" + anim_terms
)

path.write_text(c, encoding="utf-8")
print("Done. Lines:", len(c.splitlines()))