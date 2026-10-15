// Home page: the casting stage, the conveyor, the product filter and the jali light.
(() => {
  const motion = document.documentElement.classList.contains('motion');
  const fit = window.rjFit || (() => {});
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // ---------- Casting stage ----------
  // Each piece is drawn as an outline, filled from the bottom like a pour, shown, then lifted away by a hook.
  const stage = document.querySelector('[data-stage-player]');
  const pieces = document.getElementById('stage-pieces');
  if (motion && stage && pieces) {
    const outline = stage.querySelector('.stage__outline');
    const cast = stage.querySelector('.stage__cast');
    const name = stage.querySelector('.stage__name');
    const sources = [...pieces.content.children];
    const TIMES = { draw: 1600, pour: 1900, show: 2300, lift: 1500 };
    const total = Object.values(TIMES).reduce((a, b) => a + b, 0);
    stage.style.setProperty('--piece-ms', `${total}ms`);
    let index = 0;
    let visible = true;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);
    }

    const load = (source) => {
      const filled = source.querySelector('svg').cloneNode(true);
      const lined = filled.cloneNode(true);
      lined.classList.remove('m-grc', 'm-frp');
      lined.classList.add('m-line');
      outline.replaceChildren(lined);
      cast.replaceChildren(filled);
      fit(lined);
      fit(filled);
      name.textContent = source.dataset.name;
      name.classList.remove('is-new');
      void name.offsetWidth;
      name.classList.add('is-new');
    };

    const loop = async () => {
      await wait(900); // let the headline land first
      for (;;) {
        if (!visible || document.hidden) { await wait(500); continue; }
        stage.removeAttribute('data-phase');
        stage.classList.remove('is-cycling');
        load(sources[index]);
        await nextFrame();
        stage.classList.add('is-cycling');
        stage.dataset.phase = 'draw';
        await wait(TIMES.draw);
        stage.dataset.phase = 'pour';
        await wait(TIMES.pour);
        stage.dataset.phase = 'show';
        await wait(TIMES.show);
        stage.dataset.phase = 'lift';
        await wait(TIMES.lift);
        index = (index + 1) % sources.length;
      }
    };
    loop();
  }

  // ---------- Jali light follows the pointer across the hero ----------
  const hero = document.querySelector('.hero');
  const light = hero?.querySelector('.jali-light');
  if (motion && light && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let idle;
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      light.classList.add('is-following');
      light.style.setProperty('--lx', `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      light.style.setProperty('--ly', `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
      clearTimeout(idle);
      idle = setTimeout(() => {
        light.classList.remove('is-following');
        light.style.removeProperty('--lx');
        light.style.removeProperty('--ly');
      }, 4000);
    });
  }

  // ---------- Conveyor ----------
  // Pieces ride the belt as silhouettes and show in colour inside the gate's light.
  // A second copy of the pieces makes the loop seamless, and a silhouette copy of the
  // whole layer sits underneath the coloured one, moving in step with it.
  const conveyor = document.querySelector('.conveyor');
  if (motion && conveyor) {
    const SPEED = 42; // pixels per second, shared by the pieces, the belt and the rollers
    const ROLLER = 16; // roller diameter in pixels
    const lit = conveyor.querySelector('.conveyor__layer--lit');
    const track = lit.querySelector('.conveyor__track');
    const rollers = conveyor.querySelector('.conveyor__rollers');

    // Copies stay clickable, since the coloured layer is only visible inside the light,
    // but are skipped by keyboard and screen readers.
    const copy = track.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
    track.after(copy);
    const shadow = lit.cloneNode(true);
    shadow.className = 'conveyor__layer conveyor__layer--shadow';
    shadow.setAttribute('aria-hidden', 'true');
    shadow.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
    lit.before(shadow);

    const layout = () => {
      conveyor.style.setProperty('--convey', `${(track.getBoundingClientRect().width / SPEED).toFixed(2)}s`);
      conveyor.style.setProperty('--tread', `${(26 / SPEED).toFixed(3)}s`);
      conveyor.style.setProperty('--roll', `${((Math.PI * ROLLER) / SPEED).toFixed(3)}s`);
      const count = Math.ceil(conveyor.clientWidth / (ROLLER + 30)) + 1;
      if (rollers.children.length !== count) {
        rollers.replaceChildren(...Array.from({ length: count }, () => document.createElement('span')));
      }
    };
    layout();
    let resizing;
    addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(layout, 150); });

    // One caption under the gate names the piece standing in the light
    const caption = document.createElement('p');
    caption.className = 'conveyor__caption';
    caption.setAttribute('aria-hidden', 'true');
    const captionName = document.createElement('span');
    const captionMat = document.createElement('span');
    captionMat.className = 'piece__mat';
    caption.append(captionName, captionMat);
    conveyor.append(caption);
    const pieces = [...lit.querySelectorAll('.piece')];
    let current = null;
    const updateCaption = () => {
      const box = conveyor.getBoundingClientRect();
      const centre = box.left + box.width / 2;
      const reach = parseFloat(getComputedStyle(conveyor).getPropertyValue('--gate')) * 16 * 0.32;
      let nearest = null;
      let best = Infinity;
      for (const piece of pieces) {
        const r = piece.getBoundingClientRect();
        const distance = Math.abs(r.left + r.width / 2 - centre);
        if (distance < best) { best = distance; nearest = piece; }
      }
      const inLight = best <= reach ? nearest : null;
      if (inLight === current) return;
      current = inLight;
      caption.classList.toggle('is-on', Boolean(inLight));
      if (!inLight) return;
      const label = inLight.querySelector('.piece__label');
      captionName.textContent = label.firstChild.textContent.trim();
      captionMat.textContent = label.querySelector('.piece__mat').textContent;
      caption.classList.remove('is-new');
      void caption.offsetWidth;
      caption.classList.add('is-new');
    };
    let watching = 0;
    const watch = (on) => {
      clearInterval(watching);
      if (on) watching = setInterval(updateCaption, 100);
    };

    // Rest when the band is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        conveyor.classList.toggle('is-offscreen', !entry.isIntersecting);
        watch(entry.isIntersecting);
      }).observe(conveyor);
    } else {
      watch(true);
    }
    conveyor.classList.add('is-looping');
  }

  // ---------- Product filter ----------
  const filter = document.querySelector('.filter');
  if (filter) {
    const buttons = [...filter.querySelectorAll('button')];
    const thumb = filter.querySelector('.filter__thumb');
    const tiles = [...document.querySelectorAll('.tile')];
    const place = (button) => {
      thumb.style.setProperty('--tx', `${button.offsetLeft}px`);
      thumb.style.setProperty('--tw', `${button.offsetWidth}px`);
    };
    const apply = (value) => {
      tiles.forEach((tile) => { tile.hidden = value !== 'all' && tile.dataset.material !== value; });
      tiles.filter((tile) => !tile.hidden).forEach((tile) => tile.querySelector('[data-draw]')?.classList.add('in-view', 'is-done'));
    };
    buttons.forEach((button) => button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      place(button);
      if (motion && document.startViewTransition) {
        // Only the tiles move; the page itself doesn't fade as it does between pages
        document.documentElement.classList.add('is-filtering');
        document.startViewTransition(() => apply(button.dataset.filter)).finished
          .finally(() => document.documentElement.classList.remove('is-filtering'));
      } else {
        apply(button.dataset.filter);
      }
    }));
    const pressed = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    place(pressed);
    filter.classList.add('is-ready');
    addEventListener('resize', () => place(buttons.find((b) => b.getAttribute('aria-pressed') === 'true')));
  }
})();
