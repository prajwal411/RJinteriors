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
    if (svg.closest('.piece, template')) return; // conveyor pieces set their own scale
    window.rjFit(svg);
  });

  // The header gains a shadow once the page scrolls under it
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal as things scroll into view. Items revealed together are staggered in reading order.
  const REVEAL = '[data-draw], [data-cure], [data-map], .material__bar, .step, .industry, .brand, .about-grid > section, .journey, .pcard, .pphoto';
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
    document.querySelectorAll('.hero [data-draw], .hero [data-cure], .page-head [data-draw], .page-head [data-cure]').forEach(reveal);
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

  // ---------- Enquiry form ----------
  const form = document.querySelector('[data-enquiry-form]');
  if (!form) return;

  const TYPES = {
    quote: { title: 'Request a quote', button: 'Send quote request', noun: 'Quote request' },
    advice: { title: 'Ask for advice', button: 'Send question', noun: 'Question' },
    references: { title: 'Ask about similar projects', button: 'Send request', noun: 'Request' },
    other: { title: 'Send an enquiry', button: 'Send enquiry', noun: 'Enquiry' },
  };
  const BRANDS = {
    'grc-bangalore': 'GRC Bangalore',
    'frp-bangalore': 'FRP Bangalore',
    'grc-chennai': 'GRC Chennai',
    'grc-kochi': 'GRC Kochi',
  };

  const title = document.querySelector('[data-enquiry-title]');
  const submit = form.querySelector('[data-submit]');
  const status = form.querySelector('.form-status');
  const endpoint = form.dataset.endpoint.trim();
  const mailto = form.getAttribute('action').replace(/^mailto:/, '');

  if (endpoint) form.querySelector('[data-mailto-note]')?.remove();

  const currentType = () => TYPES[form.elements.type.value] || TYPES.other;
  const updateLabels = () => {
    const type = currentType();
    title.textContent = type.title;
    submit.textContent = type.button;
  };

  // Preset the enquiry type and brand from the link that brought the visitor here
  const params = new URLSearchParams(location.search);
  const presetType = params.get('type');
  if (presetType in TYPES) form.elements.type.value = presetType;
  const presetBrand = params.get('brand');
  if (presetBrand in BRANDS) form.elements.brand.value = BRANDS[presetBrand];
  updateLabels();
  form.addEventListener('change', (event) => {
    if (event.target.name === 'type') updateLabels();
  });

  const rules = {
    name: (v) => (v ? '' : 'Enter your name'),
    phone: (v) => {
      if (!v) return 'Enter a phone number we can call you on';
      const digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13 ? '' : 'Enter a phone number with 10 digits, or with a country code';
    },
    email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email address like name@example.com, or leave it blank'),
    location: (v) => (v ? '' : 'Enter the city or town where the project is'),
    message: (v) => (v ? '' : 'Tell us what you need'),
  };

  const showError = (name, message) => {
    const field = form.elements[name];
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
  };

  const validate = () => {
    let first = null;
    for (const [name, rule] of Object.entries(rules)) {
      const message = rule(form.elements[name].value.trim());
      showError(name, message);
      if (message && !first) first = form.elements[name];
    }
    return first;
  };

  // Re-check a field once the visitor leaves it, but only after it has been flagged
  form.addEventListener('focusout', (event) => {
    const { name } = event.target;
    if (rules[name] && event.target.getAttribute('aria-invalid') === 'true') {
      showError(name, rules[name](event.target.value.trim()));
    }
  });

  const setStatus = (html, isError = false) => {
    status.innerHTML = html;
    status.classList.toggle('form-status--error', isError);
  };

  // Plain-text version of the form for the email body; blank optional fields are left out
  const summary = (data) => {
    const fields = [
      ['Enquiry', currentType().noun],
      ['Name', data.get('name')],
      ['Organisation', data.get('organisation')],
      ['Phone', data.get('phone')],
      ['Email', data.get('email')],
      ['Project location', data.get('location')],
      ['Material', data.get('material')],
      ['Product', data.get('product')],
      ['Size and quantity', data.get('quantity')],
      ['Timeline', data.get('timeline')],
      ['Installation needed', data.get('installation')],
      ['Brand', data.get('brand')],
    ];
    const lines = fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
    return `${lines.join('\n')}\n\n${data.get('message')}`;
  };

  const phone = document.querySelector('a[href^="tel:"]');
  const fallback = `email <a href="mailto:${mailto}">${mailto}</a>` +
    (phone ? ` or call <a href="${phone.getAttribute('href')}">${phone.textContent}</a>` : '');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = validate();
    if (invalid) {
      setStatus('<p>Some details are missing. Check the highlighted fields.</p>', true);
      invalid.focus();
      return;
    }

    const type = currentType();
    const data = new FormData(form);

    if (!endpoint) {
      const subject = `${type.noun} from ${data.get('name')} (${data.get('location')})`;
      const body = `${summary(data)}\n\nDrawings or photos: attach them to this email.`;
      window.location.href = `mailto:${mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus(`<p><strong>${type.noun} opened in your email app.</strong> Attach any drawings or photos, then send it from there.</p>` +
        `<p>If your email app didn't open, ${fallback}.</p>`);
      return;
    }

    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Sending…';
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      updateLabels();
      setStatus(`<p><strong>${type.noun} sent.</strong> We will reply by phone or email. To share drawings, email them to <a href="mailto:${mailto}">${mailto}</a>.</p>`);
    } catch {
      setStatus(`<p><strong>${type.noun} not sent.</strong> Check your connection and try again, or ${fallback}.</p>`, true);
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
})();
