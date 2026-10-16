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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'dist');

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
  const templates = await readDir(path.join(SRC, 'templates'), '.html');
  const partials = await readDir(path.join(SRC, 'partials'), '.html');
  const drawings = await readDir(path.join(SRC, 'drawings'), '.svg');
  const layout = await readFile(path.join(SRC, 'layout.html'), 'utf8');
  const pageFiles = await readDir(path.join(SRC, 'pages'), '.html');
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const absolute = (p) => site.url.replace(/\/$/, '') + p;

  // Projects: URLs, labels and the photo files made by tools/project-images.py
  for (const p of projects) {
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

  const helpers = {
    year: () => String(year),
    nav: (ctx) => site.nav.map((item) => {
      const current = item.key === ctx.page.nav ? ' aria-current="page"' : '';
      return `<li><a href="${item.href}"${current}>${esc(item.label)}</a></li>`;
    }).join('\n'),
    'footer-nav': () => [{ label: 'Home', href: '/' }, ...site.nav]
      .map((item) => `<li><a href="${item.href}">${esc(item.label)}</a></li>`).join('\n'),
    phones: () => site.phones
      .map((ph) => `<li><a href="tel:${ph.tel}">${esc(ph.display)}</a></li>`).join('\n'),
    emails: () => site.emails
      .map((em) => `<li><a href="mailto:${em}">${esc(em)}</a></li>`).join('\n'),
    'brand-links': () => site.brands.map((b) => b.url
      ? `<li><a href="${b.url}">${esc(b.name)}</a></li>`
      : `<li>${esc(b.name)}</li>`).join('\n'),
    'mailto-list': () => site.emails.join(','),
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
    'project-facts': ({ project: p }) => [
      p.location && ['Location', esc(p.location)],
      ['Sector', `<a href="/projects/?sector=${p.sector}">${esc(p.sectorLabel)}</a>`],
      p.images.length && ['Photos', String(p.images.length)],
    ].filter(Boolean).map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('\n'),
    'project-about': ({ project: p }) => p.description.map((para) => `<p>${esc(para)}</p>`).join('\n'),
    'project-work': ({ project: p }) => (p.work.length
      ? `<h2 class="case__heading">What we made</h2>\n<ul class="work" role="list">\n${p.work.map((item) => {
        const t = types.work[item.type];
        return `<li class="work__item">
  <span class="work__art" data-draw aria-hidden="true">${drawing(t.drawing, { material: 'line' })}</span>
  <span class="work__text"><a class="work__label" href="${t.href}">${esc(t.label)}</a><span class="work__note">${esc(item.note)}</span></span>
</li>`;
      }).join('\n')}\n</ul>`
      : ''),
    'project-gallery': ({ project: p }) => (p.images.length
      ? `<ul class="pgallery${p.images.length === 1 ? ' pgallery--single' : ''}" role="list">\n${p.images.map((image, i) => `<li class="pphoto">
  <a class="pphoto__link" href="${image.full.src}" data-lightbox="${i}" data-w="${image.full.w}" data-h="${image.full.h}">
    <span class="visually-hidden">View larger: </span>${img(image, { sizes: p.images.length === 1 ? '(min-width: 64rem) 46rem, 92vw' : '(min-width: 64rem) 23rem, (min-width: 34rem) 46vw, 92vw' })}
    <span class="pphoto__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg></span>
  </a>
</li>`).join('\n')}\n</ul>`
      : '<p class="pgallery__empty">Photos of this project aren\'t on the website yet. <a href="/contact/?type=references#enquiry">Ask us about it</a> when you get in touch.</p>'),
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
    jsonld: (ctx) => jsonLd(site, ctx.page, absolute),
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
      if (head in helpers) return helpers[head](ctx);
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
  async function writePage(page, body, extra = {}) {
    const ctx = { site, page, ...extra };
    // Motion hooks: headings "cure" and plates draw themselves as they scroll into view
    const content = render(body, ctx)
      .replace(/<h([12])(?=[\s>])(?![^>]*\bdata-nocure)/g, '<h$1 data-cure')
      .replace(/<(div|figure) class="plate/g, '<$1 data-draw class="plate');
    const html = render(layout, ctx).replace('<!-- content -->', () => content);
    const target = page.path.endsWith('/')
      ? path.join(OUT, page.path, 'index.html')
      : path.join(OUT, page.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    if (page.sitemap !== 'no') sitemap.push(page.path);
  }

  for (const [file, raw] of Object.entries(pageFiles)) {
    const { meta, body } = parsePage(raw);
    await writePage({ file, bodyClass: '', ...meta }, body);
  }

  // One page per project, from src/templates/project.html
  for (const p of projects) {
    const place = p.location ? `, ${p.location}` : '';
    const firstWork = p.work[0] && types.work[p.work[0].type];
    await writePage({
      file: `project ${p.id}`,
      path: p.url,
      nav: 'projects',
      bodyClass: 'page-project',
      title: `${p.name}${place} | Projects | RJIC`,
      description: `${p.summary} ${p.name}${place}: a project by RJ Interiors & Constructions, Bangalore.`,
      trail: [{ name: 'Projects', path: '/projects/' }, { name: p.name, path: p.url }],
      ctaDrawing: firstWork ? firstWork.drawing : 'dome',
      styles: 'projects',
      scripts: 'projects',
    }, templates.project, { project: p });
  }

  sitemap.sort((a, b) => a.length - b.length || a.localeCompare(b));
  await writeFile(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemap.map((p) => `  <url><loc>${absolute(p)}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    '\n</urlset>\n');
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`);

  console.log(`Built ${Object.keys(pageFiles).length + projects.length} pages into dist/ in ${Date.now() - started} ms`);
}

function jsonLd(site, page, absolute) {
  const org = {
    '@type': 'Organization',
    '@id': absolute('/#organization'),
    name: site.name,
    alternateName: site.shortName,
    url: absolute('/'),
    logo: absolute('/assets/img/icon-512.png'),
    email: site.emails[0],
    telephone: site.phones[0].tel,
    contactPoint: site.phones.map((ph) => ({ '@type': 'ContactPoint', telephone: ph.tel, contactType: 'sales' })),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.countryCode,
    },
    areaServed: site.areaServed.map((name) => ({ '@type': 'State', name })),
    knowsAbout: site.knowsAbout,
    brand: site.brands.map((b) => (b.url ? { '@type': 'Brand', name: b.name, url: b.url } : { '@type': 'Brand', name: b.name })),
  };
  const graph = [org];
  if (page.path === '/') {
    graph.push({ '@type': 'WebSite', '@id': absolute('/#website'), url: absolute('/'), name: site.name, publisher: { '@id': org['@id'] } });
  } else if (page.trail || page.crumb) {
    const trail = [{ name: 'Home', path: '/' }, ...(page.trail || [{ name: page.crumb, path: page.path }])];
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((step, i) => ({ '@type': 'ListItem', position: i + 1, name: step.name, item: absolute(step.path) })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
}

// ---------- Local preview server ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

function serve(port = 4173) {
  createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
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
