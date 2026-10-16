// Projects: the sector filter on the projects page, and the photo viewer on each project page.
(() => {
  const motion = document.documentElement.classList.contains('motion');

  // ---------- Sector filter ----------
  const filter = document.querySelector('.pfilter');
  if (filter) {
    const buttons = [...filter.querySelectorAll('button')];
    const cards = [...document.querySelectorAll('.pgrid .pcard')];
    const status = document.querySelector('.pfilter__status');
    const buttonFor = (key) => buttons.find((button) => button.dataset.sector === key);

    const apply = (key, { animate = true, remember = true } = {}) => {
      const update = () => {
        cards.forEach((card) => { card.hidden = key !== 'all' && card.dataset.sector !== key; });
        buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.sector === key)));
      };
      if (animate && motion && document.startViewTransition) {
        // Only the cards move; the page itself doesn't fade as it does between pages
        document.documentElement.classList.add('is-filtering');
        document.startViewTransition(update).finished
          .finally(() => document.documentElement.classList.remove('is-filtering'));
      } else {
        update();
      }

      const count = key === 'all' ? cards.length : cards.filter((card) => card.dataset.sector === key).length;
      const sector = buttonFor(key).firstChild.textContent.trim().toLowerCase();
      status.textContent = key === 'all'
        ? `Showing all ${count} projects`
        : `Showing ${count} ${count === 1 ? 'project' : 'projects'} in ${sector}`;

      // Keep the choice in the address, so it can be shared and survives going back
      if (remember) {
        const url = new URL(location.href);
        if (key === 'all') url.searchParams.delete('sector');
        else url.searchParams.set('sector', key);
        history.replaceState(null, '', url);
      }
    };

    buttons.forEach((button) => button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') !== 'true') apply(button.dataset.sector);
    }));
    const preset = new URLSearchParams(location.search).get('sector');
    apply(buttonFor(preset) ? preset : 'all', { animate: false, remember: false });
  }

  // ---------- Photo viewer ----------
  // Without this script, each photo link simply opens the full-size image.
  const dialog = document.querySelector('.lightbox');
  const links = [...document.querySelectorAll('[data-lightbox]')];
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

  const image = dialog.querySelector('.lightbox__img');
  const caption = dialog.querySelector('.lightbox__caption');
  const counter = dialog.querySelector('.lightbox__count');
  const photos = links.map((link) => ({
    src: link.getAttribute('href'),
    alt: link.querySelector('img').alt,
    width: Number(link.dataset.w),
    height: Number(link.dataset.h),
  }));
  dialog.classList.toggle('is-single', photos.length === 1);
  let index = 0;
  let opener = null;

  const preload = (i) => {
    const next = new Image();
    next.src = photos[(i + photos.length) % photos.length].src;
  };

  const show = (i, direction = 0) => {
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    image.src = photo.src;
    image.alt = photo.alt;
    image.width = photo.width;
    image.height = photo.height;
    caption.textContent = photo.alt;
    counter.textContent = `${index + 1} of ${photos.length}`;
    if (motion) {
      image.style.setProperty('--from', `${direction * 48}px`);
      image.classList.remove('is-entering');
      void image.offsetWidth;
      image.classList.add('is-entering');
    }
    preload(index + 1);
    preload(index - 1);
  };

  links.forEach((link, i) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    opener = link;
    show(i);
    dialog.showModal();
  }));

  // Swipe left or right on touch screens; a swipe is not also treated as a click
  let startX = null;
  let swiped = false;
  dialog.addEventListener('pointerdown', (event) => { startX = event.clientX; swiped = false; });
  dialog.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const distance = event.clientX - startX;
    startX = null;
    if (Math.abs(distance) > 50 && photos.length > 1) {
      swiped = true;
      show(index + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
    }
  });

  dialog.addEventListener('click', (event) => {
    if (swiped) { swiped = false; return; }
    const step = event.target.closest('[data-step]');
    if (step) show(index + Number(step.dataset.step), Number(step.dataset.step));
    else if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (photos.length < 2) return;
    if (event.key === 'ArrowRight') show(index + 1, 1);
    if (event.key === 'ArrowLeft') show(index - 1, -1);
  });
  dialog.addEventListener('close', () => opener?.focus());
})();
