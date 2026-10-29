#!/usr/bin/env node
// Static site builder for www.rjinteriors.in. No dependencies.
//
//   node build.mjs           build the site into dist/
//   node build.mjs --serve   build, serve on http://localhost:4173 and rebuild when src/ changes
//
// Templates are plain HTML with a few tags:
//   {{> name}}                      include src/partials/name.html
//   {{drawing name material=frp}}   inline src/drawings/name.svg
//   {{helper}}                      output of a helper defined below (nav, phones, ...)
//   {{site.key}} / {{page.key}}     escaped value from src/data/site.json or the page's front matter

import { readFile, writeFile, mkdir, readdir, rm, cp, open } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'dist');

// Marks a fact in src/data that the client has not confirmed yet. It must never reach a page.
const ASK_CLIENT = '[ASK CLIENT]';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lookup = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

async function readDir(dir, ext) {
  const files = {};
  for (const f of await readdir(dir)) {
    if (f.endsWith(ext)) files[path.basename(f, ext)] = await readFile(path.join(dir, f), 'utf8');
  }
  return files;
}

// Front matter: "key: value" lines between --- markers at the top of a page
function parsePage(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const meta = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

// Width and height of a WebP image, read from its header
async function webpSize(file) {
  const handle = await open(file).catch(() => {
    throw new Error(`Missing image ${path.relative(root, file)}. Run: python tools/project-images.py`);
  });
  const buf = Buffer.alloc(30);
  await handle.read(buf, 0, 30, 0);
  await handle.close();
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  throw new Error(`Not a WebP image: ${file}`);
}

function parseArgs(str) {
  const args = {};
  for (const [, k, v] of str.matchAll(/(\w+)=("[^"]*"|\S+)/g)) args[k] = v.replace(/^"|"$/g, '');
  return args;
}

async function build() {
  const started = Date.now();
  const site = JSON.parse(await readFile(path.join(SRC, 'data', 'site.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(SRC, 'data', 'projects.json'), 'utf8'));
  const types = JSON.parse(await readFile(path.join(SRC, 'data', 'project-types.json'), 'utf8'));
  const faqData = JSON.parse(await readFile(path.join(SRC, 'data', 'faq.json'), 'utf8'));
  // Answers can use site values such as {{site.address.line}}, so they always match the rest of the site
  const faq = (ctx) => faqData.map(({ q, a }) => ({ q, a: render(a, ctx) }));
  const templates = await readDir(path.join(SRC, 'templates'), '.html');
  const partials = await readDir(path.join(SRC, 'partials'), '.html');
  const drawings = await readDir(path.join(SRC, 'drawings'), '.svg');
  // Line endings are made the same on every machine, so the inline scripts' CSP hashes don't change
  // between a Windows checkout and the build on Vercel
  const layout = (await readFile(path.join(SRC, 'layout.html'), 'utf8')).replace(/\r\n/g, '\n');
  // Set in Vercel → Project → Settings → Environment Variables; each tag is left out until its value is set
  const env = {
    siteVerification: (process.env.GOOGLE_SITE_VERIFICATION || '').trim(),
    ga4: (process.env.GA4_ID || '').trim(),
  };
  if (env.ga4 && !/^G-[A-Z0-9]+$/.test(env.ga4)) throw new Error(`GA4_ID "${env.ga4}" should look like G-XXXXXXXXXX`);
  const pageFiles = await readDir(path.join(SRC, 'pages'), '.html');
  const year = new Date().getFullYear();
  // Last commit date of a source file, for the sitemap's <lastmod>. Empty when git or the history is missing,
  // and in a shallow clone (as on Vercel), where every older file would wrongly get the oldest fetched date.
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  const fullHistory = git('rev-parse', '--is-shallow-repository') === 'false';
  const lastCommit = (file) => (fullHistory ? git('log', '-1', '--format=%cs', '--', file) : '');

  const absolute = (p) => site.url.replace(/\/$/, '') + p;

  // The factory address as one line, written the same way as on the Google Business Profile, and the
  // Google Maps links made from it. The links search for the address alone: searching for the business
  // name finds a different "RJ Interiors" in Amruthahalli.
  const a = site.address;
  a.line = `${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`;
  const place = encodeURIComponent(a.line);
  a.mapUrl = `https://www.google.com/maps/search/?api=1&query=${place}`;
  a.directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place}`;
  a.embedUrl = `https://www.google.com/maps?q=${place}&z=16&output=embed`;

  // Projects: URLs, labels and the photo files made by tools/project-images.py. Facts the client still
  // has to confirm are "[ASK CLIENT]" in projects.json; they are blanked here so the page leaves them out.
  for (const p of projects) {
    for (const key of ['location', 'year', 'material', 'finish', 'size', 'scope']) {
      if (p[key] === ASK_CLIENT) p[key] = '';
    }
    p.url = `/projects/${p.id}/`;
    p.sectorLabel = types.sectors[p.sector];
    if (!p.sectorLabel) throw new Error(`Unknown sector "${p.sector}" for project ${p.id}`);
    for (const item of p.work) {
      if (!types.work[item.type]) throw new Error(`Unknown work type "${item.type}" for project ${p.id}`);
    }
    p.images = [];
    for (const [i, photo] of (p.photos || []).entries()) {
      const base = `/assets/img/projects/${p.id}/${i + 1}`;
      const [fw, fh] = await webpSize(path.join(SRC, `${base}.webp`));
      const [tw, th] = await webpSize(path.join(SRC, `${base}-thumb.webp`));
      p.images.push({ alt: photo.alt, full: { src: `${base}.webp`, w: fw, h: fh }, thumb: { src: `${base}-thumb.webp`, w: tw, h: th } });
    }
  }

  function drawing(name, args) {
    const svg = drawings[name];
    if (!svg) throw new Error(`Unknown drawing "${name}"`);
    const [, attrs, inner] = svg.match(/<svg([^>]*)>([\s\S]*)<\/svg>/);
    const [, w, h] = attrs.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const material = args.material || (attrs.match(/data-material="(\w+)"/) || [])[1] || 'grc';
    const cls = ['drawing', `m-${material}`, args.class].filter(Boolean).join(' ');
    // pathLength lets any drawing be drawn in with a single dash animation (see "Motion" in site.css)
    const body = inner.replace(/<path /g, '<path pathLength="1" ');
    return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" style="--w:${w};--h:${h}" ` +
      `preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${body.trim()}</svg>`;
  }

  // A responsive <img> for a project photo
  function img(image, { sizes, priority = false, alt = image.alt }) {
    const srcset = image.thumb.w < image.full.w
      ? `${image.thumb.src} ${image.thumb.w}w, ${image.full.src} ${image.full.w}w`
      : `${image.full.src} ${image.full.w}w`;
    return `<img src="${image.thumb.src}" srcset="${srcset}" sizes="${sizes}" width="${image.full.w}" height="${image.full.h}" ` +
      `alt="${esc(alt)}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  // One project in a grid. The photo is decorative here; the project page describes each photo.
  // Cards in the main grid are named for view transitions: filtering moves them into place, and opening
  // one carries its photo into the arch at the top of the project page.
  // Card photos stay lazy, even the first: cards are only shown once site.js reveals them, so fetching
  // the first photo early just competes with the CSS the page needs to draw (it measured slower).
  function projectCard(p, { lead = false, heading = 'h2', named = false } = {}) {
    const media = p.images.length
      ? img(p.images[0], { alt: '', sizes: lead ? '(min-width: 72rem) 50rem, 92vw' : '(min-width: 72rem) 25rem, (min-width: 40rem) 46vw, 92vw' })
      : `<span class="pcard__drawing">${drawing(p.drawing || 'column', { material: 'line' })}</span>`;
    const work = [...new Set(p.work.map((item) => types.work[item.type].short))];
    const workText = work.length > 1 ? `${work.slice(0, -1).join(', ')} and ${work.at(-1)}` : work[0] || '';
    return `<li class="pcard${lead ? ' pcard--lead' : ''}" data-sector="${p.sector}"${named ? ` style="view-transition-name: card-${p.id}"` : ''}>
  <a class="pcard__link" href="${p.url}">
    <span class="pcard__media"${named ? ` style="view-transition-name: photo-${p.id}"` : ''}>${media}</span>
    <span class="pcard__body">
      <${heading} class="pcard__name" data-nocure>${esc(p.name)}</${heading}>
      ${p.location ? `<span class="pcard__place">${esc(p.location)}</span>` : ''}
      ${workText ? `<span class="pcard__work">${esc(workText.charAt(0).toUpperCase() + workText.slice(1))}</span>` : ''}
    </span>
    <span class="pcard__sector">${esc(p.sectorLabel)}</span>
  </a>
</li>`;
  }

  // What the visitor is asking about: the project page they are on, or anything we make
  const ask = (ctx) => (ctx.project ? `I saw the ${ctx.project.name} project on your website and would like a quote for similar work.`
    : 'I would like a quote for a GRC or FRP product.');
  const whatsappUrl = (ctx) => `https://wa.me/${site.whatsapp.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello RJIC, ${ask(ctx)}`)}`;
  const emailUrl = (ctx) => {
    const subject = `Enquiry: ${ctx.project?.name || 'GRC and FRP products'}`;
    const body = `Hello RJIC,\n\n${ask(ctx)}\n\nProject location:\nSizes and quantities:\nDrawings or photos: attached\n`;
    return `mailto:${site.emails[0]}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const helpers = {
    year: () => String(year),
    // The projects that include one product block's kind of work, e.g. {{projects-with jalis}}. Project
    // pages don't say whether a piece was GRC or FRP, so the list is about the kind of work only.
    'projects-with': (ctx, anchor) => {
      const list = projects.filter((p) => p.work.some((item) => types.work[item.type].href.endsWith(`#${anchor}`)));
      if (!list.length) return '';
      const shown = list.slice(0, 6).map((p) => `<a href="${p.url}">${esc(p.name)}</a>`).join(', ');
      const more = list.length > 6 ? `, and <a href="/projects/">${list.length - 6} more</a>` : '';
      return `<p class="product__projects"><span>Projects with this kind of work:</span> ${shown}${more}</p>`;
    },
    // Shown once the Google Business Profile share link is in site.json as googleListing
    // Search Console verification and Google Analytics, only when their environment variables are set
    'head-tags': () => [
      env.siteVerification && `<meta name="google-site-verification" content="${esc(env.siteVerification)}">`,
      env.ga4 && `<script async src="https://www.googletagmanager.com/gtag/js?id=${env.ga4}"></script>`,
      env.ga4 && `<script src="/assets/js/analytics.js" data-ga4="${env.ga4}" defer></script>`,
    ].filter(Boolean).join('\n'),
    'reviews-link': () => (site.googleListing
      ? `<a class="text-link" href="${esc(site.googleListing)}" target="_blank" rel="noopener">Read our reviews on Google</a>`
      : ''),
    nav: (ctx) => site.nav.map((item) => {
      const current = item.key === ctx.page.nav ? ' aria-current="page"' : '';
      return `<li><a href="${item.href}"${current}>${esc(item.label)}</a></li>`;
    }).join('\n'),
    'footer-nav': () => [{ label: 'Home', href: '/' }, ...site.nav, { label: 'FAQ', href: '/faq/' }]
      .map((item) => `<li><a href="${item.href}">${esc(item.label)}</a></li>`).join('\n'),
    // Questions and answers from src/data/faq.json; the FAQPage schema uses the same text
    'faq-list': (ctx) => faq(ctx).map(({ q, a }) => `<div class="faq-item">
  <h2 data-nocure>${esc(q)}</h2>
  <div class="faq-item__answer">${a}</div>
</div>`).join('\n'),
    phones: () => site.phones
      .map((ph) => `<li><a href="tel:${ph.tel}">${esc(ph.display)}</a></li>`).join('\n'),
    emails: () => site.emails
      .map((em) => `<li><a href="mailto:${em}">${esc(em)}</a></li>`).join('\n'),
    'brand-links': () => site.brands.map((b) => b.url
      ? `<li><a href="${b.url}">${esc(b.name)}</a></li>`
      : `<li>${esc(b.name)}</li>`).join('\n'),
    // Enquiries go straight to WhatsApp or email, with the first line written for the visitor
    enquire: (ctx) => `<a class="btn btn--whatsapp" href="${esc(whatsappUrl(ctx))}" target="_blank" rel="noopener">${ICONS.whatsapp}WhatsApp us</a>
<a class="btn btn--email" href="${esc(emailUrl(ctx))}">${ICONS.email}Email us</a>`,
    'whatsapp-url': (ctx) => esc(whatsappUrl(ctx)),
    'email-url': (ctx) => esc(emailUrl(ctx)),
    'icon-whatsapp': () => ICONS.whatsapp,
    'icon-email': () => ICONS.email,
    'footer-cta': (ctx) => (ctx.page.cta === 'no' ? '' : render(partials['footer-cta'], ctx)),
    // The line drawing that sketches itself beside the footer call to action; set per page with ctaDrawing
    'cta-drawing': (ctx) => drawing(ctx.page.ctaDrawing || 'dome', { material: 'line' }),
    // The drawing in the dark header of inner pages; set per page with headDrawing
    'head-drawing': (ctx) => drawing(ctx.page.headDrawing || 'dome', {}),
    // Extra stylesheets and scripts for one page: "styles: home cycle" loads assets/css/home.css and cycle.css
    styles: (ctx) => (ctx.page.styles || '').split(/\s+/).filter(Boolean)
      .map((name) => `<link rel="stylesheet" href="/assets/css/${name}.css">`).join('\n'),
    scripts: (ctx) => (ctx.page.scripts || '').split(/\s+/).filter(Boolean)
      .map((name) => `<script src="/assets/js/${name}.js" defer></script>`).join('\n'),
    projects: (ctx) => (projects.length
      ? `<ul class="pgrid" role="list">\n${projects.map((p, i) => projectCard(p, { lead: i === 0, named: true })).join('\n')}\n</ul>`
      : render(partials['projects-empty'], ctx)),
    'project-count': () => String(projects.length),
    'project-filters': () => {
      const counts = {};
      for (const p of projects) counts[p.sector] = (counts[p.sector] || 0) + 1;
      const button = (key, label, n, pressed) =>
        `<button type="button" data-sector="${key}" aria-pressed="${pressed}">${esc(label)} <span class="pfilter__n">${n}</span></button>`;
      return [button('all', 'All', projects.length, true),
        ...Object.entries(types.sectors).filter(([key]) => counts[key]).map(([key, label]) => button(key, label, counts[key], false)),
      ].join('\n');
    },
    // Project pages
    'project-cover': ({ project: p }) => (p.images.length
      ? `<figure class="pcover" style="view-transition-name: photo-${p.id}">${img(p.images[0], { sizes: '(min-width: 52rem) 30vw, 88vw', priority: true })}</figure>`
      : `<div class="page-head__art" data-draw aria-hidden="true">${drawing(p.drawing || 'column', {})}</div>`),
    // The same facts in the same order on every project page; facts not yet known are left out
    'project-facts': ({ project: p }) => {
      const made = [...new Set(p.work.map((item) => item.type))].map((type) => types.work[type])
        .map((t) => `<a href="${t.href}">${esc(t.label)}</a>`).join(', ');
      return [
        p.location && ['Location', esc(p.location)],
        ['Building type', `<a href="/projects/?sector=${p.sector}">${esc(p.sectorLabel)}</a>`],
        p.year && ['Year', esc(p.year)],
        made && ['Products made', made],
        p.material && ['Material', esc(p.material)],
        p.finish && ['Finish', esc(p.finish)],
        p.size && ['Size or quantity', esc(p.size)],
        p.scope && ['Scope', esc(p.scope)],
        p.images.length && ['Photos', String(p.images.length)],
      ].filter(Boolean).map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('\n');
    },
    'project-about': ({ project: p }) => [...p.description,
      'Made by RJ Interiors & Constructions (RJIC) at its factory in Jakkur, Bangalore.',
    ].map((para) => `<p>${esc(para)}</p>`).join('\n'),
    'project-work': ({ project: p }) => (p.work.length
      ? `<h2 class="case__heading">What we made</h2>\n<ul class="work" role="list">\n${p.work.map((item) => {
        const t = types.work[item.type];
        return `<li class="work__item">
  <span class="work__art" data-draw aria-hidden="true">${drawing(t.drawing, { material: 'line' })}</span>
  <span class="work__text"><a class="work__label" href="${t.href}">${esc(t.label)}</a><span class="work__note">${esc(item.note)}</span></span>
</li>`;
      }).join('\n')}\n</ul>`
      : ''),
    'project-gallery': (ctx, p = ctx.project) => (p.images.length
      ? `<ul class="pgallery${p.images.length === 1 ? ' pgallery--single' : ''}" role="list">\n${p.images.map((image, i) => `<li class="pphoto">
  <a class="pphoto__link" href="${image.full.src}" data-lightbox="${i}" data-w="${image.full.w}" data-h="${image.full.h}">
    <span class="visually-hidden">View larger: </span>${img(image, { sizes: p.images.length === 1 ? '(min-width: 64rem) 46rem, 92vw' : '(min-width: 64rem) 23rem, (min-width: 34rem) 46vw, 92vw' })}
    <span class="pphoto__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg></span>
  </a>
</li>`).join('\n')}\n</ul>`
      : `<p class="pgallery__empty">Photos of this project aren't on the website yet. <a href="${esc(whatsappUrl(ctx))}" target="_blank" rel="noopener">Ask us about it on WhatsApp</a>.</p>`),
    'project-related': ({ project: p }) => {
      const others = projects.filter((q) => q !== p && q.images.length);
      const index = projects.indexOf(p);
      const near = (q) => Math.abs(projects.indexOf(q) - index);
      const picks = [...others.filter((q) => q.sector === p.sector).sort((a, b) => near(a) - near(b)),
        ...others.filter((q) => q.sector !== p.sector).sort((a, b) => near(a) - near(b))].slice(0, 3);
      return picks.map((q) => projectCard(q, { heading: 'h3' })).join('\n');
    },
    'project-pager': ({ project: p }) => {
      const i = projects.indexOf(p);
      const prev = projects[(i - 1 + projects.length) % projects.length];
      const next = projects[(i + 1) % projects.length];
      return `<a class="pager__link pager__link--prev" href="${prev.url}"><span class="pager__dir">Previous project</span><span class="pager__name">${esc(prev.name)}</span></a>
<a class="pager__link pager__link--next" href="${next.url}"><span class="pager__dir">Next project</span><span class="pager__name">${esc(next.name)}</span></a>`;
    },
    canonical: (ctx) => absolute(ctx.page.path),
    robots: (ctx) => (ctx.page.robots ? `<meta name="robots" content="${esc(ctx.page.robots)}">` : ''),
    jsonld: (ctx) => jsonLd(site, ctx.page, absolute, projects, ctx.page.path === '/faq/' ? faq(ctx) : []),
  };

  function render(tpl, ctx, depth = 0) {
    if (depth > 10) throw new Error('Partials nested too deeply');
    return tpl.replace(/\{\{\s*(>?)\s*([^{}]+?)\s*\}\}/g, (match, isPartial, expr) => {
      if (isPartial) {
        const name = expr.trim();
        if (!(name in partials)) throw new Error(`Unknown partial "${name}"`);
        return render(partials[name], ctx, depth + 1);
      }
      const [head, ...rest] = expr.split(/\s+/);
      if (head === 'drawing') return drawing(rest[0], parseArgs(rest.slice(1).join(' ')));
      if (head in helpers) return helpers[head](ctx, ...rest);
      const value = lookup(ctx, head);
      if (value === undefined) throw new Error(`Unknown value "${head}" in ${ctx.page.file}`);
      return esc(value);
    });
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  // Files that must sit at the site root, such as .htaccess
  await cp(path.join(SRC, 'root'), OUT, { recursive: true });

  const sitemap = [];
  // Search results cut titles at about 60 characters and descriptions at about 160; much shorter
  // descriptions waste the space
  const warnings = [];
  const inlineScripts = new Set();
  const fitDescription = (options) => options.find((d) => d.length >= 140 && d.length <= 160)
    || options.reduce((best, d) => (Math.abs(d.length - 150) < Math.abs(best.length - 150) ? d : best));
  async function writePage(page, body, extra = {}) {
    const ctx = { site, page, ...extra };
    if (page.sitemap !== 'no') {
      if (page.title.length > 60) warnings.push(`${page.path}: title is ${page.title.length} characters (60 at most)`);
      const d = page.description.length;
      if (d < 140 || d > 160) warnings.push(`${page.path}: description is ${d} characters (140 to 160)`);
    }
    // Motion hooks: headings "cure" and plates draw themselves as they scroll into view
    const content = render(body, ctx)
      .replace(/<h([12])(?=[\s>])(?![^>]*\bdata-nocure)/g, '<h$1 data-cure')
      .replace(/<(div|figure) class="plate/g, '<$1 data-draw class="plate');
    const html = render(layout, ctx).replace('<!-- content -->', () => content);
    if (html.includes(ASK_CLIENT)) throw new Error(`"${ASK_CLIENT}" would be shown on ${page.path}`);
    checkJsonLd(html, page.path);
    for (const [, code] of html.matchAll(INLINE_SCRIPT)) inlineScripts.add(code);
    const target = page.path.endsWith('/')
      ? path.join(OUT, page.path, 'index.html')
      : path.join(OUT, page.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    if (page.sitemap !== 'no') sitemap.push({ path: page.path, lastmod: lastCommit(page.source) });
  }

  for (const [file, raw] of Object.entries(pageFiles)) {
    const { meta, body } = parsePage(raw);
    await writePage({ file, source: `src/pages/${file}.html`, bodyClass: '', ...meta }, body);
  }

  // One page per project, from src/templates/project.html
  for (const p of projects) {
    const place = p.location ? `, ${p.location}` : '';
    const firstWork = p.work[0] && types.work[p.work[0].type];
    // Name what was made, for searches like "jali screens hotel Bengaluru". Google cuts titles at
    // about 60 characters, so use the longest of these that fits.
    const shorts = [...new Set(p.work.map((item) => types.work[item.type].short))];
    const title = [
      shorts.length > 1 && `${p.name}${place}: ${shorts[0]} and ${shorts[1]} | RJIC`,
      shorts.length && `${p.name}${place}: ${shorts[0]} | RJIC`,
      `${p.name}${place} | Projects | RJIC`,
      `${p.name}${place} | RJIC`,
      // The town alone, without the state
      `${p.name}${p.location ? `, ${p.location.split(',')[0]}` : ''} | RJIC`,
    ].find((t) => t && t.length <= 60) || `${p.name} | RJIC`;
    await writePage({
      file: `project ${p.id}`,
      source: 'src/data/projects.json',
      path: p.url,
      nav: 'projects',
      bodyClass: 'page-project',
      title,
      // The first wording that lands in 140-160 characters, or the closest one
      description: fitDescription([
        `${p.summary} ${p.name}${place}: a project by RJ Interiors & Constructions (RJIC), Bangalore.`,
        `${p.summary} ${p.name}${place}, by RJ Interiors & Constructions (RJIC), Bangalore.`,
        `${p.summary} ${p.name}${place}, by RJ Interiors & Constructions, Bangalore.`,
        `${p.summary} ${p.name}${place}, by RJIC, Bangalore.`,
        `${p.summary} Made for ${p.name}${place} by RJ Interiors & Constructions (RJIC) at its factory in Jakkur, Bangalore.`,
        `${p.summary} ${p.name}${place}: a project by RJ Interiors & Constructions (RJIC), made at its Jakkur factory in Bangalore.`,
      ]),
      trail: [{ name: 'Projects', path: '/projects/' }, { name: p.name, path: p.url }],
      ctaDrawing: firstWork ? firstWork.drawing : 'dome',
      styles: 'projects',
      scripts: 'projects',
    }, templates.project, { project: p });
  }

  sitemap.sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path));
  await writeFile(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemap.map((p) => `  <url><loc>${absolute(p.path)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n');
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`);

  await checkCspHashes(inlineScripts);
  for (const w of warnings) console.warn(`Warning: ${w}`);
  console.log(`Built ${Object.keys(pageFiles).length + projects.length} pages into dist/ in ${Date.now() - started} ms`);
}

// Inline <script> blocks that run, so not JSON-LD data and not ones with a src
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g;

// The Content-Security-Policy in vercel.json allows inline scripts by their hash. If one changes, the build
// stops and prints the hash to put in vercel.json, rather than shipping a page whose script would be blocked.
async function checkCspHashes(scripts) {
  const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  const csp = config.headers.flatMap((rule) => rule.headers).find((h) => h.key === 'Content-Security-Policy')?.value || '';
  const missing = [...scripts].map((code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`)
    .filter((hash) => !csp.includes(hash));
  if (missing.length) {
    throw new Error(`Add these to script-src in the Content-Security-Policy in vercel.json: ${missing.join(' ')}`);
  }
}

// Every page has one JSON-LD block that parses, and each node has what Google needs for its type
function checkJsonLd(html, where) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const need = (ok, what) => { if (!ok) throw new Error(`${where}: structured data ${what}`); };
  need(blocks.length === 1, `should be one block, found ${blocks.length}`);
  const data = JSON.parse(blocks[0][1]);
  need(data['@context'] === 'https://schema.org', 'has no schema.org context');
  for (const node of data['@graph']) {
    const type = [].concat(node['@type']);
    need(!type.some((t) => ['Product', 'Offer', 'AggregateRating', 'Review'].includes(t)), 'has product, price or rating markup');
    if (type.includes('LocalBusiness')) {
      const a = node.address || {};
      need(node.name && node.telephone && a.streetAddress && a.addressLocality && a.postalCode && a.addressCountry,
        'LocalBusiness is missing its name, phone or address');
      need(node.subOrganization?.every((o) => o.name && o.url), 'has a brand without a name or URL');
    }
    if (type.includes('WebSite')) need(node.name && node.url, 'WebSite is missing its name or URL');
    if (type.includes('BreadcrumbList')) {
      node.itemListElement.forEach((item, i) => need(item.position === i + 1 && item.name && item.item?.startsWith('https://'),
        'BreadcrumbList has an item without a position, name or URL'));
    }
    if (type.includes('FAQPage')) {
      need(node.mainEntity.length && node.mainEntity.every((q) => q.name && q.acceptedAnswer?.text), 'FAQPage has a question without an answer');
    }
  }
}

// +919900579417 → +91-99005-79417, the form the brief asks for in structured data
const dashed = (tel) => tel.replace(/^\+91(\d{5})(\d{5})$/, '+91-$1-$2');

function jsonLd(site, page, absolute, projects, faq) {
  // A LocalBusiness as well as an Organization, so the address and map can tie the site to the factory's
  // Google Business Profile
  const org = {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': absolute('/#organization'),
    name: site.name,
    alternateName: site.shortName,
    url: absolute('/'),
    logo: absolute('/assets/img/icon-512.png'),
    image: absolute('/assets/img/og-image.png'),
    legalName: site.name,
    foundingDate: site.founded,
    hasMap: site.address.mapUrl,
    email: site.emails[0],
    telephone: dashed(site.phones[0].tel),
    contactPoint: site.phones.map((ph) => ({ '@type': 'ContactPoint', telephone: dashed(ph.tel), contactType: 'sales', areaServed: site.areaServed })),
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: site.openingHours.days,
      opens: site.openingHours.opens,
      closes: site.openingHours.closes,
    },
    // Only once the factory's map coordinates are confirmed and added to site.json
    ...(site.geo ? { geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude } } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      postalCode: site.address.postalCode,
      addressRegion: site.address.region,
      addressCountry: site.address.countryCode,
    },
    areaServed: site.areaServed.map((name) => ({ '@type': 'State', name })),
    knowsAbout: site.knowsAbout,
    // The five brand websites belong to RJIC; they are not the same entity, so not sameAs
    subOrganization: site.brands.map((b) => ({ '@type': 'Organization', name: b.name, url: b.url })),
  };
  const graph = [org];
  if (page.path === '/') {
    graph.push({
      '@type': 'WebSite', '@id': absolute('/#website'), url: absolute('/'), name: site.name,
      alternateName: site.shortName, inLanguage: 'en-IN', publisher: { '@id': org['@id'] },
    });
  } else if (page.trail || page.crumb) {
    const trail = [{ name: 'Home', path: '/' }, ...(page.trail || [{ name: page.crumb, path: page.path }])];
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((step, i) => ({ '@type': 'ListItem', position: i + 1, name: step.name, item: absolute(step.path) })),
    });
  }
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage', '@id': absolute(`${page.path}#faq`), url: absolute(page.path),
      mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  }
  // The projects page lists every project page
  if (page.path === '/projects/' && projects.length) {
    graph.push({
      '@type': 'CollectionPage', '@id': absolute('/projects/#page'), url: absolute('/projects/'), name: page.title,
      about: { '@id': org['@id'] },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absolute(p.url), name: p.name })),
      },
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
}

// Icons for the enquiry buttons
const ICONS = {
  whatsapp: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5l1.2-4.1a8.5 8.5 0 1 1 3.1 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.2c.3-.6.9-.6 1.2 0l.7 1.5c.1.3 0 .6-.2.8l-.5.5c.6 1.2 1.6 2.2 2.8 2.8l.5-.5c.2-.2.5-.3.8-.2l1.5.7c.6.3.6.9 0 1.2-1 .7-2.3.8-3.4.2a9 9 0 0 1-3.6-3.6c-.6-1.1-.5-2.4.2-3.4Z" fill="currentColor"/></svg>',
  email: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5h18v13H3zM3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};

// ---------- Local preview server ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

// A vercel.json "source" such as /updates.php/42096/(.*) as a regular expression: groups stay as they
// are, everything else is matched literally
const sourcePattern = (source) => new RegExp(`^${source.split(/(\([^)]*\))/)
  .map((part, i) => (i % 2 ? part : part.replace(/[.*+?^${}|[\]\\]/g, '\\$&'))).join('')}$`);

function serve(port = 4173) {
  createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    // The same redirects and headers as on Vercel, so the preview behaves like the live site
    const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
    const redirect = config.redirects.find((r) => sourcePattern(r.source).test(url.pathname));
    if (redirect) { res.writeHead(redirect.statusCode, { Location: redirect.destination }).end(); return; }
    for (const rule of config.headers) {
      if (sourcePattern(rule.source).test(url.pathname)) for (const h of rule.headers) res.setHeader(h.key, h.value);
    }
    let file = path.join(OUT, decodeURIComponent(url.pathname));
    if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(file)) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      const body = await readFile(path.join(OUT, '404.html')).catch(() => 'Not found');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(body);
    }
  }).listen(port, () => console.log(`Serving dist/ on http://localhost:${port}`));
}

await build();
if (process.argv.includes('--serve')) {
  serve();
  let timer;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((err) => console.error(err.message)), 150);
  });
}
