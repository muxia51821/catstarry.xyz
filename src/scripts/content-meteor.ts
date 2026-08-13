const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function colorWithAlpha(color: string, alpha: number) {
  return color.replace(/rgba?\((.*)\)/, (_match, channels) => {
    const rgb = channels.split(/[\s,/]+/).slice(0, 3).join(' ');
    return `rgb(${rgb} / ${Math.max(0, alpha).toFixed(3)})`;
  });
}

function createContentMeteor(content: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'content-meteor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) {
    canvas.remove();
    return () => {};
  }
  const context = canvasContext;

  const tokens = getComputedStyle(content);
  const glowColor = tokens.getPropertyValue('--cursor-meteor-glow').trim();
  const headColor = tokens.getPropertyValue('--cursor-meteor-head').trim();
  const headRadius = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-head-radius')) || 5;
  const opacity = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-opacity')) || 0;
  let width = 0;
  let height = 0;
  let pointX = 0;
  let pointY = 0;
  let visible = 0;
  let lastFrame = 0;
  let frame = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    if (!visible) return;
    const radius = headRadius * visible;
    const glow = context.createRadialGradient(pointX, pointY, 0, pointX, pointY, radius);
    glow.addColorStop(0, colorWithAlpha(headColor, visible * opacity));
    glow.addColorStop(0.45, colorWithAlpha(glowColor, visible * opacity));
    glow.addColorStop(1, colorWithAlpha(glowColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(pointX, pointY, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorWithAlpha(headColor, visible * opacity);
    context.beginPath();
    context.arc(pointX, pointY, Math.min(1.25, radius * 0.28), 0, Math.PI * 2);
    context.fill();
  }

  function tick(now: number) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    visible = Math.max(0, visible - dt * 5.5);
    draw();
    if (visible > 0.01) frame = requestAnimationFrame(tick);
    else frame = 0;
  }

  function begin() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    pointX = event.clientX;
    pointY = event.clientY;
    visible = 1;
    begin();
  }

  addEventListener('pointerdown', onPointerDown, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();

  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('pointerdown', onPointerDown);
    removeEventListener('resize', resize);
    canvas.remove();
  };
}

export function setupContentMeteor() {
  const content = document.querySelector<HTMLElement>('[data-canvas="content"]');
  if (!content) return;
  const contentCanvas = content;
  let teardown = () => {};

  function update() {
    teardown();
    teardown = finePointer.matches && !reducedMotion.matches
      ? createContentMeteor(contentCanvas)
      : () => {};
  }

  finePointer.addEventListener('change', update);
  reducedMotion.addEventListener('change', update);
  update();
}
