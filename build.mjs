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

import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
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

function parseArgs(str) {
  const args = {};
  for (const [, k, v] of str.matchAll(/(\w+)=("[^"]*"|\S+)/g)) args[k] = v.replace(/^"|"$/g, '');
  return args;
}

async function build() {
  const started = Date.now();
  const site = JSON.parse(await readFile(path.join(SRC, 'data', 'site.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(SRC, 'data', 'projects.json'), 'utf8'));
  const partials = await readDir(path.join(SRC, 'partials'), '.html');
  const drawings = await readDir(path.join(SRC, 'drawings'), '.svg');
  const layout = await readFile(path.join(SRC, 'layout.html'), 'utf8');
  const pageFiles = await readDir(path.join(SRC, 'pages'), '.html');
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const absolute = (p) => site.url.replace(/\/$/, '') + p;

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
    projects: (ctx) => (projects.length ? renderProjects(projects) : render(partials['projects-empty'], ctx)),
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
  for (const [file, raw] of Object.entries(pageFiles)) {
    const { meta, body } = parsePage(raw);
    const page = { file, bodyClass: '', ...meta };
    const ctx = { site, page };
    // Motion hooks: headings "cure" and plates draw themselves as they scroll into view
    const content = render(body, ctx)
      .replace(/<h([12])(?=[\s>])/g, '<h$1 data-cure')
      .replace(/<(div|figure) class="plate/g, '<$1 data-draw class="plate');
    const html = render(layout, ctx).replace('<!-- content -->', () => content);
    const target = page.path.endsWith('/')
      ? path.join(OUT, page.path, 'index.html')
      : path.join(OUT, page.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    if (page.sitemap !== 'no') sitemap.push(page.path);
  }

  sitemap.sort((a, b) => a.length - b.length || a.localeCompare(b));
  await writeFile(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemap.map((p) => `  <url><loc>${absolute(p)}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    '\n</urlset>\n');
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`);

  console.log(`Built ${Object.keys(pageFiles).length} pages into dist/ in ${Date.now() - started} ms`);
}

// Verified projects only. Each entry in src/data/projects.json becomes one listing.
function renderProjects(projects) {
  if (!projects.length) return '';
  return `<ol class="project-list" role="list">\n${projects.map((p) => `<li class="project" id="${esc(p.id)}">
  ${p.image ? `<figure class="project__image"><img src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" width="${p.image.width}" height="${p.image.height}" loading="lazy" decoding="async"></figure>` : ''}
  <div class="project__text">
    <h2 class="project__title">${esc(p.name)}</h2>
    <dl class="project__facts">
      <div><dt>Location</dt><dd>${esc(p.location)}</dd></div>
      <div><dt>Sector</dt><dd>${esc(p.sector)}</dd></div>
      <div><dt>Products</dt><dd>${esc(p.products)}</dd></div>
      <div><dt>Our scope</dt><dd>${esc(p.scope)}</dd></div>
      ${p.completed ? `<div><dt>Completed</dt><dd>${esc(p.completed)}</dd></div>` : ''}
    </dl>
    ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
  </div>
</li>`).join('\n')}\n</ol>`;
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
  } else if (page.crumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: absolute(page.path) },
      ],
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
