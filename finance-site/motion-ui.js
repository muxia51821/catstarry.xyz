(() => {
  const motionApp = document.querySelector('[data-app]');
  const motionDashboard = document.querySelector('[data-dashboard]');
  const tabs = document.querySelector('.finance-tabs');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!motionApp || !motionDashboard || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  let appReady = false;
  let paneAnimation;
  let allocationPin;

  function visible(selector, parent = document) {
    return [...parent.querySelectorAll(selector)].filter((node) => !node.hidden && node.getClientRects().length > 0);
  }

  function animateHero() {
    const hero = document.querySelector('[data-motion-hero]');
    if (!hero) return;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .from(hero.querySelector('.eyebrow'), { y: 10, opacity: 0, duration: .45 })
      .from(hero.querySelector('h1'), { y: 18, opacity: 0, duration: .64 }, '-=.26')
      .from(hero.querySelector('.header-copy'), { y: 10, opacity: 0, duration: .46 }, '-=.38')
      .from(hero.querySelector('.session-tools'), { y: 12, opacity: 0, duration: .48 }, '-=.4')
      .from(tabs, { y: 9, opacity: 0, duration: .46 }, '-=.32');
  }

  function animateVisiblePane() {
    paneAnimation?.kill();
    const panels = visible('[data-pane]');
    if (!panels.length) return;
    paneAnimation = gsap.fromTo(panels,
      { y: 24, opacity: 0, scale: .992 },
      { y: 0, opacity: 1, scale: 1, duration: .62, stagger: .035, ease: 'power3.out', clearProps: 'transform,opacity' });
    window.setTimeout(() => ScrollTrigger.refresh(), 60);
  }

  function animateChart() {
    const paths = visible('.net-worth-chart path');
    for (const path of paths) {
      const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
      if (!length || path.classList.contains('net-worth-area')) continue;
      gsap.fromTo(path,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.05, ease: 'power2.out' });
    }
    const dots = visible('.net-worth-dot');
    if (dots.length) {
      gsap.fromTo(dots,
        { scale: 0, transformOrigin: 'center' },
        { scale: 1, duration: .52, stagger: .06, ease: 'back.out(1.7)' });
    }
  }

  function installAllocationPin() {
    allocationPin?.kill();
    allocationPin = null;
    if (window.innerWidth < 1180) return;
    const allocation = document.querySelector('[data-portfolio-allocation]');
    const header = allocation?.querySelector('.panel-header');
    if (!allocation || !header || allocation.hidden) return;
    allocationPin = ScrollTrigger.create({
      trigger: allocation,
      start: 'top 92px',
      end: 'bottom 48%',
      pin: header,
      pinSpacing: false,
      anticipatePin: 1,
    });
  }

  function installCardPhysics() {
    for (const card of document.querySelectorAll('.metric, .panel')) {
      if (card.dataset.motionPhysics !== undefined) continue;
      card.dataset.motionPhysics = '';
      const moveX = gsap.quickTo(card, '--pointer-x', { duration: .35, ease: 'power2.out' });
      const moveY = gsap.quickTo(card, '--pointer-y', { duration: .35, ease: 'power2.out' });
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        moveX(`${((event.clientX - bounds.left) / bounds.width) * 100}%`);
        moveY(`${((event.clientY - bounds.top) / bounds.height) * 100}%`);
      });
    }
  }

  function installActivityCarouselStatus() {
    const panel = document.querySelector('[aria-labelledby="overview-trades-title"]');
    const header = panel?.querySelector('.panel-header');
    const rail = panel?.querySelector('[data-overview-trades]');
    if (!header || !rail || header.querySelector('[data-carousel-status]')) return;

    const status = document.createElement('span');
    status.className = 'data-state activity-carousel-status';
    status.dataset.carouselStatus = '';
    status.setAttribute('aria-live', 'polite');
    header.append(status);

    const updateStatus = () => {
      const cards = [...rail.querySelectorAll('.overview-trade')];
      if (!cards.length) {
        status.hidden = true;
        return;
      }
      status.hidden = false;
      const current = cards.reduce((closest, card, index) => {
        const distance = Math.abs(card.offsetLeft - rail.scrollLeft);
        return distance < closest.distance ? { index, distance } : closest;
      }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
      status.textContent = `${current === 0 ? 'NEW' : current + 1} / ${cards.length}`;
    };
    rail.addEventListener('scroll', updateStatus, { passive: true });
    new ResizeObserver(updateStatus).observe(rail);
    new MutationObserver(updateStatus).observe(rail, { childList: true });
    updateStatus();
  }

  function refreshMotion() {
    if (!appReady || motionApp.hidden) return;
    installActivityCarouselStatus();
    if (reducedMotion.matches) return;
    installCardPhysics();
    animateVisiblePane();
    animateChart();
    installAllocationPin();
  }

  function startMotion() {
    if (appReady || motionApp.hidden) return;
    appReady = true;
    installActivityCarouselStatus();
    if (reducedMotion.matches) return;
    animateHero();
    refreshMotion();
  }

  const appObserver = new MutationObserver(() => startMotion());
  appObserver.observe(motionApp, { attributes: true, attributeFilter: ['hidden'] });

  const dashboardObserver = new MutationObserver((mutations) => {
    if (!appReady) return;
    const finishedLoading = mutations.some((mutation) => mutation.type === 'attributes'
      && mutation.attributeName === 'aria-busy'
      && motionDashboard.getAttribute('aria-busy') === 'false');
    if (finishedLoading) refreshMotion();
  });
  dashboardObserver.observe(motionDashboard, { attributes: true, attributeFilter: ['aria-busy'] });

  for (const tab of document.querySelectorAll('[data-tab]')) {
    tab.addEventListener('click', () => window.setTimeout(refreshMotion, 40));
  }

  reducedMotion.addEventListener('change', () => window.location.reload());
  window.addEventListener('resize', () => {
    if (!reducedMotion.matches) installAllocationPin();
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  startMotion();
})();
