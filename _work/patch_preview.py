from pathlib import Path

path = Path("D:/catstarry.xyz/_archive/catstarry-preview-4.html")
content = path.read_text(encoding="utf-8")
print("Read OK, lines:", len(content.splitlines()))

# 1. Font fix
content = content.replace(
    '--font-display: "Inter", "HarmonyOS Sans SC", sans-serif;',
    '--font-display: "IBM Plex Sans", "Geist", "HarmonyOS Sans SC", sans-serif;'
)
content = content.replace(
    '--font-body: "Inter", "HarmonyOS Sans SC", system-ui, sans-serif;',
    '--font-body: "Geist", "HarmonyOS Sans SC", system-ui, sans-serif;'
)

# 2. Particle count 80 -> 160
content = content.replace(
    "for (let i = 0; i < 80; i++) particles.push(new Particle());",
    "for (let i = 0; i < 160; i++) particles.push(new Particle());"
)

# 3. data-canvas
content = content.replace(
    '<div class="page-home" id="page-home">',
    '<div class="page-home" id="page-home" data-canvas="home">'
)
content = content.replace(
    '<div class="page-finance hidden" id="page-finance">',
    '<div class="page-finance hidden" id="page-finance" data-canvas="finance">'
)

# 4. CJK rule in style (after "body {")
cjk = "\n/* CJK typography */\n:lang(zh) { line-height: 1.85; }\n.cjk-mixed { line-height: 1.85; }\n"
idx = content.find("body {")
if idx != -1:
    end = content.index("{", idx) + 1
    content = content[:end] + cjk + content[end:]

# 5. Anim CSS before closing style
anim = """
/* === Anim Utilities (Phase 4.2) === */
.anim-fade-up {
  opacity: 0;
  transform: translateY(24px);
  animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-timeline: view(y 95% 0%);
}
@keyframes fade-up {
  to { opacity: 1; transform: translateY(0); }
}
.anim-stagger > * {
  opacity: 0;
  transform: translateY(16px);
  animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-timeline: view(y 95% 0%);
}
.anim-stagger > *:nth-child(1) { animation-delay: 0ms; }
.anim-stagger > *:nth-child(2) { animation-delay: 80ms; }
.anim-stagger > *:nth-child(3) { animation-delay: 160ms; }
.anim-stagger > *:nth-child(4) { animation-delay: 240ms; }
.anim-stagger > *:nth-child(5) { animation-delay: 320ms; }
.anim-stagger > *:nth-child(6) { animation-delay: 400ms; }
@media (prefers-reduced-motion: reduce) {
  .anim-fade-up, .anim-stagger > * {
    opacity: 1; transform: none; animation: none;
  }
}
"""
content = content.replace("</style>", anim + "\n</style>")

# 6. anim-stagger on timeline section
content = content.replace(
    '<section class="timeline-section">',
    '<section class="timeline-section anim-stagger">'
)

# 7. anim-stagger on blog grid
content = content.replace(
    '<section class="blog-grid">',
    '<section class="blog-grid anim-stagger">'
)

# 8. About card placeholder
about = """  <section class="about-section anim-fade-up" id="about-card">
    <div class="about-card" style="max-width:1078px;margin:0 auto 120px;padding:48px 32px;background:var(--home-surface-card);border-radius:var(--radius-home);position:relative;overflow:hidden;cursor:pointer;">
      <div class="about-avatar" style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--klein-400),var(--particle-glow));margin-bottom:24px;"></div>
      <h2 style="font-family:var(--font-display);font-size:28px;font-weight:300;color:var(--home-text-primary);margin-bottom:12px;">About</h2>
      <p style="font-size:16px;line-height:1.85;color:var(--home-text-secondary);max-width:600px;">Phase 4.3 placeholder</p>
    </div>
  </section>

"""
marker = "<!-- ==================== PAGE: BLOG"
content = content.replace(marker, about + marker)

path.write_text(content, encoding="utf-8")
print("Done. Lines:", len(content.splitlines()))