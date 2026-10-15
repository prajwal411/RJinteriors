// The working cycle: plays the stages of making a GRC or FRP piece, then switches material.
// It plays only while on screen, can be paused, and any stage can be chosen directly.
(() => {
  const root = document.querySelector('[data-cycle]');
  if (!root) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tabs = [...root.querySelectorAll('.cycle__tab')];
  const lists = {
    grc: root.querySelector('[data-steps="grc"]'),
    frp: root.querySelector('[data-steps="frp"]'),
  };
  const playButton = root.querySelector('[data-play]');
  const playLabel = root.querySelector('[data-play-label]');

  let material = root.dataset.material;
  let stage = 0;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let playing = !reduce;
  let visible = false;
  let started = false;
  let switching = false;

  const steps = () => [...lists[material].querySelectorAll('.cycle__step')];
  const duration = () => Number(steps()[stage - 1]?.dataset.ms) || 3000;
  const setReached = (n) => {
    for (let i = 1; i <= 7; i++) root.classList.toggle(`s${i}`, i <= n);
  };

  // Moving on by one stage animates. Any other jump snaps to the state just before
  // the chosen stage, then animates that stage.
  function show(n, snap = n !== stage + 1) {
    if (snap) {
      root.classList.add('is-resetting');
      root.dataset.stage = '0';
      setReached(n - 1);
      void root.offsetWidth;
      root.classList.remove('is-resetting');
    }
    stage = n;
    elapsed = 0;
    root.dataset.stage = String(n);
    setReached(n);
    steps().forEach((step, i) => {
      const active = i === n - 1;
      step.classList.toggle('is-active', active);
      if (active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.style.setProperty('--p', i < n - 1 ? '1' : '0');
    });
  }

  function setMaterial(next) {
    if (next === material || switching) return;
    switching = true;
    root.classList.add('is-switching');
    setTimeout(() => {
      material = next;
      root.dataset.material = next;
      tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.material === next)));
      Object.entries(lists).forEach(([key, list]) => { list.hidden = key !== next; });
      show(1, true);
      root.classList.remove('is-switching');
      switching = false;
    }, reduce ? 0 : 320);
  }

  function tick(time) {
    frame = 0;
    if (!playing || !visible) { last = 0; return; }
    if (!switching) {
      if (last) elapsed += time - last;
      const progress = Math.min(1, elapsed / duration());
      steps()[stage - 1]?.style.setProperty('--p', progress.toFixed(3));
      if (progress >= 1) {
        if (stage < 7) show(stage + 1);
        else setMaterial(material === 'grc' ? 'frp' : 'grc');
      }
    }
    last = time;
    frame = requestAnimationFrame(tick);
  }
  const run = () => {
    if (!frame && playing && visible) { last = 0; frame = requestAnimationFrame(tick); }
  };

  const setPlaying = (next) => {
    playing = next;
    root.classList.toggle('is-paused', !next);
    playLabel.textContent = next ? 'Pause' : 'Play';
    run();
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => setMaterial(tab.dataset.material)));
  // Links elsewhere on the page, such as "How FRP is made", choose the material before jumping here
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-show-cycle]');
    if (link) setMaterial(link.dataset.showCycle);
  });
  Object.values(lists).forEach((list) => list.addEventListener('click', (event) => {
    const step = event.target.closest('.cycle__step');
    if (step) show(Number(step.dataset.step), true);
  }));
  playButton.hidden = false;
  playButton.addEventListener('click', () => setPlaying(!playing));
  setPlaying(playing);

  // Start from the first stage the first time the cycle comes into view
  const begin = () => {
    if (started) return;
    started = true;
    show(1, true);
  };
  if (reduce) begin();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) begin();
      run();
    }, { threshold: 0.3 }).observe(root.querySelector('.cycle__stage'));
  } else {
    visible = true;
    begin();
    run();
  }
})();
