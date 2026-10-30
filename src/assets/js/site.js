// RJ Interiors & Constructions: mobile menu, motion and the enquiry form.
// The site works without this script; it adds movement and convenience, not content.
(() => {
  // ---------- Mobile menu ----------
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const label = toggle.querySelector('span');
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.toggleAttribute('data-open', open);
      label.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    matchMedia('(min-width: 75rem)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // ---------- Motion ----------
  // The head script adds .motion unless the visitor prefers reduced motion. This flag tells it
  // the script arrived, so it doesn't remove .motion as a safety net.
  window.rjMotionReady = true;
  const motion = document.documentElement.classList.contains('motion');
  const header = document.querySelector('.site-header');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Drawings fitted into boxes get --k (screen pixels per drawing unit), so their strokes keep
  // one line weight at any size and can still be drawn in with a dash animation.
  const resizer = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target))) : null;
  function fit(svg) {
    const box = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!box || !box.width || !rect.width) return;
    svg.style.setProperty('--k', Math.min(rect.width / box.width, rect.height / box.height).toFixed(4));
    svg.setAttribute('data-k', '');
  }
  window.rjFit = (svg) => { fit(svg); resizer?.observe(svg); };
  document.querySelectorAll('.drawing').forEach((svg) => {
    if (svg.closest('.walk__list, template')) return; // the factory walk paints these onto its canvas
    window.rjFit(svg);
  });

  // The header gains a shadow once the page scrolls under it
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal as things scroll into view. Items revealed together are staggered in reading order.
  const REVEAL = '[data-draw], [data-cure], [data-map], .material__bar, .step, .industry, .brand, .about-grid > section, .journey, .pcard, .pphoto, .duo__recipe';
  const reveal = (el) => {
    if (el.classList.contains('in-view')) return;
    el.classList.add('in-view');
    if (el.matches('[data-draw], [data-map]')) {
      // Once drawn, the animation is dropped so later layout changes show the finished drawing
      const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(() => el.classList.add('is-done'), (Number(el.dataset.done) || 3000) + delay);
    }
  };
  if (motion) {
    const targets = document.querySelectorAll(REVEAL);
    document.querySelectorAll('.walk [data-cure], .page-head [data-draw], .page-head [data-cure]').forEach(reveal);
    if ('IntersectionObserver' in window) {
      const watcher = new IntersectionObserver((entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(order++, 6) * 110}ms`);
          reveal(el);
          watcher.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      targets.forEach((el) => watcher.observe(el));
    } else {
      targets.forEach(reveal);
    }
  }

  // Pointing at a brand lights up its place on the map
  const map = document.querySelector('[data-map]');
  if (map) {
    document.querySelectorAll('[data-city]').forEach((el) => {
      if (map.contains(el)) return;
      const on = () => { map.dataset.focus = el.dataset.city; };
      const off = () => { delete map.dataset.focus; };
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focusin', on);
      el.addEventListener('focusout', off);
    });
  }
})();
