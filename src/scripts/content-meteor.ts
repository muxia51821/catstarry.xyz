const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

type Point = { x: number; y: number };
type Debris = Point & { vx: number; vy: number; life: number; maxLife: number };

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
  const trailColor = tokens.getPropertyValue('--cursor-meteor-trail').trim();
  const glowColor = tokens.getPropertyValue('--cursor-meteor-glow').trim();
  const headColor = tokens.getPropertyValue('--cursor-meteor-head').trim();
  const trailWidth = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-width')) || 1;
  const headRadius = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-head-radius')) || 5;
  const opacity = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-opacity')) || 0;
  const debrisOpacity = Number.parseFloat(tokens.getPropertyValue('--cursor-meteor-debris-opacity')) || 0;
  let width = 0;
  let height = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let visible = 0;
  let targetVisible = 0;
  let lastMove = 0;
  let lastFrame = 0;
  let frame = 0;
  const trail: Point[] = [];
  const debris: Debris[] = [];

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
    for (let index = 1; index < trail.length; index += 1) {
      const progress = index / trail.length;
      context.strokeStyle = colorWithAlpha(trailColor, progress * visible * opacity);
      context.lineWidth = trailWidth * progress;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(trail[index - 1].x, trail[index - 1].y);
      context.lineTo(trail[index].x, trail[index].y);
      context.stroke();
    }
    const radius = headRadius * visible;
    const glow = context.createRadialGradient(currentX, currentY, 0, currentX, currentY, radius);
    glow.addColorStop(0, colorWithAlpha(headColor, visible * opacity));
    glow.addColorStop(0.45, colorWithAlpha(glowColor, visible * opacity));
    glow.addColorStop(1, colorWithAlpha(glowColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(currentX, currentY, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorWithAlpha(headColor, visible * opacity);
    context.beginPath();
    context.arc(currentX, currentY, Math.min(1.25, radius * 0.28), 0, Math.PI * 2);
    context.fill();
    for (const particle of debris) {
      context.fillStyle = colorWithAlpha(trailColor, (particle.life / particle.maxLife) * debrisOpacity * visible);
      context.fillRect(particle.x, particle.y, 1, 1);
    }
  }

  function tick(now: number) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (now - lastMove > 90) targetVisible = 0;
    currentX += (targetX - currentX) * 0.38;
    currentY += (targetY - currentY) * 0.38;
    visible += (targetVisible - visible) * 0.22;
    if (targetVisible) {
      trail.push({ x: currentX, y: currentY });
      while (trail.length > 12) trail.shift();
    } else {
      trail.shift();
    }
    for (let index = debris.length - 1; index >= 0; index -= 1) {
      const particle = debris[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.life <= 0) debris.splice(index, 1);
    }
    draw();
    if (visible > 0.01 || targetVisible || debris.length) frame = requestAnimationFrame(tick);
    else frame = 0;
  }

  function begin() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!lastMove) {
      currentX = targetX;
      currentY = targetY;
    }
    lastMove = performance.now();
    targetVisible = 1;
    if (Math.random() < 0.018) {
      debris.push({ x: targetX, y: targetY, vx: -12 - Math.random() * 20, vy: -4 + Math.random() * 8, life: 0.16, maxLife: 0.16 });
    }
    begin();
  }

  function onLeave() {
    targetVisible = 0;
  }

  addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onLeave, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();

  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('mouseleave', onLeave);
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
