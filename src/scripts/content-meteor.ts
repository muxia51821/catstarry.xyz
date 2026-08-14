const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const CLICK_FEEDBACK = {
  coreRadius: 1.4,
  coreOpacity: 0.82,
  coreLifetime: 190,
  echoStartRadius: 3,
  echoEndRadius: 11,
  echoOpacity: 0.14,
  echoLifetime: 500,
} as const;

function colorWithAlpha(color: string, alpha: number) {
  return color.replace(/rgba?\((.*)\)/, (_match, channels) => {
    const rgb = channels.split(/[\s,/]+/).slice(0, 3).join(' ');
    return `rgb(${rgb} / ${Math.max(0, alpha).toFixed(3)})`;
  });
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
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
  let width = 0;
  let height = 0;
  let pointX = 0;
  let pointY = 0;
  let startedAt = 0;
  let frame = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(elapsed: number) {
    context.clearRect(0, 0, width, height);
    if (elapsed >= CLICK_FEEDBACK.echoLifetime) return;

    const echoProgress = Math.min(elapsed / CLICK_FEEDBACK.echoLifetime, 1);
    const echoFade = 1 - echoProgress;
    const echoRadius = CLICK_FEEDBACK.echoStartRadius
      + (CLICK_FEEDBACK.echoEndRadius - CLICK_FEEDBACK.echoStartRadius) * easeOutCubic(echoProgress);
    const echo = context.createRadialGradient(pointX, pointY, 0, pointX, pointY, echoRadius);
    echo.addColorStop(0, colorWithAlpha(glowColor, CLICK_FEEDBACK.echoOpacity * echoFade * 0.18));
    echo.addColorStop(0.42, colorWithAlpha(glowColor, CLICK_FEEDBACK.echoOpacity * echoFade));
    echo.addColorStop(1, colorWithAlpha(glowColor, 0));
    context.fillStyle = echo;
    context.beginPath();
    context.arc(pointX, pointY, echoRadius, 0, Math.PI * 2);
    context.fill();

    const coreProgress = Math.min(elapsed / CLICK_FEEDBACK.coreLifetime, 1);
    if (coreProgress < 1) {
      context.fillStyle = colorWithAlpha(headColor, CLICK_FEEDBACK.coreOpacity * (1 - coreProgress));
      context.beginPath();
      context.arc(pointX, pointY, CLICK_FEEDBACK.coreRadius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function tick(now: number) {
    const elapsed = now - startedAt;
    draw(elapsed);
    if (elapsed < CLICK_FEEDBACK.echoLifetime) frame = requestAnimationFrame(tick);
    else frame = 0;
  }

  function begin() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    pointX = event.clientX;
    pointY = event.clientY;
    startedAt = performance.now();
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
