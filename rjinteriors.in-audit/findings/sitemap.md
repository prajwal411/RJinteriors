# Sitemap audit - https://www.rjinteriors.in/

Score: 86/100

## What works
- /sitemap.xml returns 200, application/xml, valid urlset (sitemap_discovery.py: found via robots.txt, valid; 3 common alternate paths 404, expected). 35 URLs, ~4 KB, far under 50,000 URLs / 50 MB. No sitemap index needed.
- All 35 URLs return 200 directly (no redirect hops), each with a self-referencing canonical, and no noindex in the HTML.
- Trailing slash consistent: every <loc> ends in "/" and matches vercel.json ("trailingSlash": true, "cleanUrls": true). /about -> 308 -> /about/ confirms the canonical form.
- No deprecated priority/changefreq tags. XML header and namespace correct. robots.txt declares the sitemap with an absolute URL.
- 404 page is excluded via `sitemap: no` (src/pages/404.html:6; build.mjs:279). Real unknown URLs return 404.
- Coverage: /projects/ links to all 27 project slugs; the 7 top-level pages link to /, /brands/, /contact/, /manufacturing/, /products/, /projects/ (and others). No orphans, no indexable internal page missing from the sitemap (site-wide href="/..." set in src matches sitemap set).

## Findings

### 1. lastmod is identical on all 35 URLs and not reliable (Medium)
Evidence: every entry has `<lastmod>2026-10-25</lastmod>`. Correction to the brief: build.mjs does not use the build date. It uses `lastCommit(page.source)` (build.mjs:85-93, used at :279), which runs `git log -1 --format=%cs -- <file>`. Locally the per-file dates differ (about/brands/contact/industries/products 2026-10-20, projects 2026-10-16, manufacturing 2026-10-15, index 2026-10-25), so the live identical value almost certainly means Vercel's shallow clone (history truncated to HEAD, last commit 2026-10-25) made every file report the HEAD date. Uniform dates make Google discount lastmod entirely.
Further weaknesses in the logic:
- All 27 project pages use `source: 'src/data/projects.json'` (build.mjs:295), so editing one project bumps all 27, and the date can never differ per project.
- Layout/partial/template changes (src/layout.html, src/templates/project.html) are not tracked, so a footer or nav change does not move anything; conversely it is also arguably right not to.
- The working tree has uncommitted changes to build.mjs and pages; the dates reflect commits, not the deployed content.
Fix:
1. Make Vercel history available: set the project's build to fetch full history (e.g. buildCommand `git fetch --unshallow || true; npm run build`; Vercel allows this, and if the fetch is blocked fall back to option 2).
2. Better and zero-dependency: key lastmod per page content. For project pages, track a per-project date: either a `updated` field (real date set by the editor when the project is actually changed) in projects.json, or compute `git log -1 --format=%cs -L`-free alternative by hashing each project's JSON object at build time and storing {hash, date} in a committed `src/data/lastmod.json` that the build updates only when the hash changes. The hash approach needs no git history on the server and gives true per-page dates.
3. For static pages, take the max of the page file date and, optionally, dates of partials it includes. Omit lastmod when unknown (build.mjs:311 already does) rather than emit a wrong one.
4. Do not touch lastmod for cosmetic builds.
Severity note: not harmful (Google just ignores it), so Medium/Low; fix when convenient.

### 2. Sitemap not yet submitted; no Search Console (Medium)
Evidence: brief states no Search Console; robots.txt is the only discovery path.
Fix: after verifying www.rjinteriors.in (domain property preferred) submit https://www.rjinteriors.in/sitemap.xml, and add it to Bing Webmaster Tools. Check the Page indexing report 1-2 weeks later for "Discovered - not indexed" on project pages.

### 3. Image sitemap: optional, low value (Low)
Evidence: project pages carry 4-10 <img> each (live crawl of the 27 pages); images are served from /assets/img/ (src/assets/img/projects, 26 files). Google no longer needs image extension tags for discovery when images are in standard <img> tags in crawlable HTML, and Google deprecated several image-sitemap tags in 2022 (only <image:loc> remains).
Fix (optional): if the team wants it, add `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` and one `<image:loc>` per photo (absolute URL) inside each project <url> in build.mjs:311, generated from the same data in projects.json. Only include photos shown on that page, with real alt text already present on the page. Prioritise instead: descriptive alt text, real file names, and not lazy-loading via data attributes that hide the src from crawlers (the lightbox placeholder `src="data:,"` in src/templates/project.html:53 is a single UI element and fine).

### 4. Ordering by path length (Info)
Evidence: build.mjs:308 sorts by path length. Harmless; Google ignores order. Home-first then alphabetical would be easier to diff, purely cosmetic.

### 5. Hardening suggestion (Info)
Add a build-time assertion in build.mjs that every sitemap <loc> exists as a built file and that no page with `noindex` is included, so future pages cannot drift out of consistency.

## Checks summary
| Check | Result |
|---|---|
| XML valid | Pass |
| Size/URL limits | Pass (35 URLs) |
| All URLs 200 | Pass (35/35) |
| Redirects inside sitemap | Pass (none) |
| Self-canonical | Pass (35/35) |
| noindex | Pass (none) |
| Trailing-slash consistency | Pass |
| Missing from sitemap | None found |
| Orphans | None found |
| priority/changefreq | Pass (absent) |
| lastmod accuracy | Fail/weak (all identical) |
| Submitted to GSC | Not yet |
