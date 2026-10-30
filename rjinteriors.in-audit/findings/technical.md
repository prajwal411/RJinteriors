# Technical SEO findings: https://www.rjinteriors.in/

Score: 82/100

Lab/HTTP checks run 2026-10-29. No GSC/CrUX field data exists. Core Web Vitals not re-measured here (see PSI files in raw/); crawl.json was not available, so canonicals/robots/H1/viewport were checked by fetching all 35 sitemap URLs directly.

## What works
- All 35 sitemap URLs return 200, with a self-referencing absolute canonical equal to the sitemap URL, no meta robots, exactly one H1 and a viewport meta tag.
- Real 404 status for unknown URLs (/zz-nonexistent-123/, /projects/zz/); 404 page carries noindex.
- Trailing slash consistent: /about 308 -> /about/; /about/index.html 308 -> /about/; /about.html 308 -> /about/. One hop each, no duplicates.
- robots.txt valid (Allow: /, Sitemap line); sitemap.xml valid urlset, 35 URLs, helper validated it.
- Content is static HTML in the raw response (homepage ~1,300 words without JS); JSON-LD present; no SPA dependence. Font preload present.
- No X-Robots-Tag on any tested response.
- Hosted on Vercel edge (bom1) with HSTS.

## Findings

### 1. Security headers in vercel.json are NOT live
Severity: High
Evidence: `vercel.json` working copy defines X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy and cache headers (lines 5-23), but `git status` shows vercel.json as modified/uncommitted. Live responses (curl -D on / and /about/, 2026-10-29) show only Strict-Transport-Security; none of the four headers, and no Cache-Control override on assets.
Fix: commit and push vercel.json, redeploy, then re-curl to confirm.

### 2. No Content-Security-Policy, and HSTS is minimal
Severity: Medium
Evidence: no CSP header anywhere. HSTS is `max-age=63072000` without includeSubDomains or preload (Vercel default).
Fix: add a CSP header in vercel.json. The site has inline scripts (layout.html lines 22-37, ld+json, speculationrules), so start with `Content-Security-Policy-Report-Only` or use hashes: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-...'; frame-ancestors 'self'`. Add `includeSubDomains` to HSTS only after confirming all subdomains are HTTPS; preload is optional. (X-Frame-Options already planned; keep alongside frame-ancestors.)

### 3. http://rjinteriors.in takes 2 redirect hops
Severity: Medium
Evidence: `curl -L http://rjinteriors.in/` -> 308 https://rjinteriors.in/ -> 308 https://www.rjinteriors.in/ (num_redirects=2). http://www and https://apex are each 1 hop.
Fix: Vercel dashboard cannot skip this for the apex over http; acceptable (Google follows up to 10 hops). Low urgency; just ensure the apex domain is set to redirect to www in Vercel domain settings (already so). Info-level cost only.

### 4. Sitemap lastmod is not meaningful
Severity: Medium
Evidence: all 35 `<lastmod>` values are 2026-10-25. build.mjs:84-92 derives them from `git log -1 --format=%cs -- <source>`, but locally src/pages/about.html was last committed 2026-10-20 and src/templates/project.html / src/data/projects.json 2026-10-16, so the live dates do not match file history. Likely cause (unverified): Vercel's shallow clone makes every file's "last commit" the newest commit (2026-10-25). Result: every URL carries one build-like date, which Google learns to ignore. Uncommitted edits (8 files in src/pages) are also not reflected.
Fix: make lastmod come from a reliable source (a `modified` field in site.json/projects.json, or a full-depth git fetch in the Vercel build), or omit lastmod until accurate.

### 5. Stale cPanel/Apache files shipped to Vercel
Severity: Medium
Evidence: `https://www.rjinteriors.in/.htaccess` returns 200 (application/octet-stream), exposing server config; src/root/.htaccess is copied into dist by build.mjs:263-264. It targets Apache (ErrorDocument, mod_expires, commented HTTPS rewrite) and does nothing on Vercel. `.cpanel.yml` (BigRock deploy, DOMAIN=rjinteriors.in) is also stale and is only repo clutter. Also /404.html returns 308 (cleanUrls), harmless.
Fix: delete src/root/.htaccess (or stop copying it; also update the comment in src/root and build.mjs:263) so it is not published; delete .cpanel.yml and README references if the cPanel host is retired. Keep them only if the BigRock hosting is a live fallback (Needs client input: confirm the old host is decommissioned).

### 6. 404 page canonical points to /404.html
Severity: Low
Evidence: 404 response has `<link rel="canonical" href="https://www.rjinteriors.in/404.html">` plus noindex (status 404, so no impact).
Fix: omit canonical on the 404 template.

### 7. IndexNow not set up
Severity: Low
Evidence: /indexnow.txt and any key file return 404; no key in src/root.
Fix: generate a key, place `<key>.txt` in src/root (contents = key), and submit URLs to api.indexnow.org after each deploy. Benefits Bing/Yandex/Naver only; becomes useful once Bing Webmaster Tools is registered.

### 8. Aggressive speculation rules
Severity: Low
Evidence: layout.html:39 `prefetch` of `/*` with eagerness `moderate` on every page. Chrome-only, but prefetching on hover can inflate server hits and distort future analytics.
Fix: keep, or restrict `where` to main nav links, and ensure analytics ignore prefetch loads when GA4 is added.

### 9. Other notes (Info)
- No llms.txt (404); optional, not a ranking factor.
- Cache-Control is `max-age=0, must-revalidate` on HTML (correct); static asset cache headers depend on finding 1.
- Mobile: viewport meta present on all pages; touch-target and CWV assessment from CSS not performed in this pass.
- Unverified: JS-disabled visual rendering (the `js`/`motion` class fallback at layout.html:22-37 removes hidden state after 4s if site.js fails; not tested in a browser here).

## Category status
Crawlability PASS; Indexability PASS; Security PARTIAL (finding 1-2); URL structure PASS; Mobile PASS (viewport); JS rendering PASS; Structured data present (not validated here); IndexNow not configured.
