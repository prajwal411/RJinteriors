// Home page: GRC and FRP side by side, and the product filter. The factory walk at the top is walk.js.
(() => {
  const motion = document.documentElement.classList.contains('motion');

  // ---------- GRC and FRP side by side ----------
  // The range input moves the line across the arch; pointing at either side swings it over to that material.
  const duo = document.querySelector('[data-duo]');
  if (duo) {
    const compare = duo.querySelector('.duo__compare');
    const range = duo.querySelector('.duo__range');
    // follows the centre of the range thumb, which is 2.75rem wide
    const set = (value) => compare.style.setProperty('--split', `calc(1.375rem + (100% - 2.75rem) * ${value / 100})`);
    range.addEventListener('input', () => {
      duo.classList.add('is-touched');
      compare.classList.add('is-dragging');
      set(Number(range.value));
    });
    range.addEventListener('change', () => compare.classList.remove('is-dragging'));
    duo.querySelectorAll('[data-side]').forEach((side) => {
      side.addEventListener('pointerenter', () => {
        duo.classList.add('is-touched');
        compare.classList.remove('is-dragging');
        set(side.dataset.side === 'grc' ? 90 : 10);
      });
      side.addEventListener('pointerleave', () => set(Number(range.value)));
    });
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
