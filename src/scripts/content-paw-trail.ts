const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const PAW_TRAIL = {
  size: 15,
  spacing: 53,
  lifetime: 977,
  triggerSpeed: 307,
  lateralOffset: 9,
  rotationJitter: 3,
  baseColor: '#2e58ef',
  topColor: '#6685ff',
  baseOpacity: 0.37,
  topOpacity: 0.10,
  topScale: 0.95,
} as const;

type PointerSample = {
  x: number;
  y: number;
  time: number;
};

function createContentPawTrail() {
  const root = document.createElement('div');
  root.className = 'content-paw-trail';
  root.setAttribute('aria-hidden', 'true');
  root.style.setProperty('--content-paw-size', `${PAW_TRAIL.size}px`);
  root.style.setProperty('--content-paw-lifetime', `${PAW_TRAIL.lifetime}ms`);
  root.style.setProperty('--content-paw-base-color', PAW_TRAIL.baseColor);
  root.style.setProperty('--content-paw-top-color', PAW_TRAIL.topColor);
  root.style.setProperty('--content-paw-base-opacity', String(PAW_TRAIL.baseOpacity));
  root.style.setProperty('--content-paw-top-opacity', String(PAW_TRAIL.topOpacity));
  root.style.setProperty('--content-paw-top-scale', String(PAW_TRAIL.topScale));
  document.body.appendChild(root);

  let previous: PointerSample | null = null;
  let qualifyingDistance = 0;
  let nextSide = 1;

  function spawnFootprint(x: number, y: number, unitX: number, unitY: number) {
    const normalX = -unitY;
    const normalY = unitX;
    const side = nextSide;
    nextSide *= -1;

    const jitter = (Math.random() * 2 - 1) * PAW_TRAIL.rotationJitter;
    const angle = Math.atan2(unitY, unitX) * 180 / Math.PI + 90 + jitter;

    const footprint = document.createElement('span');
    footprint.className = 'content-paw-footprint';
    footprint.style.left = `${x + normalX * side * PAW_TRAIL.lateralOffset}px`;
    footprint.style.top = `${y + normalY * side * PAW_TRAIL.lateralOffset}px`;
    footprint.style.setProperty('--content-paw-angle', `${angle}deg`);

    const base = document.createElement('span');
    base.className = 'content-paw-footprint__layer content-paw-footprint__layer--base';
    const top = document.createElement('span');
    top.className = 'content-paw-footprint__layer content-paw-footprint__layer--top';
    footprint.appendChild(base);
    footprint.appendChild(top);
    root.appendChild(footprint);
    footprint.addEventListener('animationend', () => footprint.remove(), { once: true });
  }

  function resetTracking() {
    previous = null;
    qualifyingDistance = 0;
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;

    const sample = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    if (!previous) {
      previous = sample;
      return;
    }

    const start = previous;
    previous = sample;
    const dx = sample.x - start.x;
    const dy = sample.y - start.y;
    const distance = Math.hypot(dx, dy);
    const elapsed = (sample.time - start.time) / 1000;
    if (distance <= 0 || elapsed <= 0) return;

    if (distance / elapsed < PAW_TRAIL.triggerSpeed) {
      qualifyingDistance = 0;
      return;
    }

    const unitX = dx / distance;
    const unitY = dy / distance;
    let cursorX = start.x;
    let cursorY = start.y;
    let remaining = distance;

    while (qualifyingDistance + remaining >= PAW_TRAIL.spacing) {
      const step = PAW_TRAIL.spacing - qualifyingDistance;
      cursorX += unitX * step;
      cursorY += unitY * step;
      remaining -= step;
      qualifyingDistance = 0;
      spawnFootprint(cursorX, cursorY, unitX, unitY);
    }

    qualifyingDistance += remaining;
  }

  addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', resetTracking, { passive: true });

  return () => {
    removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', resetTracking);
    root.remove();
    resetTracking();
  };
}

export function setupContentPawTrail() {
  const content = document.querySelector<HTMLElement>('[data-canvas="content"]');
  if (!content) return () => {};

  let teardown = () => {};

  function update() {
    teardown();
    teardown = finePointer.matches && !reducedMotion.matches
      ? createContentPawTrail()
      : () => {};
  }

  finePointer.addEventListener('change', update);
  reducedMotion.addEventListener('change', update);
  update();

  return () => {
    finePointer.removeEventListener('change', update);
    reducedMotion.removeEventListener('change', update);
    teardown();
  };
}
