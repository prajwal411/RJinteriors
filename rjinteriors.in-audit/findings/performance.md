# Performance / Core Web Vitals: https://www.rjinteriors.in/

Score: 91/100

Method: LAB data only (no CrUX field data: site too new, no API key; the PSI API returned HTTP 429 quota errors). Local Lighthouse 12.8.2 (npx cache build, not the 13.x that PSI runs), performance category, headless Chrome, simulated throttling (mobile = default slow-4G/4x CPU emulation; desktop preset), one run per cell. Raw JSON: rjinteriors.in-audit/raw/lh_*.json. TBT is the lab proxy for INP; there is no INP value. Single runs are noisy (+/- 10-20%).

## Metrics

| Page | Device | Perf | FCP | LCP | CLS | TBT | Speed Index | Transfer | LCP element |
|---|---|---|---|---|---|---|---|---|---|
| Home | Mobile | 99 | 1.2 s | 1.7 s | 0 | 70 ms | 2.9 s | 117 KiB | h1#hero-title |
| Home | Desktop | 100 | 0.4 s | 0.5 s | 0 | 10 ms | 1.1 s | 117 KiB | h1#hero-title |
| /products/ | Mobile | 100 | 1.0 s | 1.3 s | 0 | 0 ms | 2.4 s | 73 KiB | hero p text |
| /products/ | Desktop | 100 | 0.3 s | 0.4 s | 0 | 0 ms | 0.7 s | 73 KiB | hero p text |
| /projects/ | Mobile | 99 | 1.4 s | 1.7 s | 0 | 60 ms | 3.1 s | 825 KiB | img courtyard-by-marriott 1-thumb.webp |
| /projects/ | Desktop | 100 | 0.5 s | 0.6 s | 0 | 0 ms | 0.7 s | 1,436 KiB | same img |
| Courtyard page | Mobile | 100 | 1.0 s | 1.5 s | 0 | 0 ms | 1.9 s | 283 KiB | img 1-thumb.webp |
| Courtyard page | Desktop | 100 | 0.3 s | 0.4 s | 0 | 0 ms | 0.6 s | 459 KiB | img 1-thumb.webp |

All metrics are in the "good" band (LCP <= 2.5 s, CLS <= 0.1, TBT well under 200 ms). TTFB 30-130 ms (Vercel edge, X-Vercel-Cache HIT).

LCP breakdowns (mobile): Home = TTFB 105 ms + element render delay 636 ms. Products = 96 ms + render delay 1,240 ms. /projects/ = TTFB 122 + resource load delay 1,155 + load duration 1,456 + render 54 ms. Courtyard = 129 + load delay 220 + load 90 + render 275 ms.

Home transfer by type: HTML 16 KB (83 KB raw), fonts 48.7 KB, CSS 22 KB, JS 32 KB, images 0 (hero is a canvas plus inline SVG). DOM 1,275 elements on home mobile (under the 1,500 guideline). Main-thread work on home mobile 3.8 s (4x CPU throttle), bootup 1.1 s, of which walk.js scripting is about 1.07 s.

## What works
- CLS is 0 on every page and device. Images carry width/height, fonts use font-display: swap, animations do not shift layout.
- Excellent TTFB and tiny payloads: home is 117 KiB total, with no raster images on the home page, no third-party scripts.
- Geologica is self-hosted woff2; the latin file is preloaded with crossorigin (src/layout.html:25) and served `max-age=31536000, immutable` (vercel.json).
- Project images are WebP with thumb/full srcset, explicit dimensions, `loading="lazy" decoding="async"`.
- JS is `defer`; site.js is the only global script. The canvas hero pauses its rAF loop when off screen or the tab is hidden (walk.js ~line 1535), lowers render quality when frames are slow (~1519), and honours prefers-reduced-motion (layout.html:28-36, cycle.js, CSS). A 4 s fail-safe removes the `motion` class if JS never runs.
- Home loads only 3 small CSS files; speculationrules prefetch for internal links.

## Findings

### 1. CSS/JS served with max-age=0, must-revalidate
Severity: Medium
Evidence: `curl -I` on /assets/css/site.css and /assets/js/walk.js returns `Cache-Control: public, max-age=0, must-revalidate`. vercel.json only sets long caching for /assets/fonts/ (1 year immutable) and /assets/img/ (30 days, not immutable). Lighthouse cache-insight flags it. Every repeat view does conditional requests for 3-5 CSS/JS files; walk.js is 74.8 KB raw (unminified).
Fix: Filenames are not content-hashed (build.mjs emits plain names), so do not use `immutable` yet. Option A (now): add a vercel.json headers rule for source `/assets/(css|js)/(.*)` with `public, max-age=3600, stale-while-revalidate=86400`. Option B (best): have build.mjs append a content hash to CSS/JS filenames (site.3f9a1c.css) and rewrite references in src/layout.html and pages, then serve them `public, max-age=31536000, immutable`.

### 2. Home hero canvas costs about 1 s scripting and several long tasks on mobile
Severity: Medium
Evidence: Home mobile long tasks: 308 ms (unattributed, ~989 ms start, likely first canvas/style work), then walk.js 110, 61, 61, 50 ms (~1.5-2.0 s). walk.js scripting 1,068 ms under 4x CPU throttle; TBT 70 ms mobile (good) but this is the main INP risk. Source: src/assets/js/walk.js (74,819 B, unminified, ~1,500+ lines). The hero is one 2D canvas redrawn per frame, not a pile of CSS animations. Desktop is fine (TBT 10 ms).
Fix: (a) Minify JS/CSS in build.mjs (esbuild; walk.js should drop to roughly half raw size). (b) Split first-frame scene setup into chunks and yield between them (`scheduler.yield()` or `setTimeout`) so no task exceeds 50 ms. (c) Start the rAF loop from `requestIdleCallback` after first paint and draw a static first frame. (d) Keep the off-screen pause and slow-frame quality drop. Re-verify INP on real devices once CrUX data exists.

### 3. LCP render delay (0.6-1.2 s) on home and /products/ mobile is entrance animation gating
Severity: Medium
Evidence: Home mobile LCP 1.7 s, 636 ms is element render delay for `h1#hero-title[data-cure].in-view`; /products/ mobile LCP 1.3 s with 1,240 ms render delay (LCP is a `<p>`). Network is not the bottleneck (TTFB ~100 ms, font preloaded). Hero text starts in a hidden/revealing state controlled by the `motion` class (layout.html:28-36) and `in-view` added by site.js. Lighthouse also reports the `font-variation-settings` animation on h1/h2 `[data-cure]` as non-composited, and `--lx/--ly` custom-property animation on `.jali-light`.
Fix: Make the hero heading and lead paragraph visible on first paint (no opacity:0 start for above-the-fold LCP text; animate only transform/opacity decoration, or start reveals with CSS that does not wait for JS). Run the font-weight animation after first paint. Expected mobile LCP about 1.2-1.4 s. Already passing, so this is polish.

### 4. /projects/ loads 1.4 MB (desktop) / 825 KiB (mobile) of images; LCP image is lazy
Severity: Medium
Evidence: /projects/ desktop 1,436 KiB over 25 requests (1.39 MB images); mobile 765 KB images. The LCP image (first card, courtyard-by-marriott 1-thumb.webp) has `loading="lazy"` and no fetchpriority: mobile resource load delay 1,155 ms + load duration 1,456 ms. Lighthouse uses-responsive-images est. savings 393 KiB mobile. Largest sources in src/assets/img/projects: bismilla-green-masjid/2.webp 493 KB, indian-tiffin-club/2.webp 486 KB and 1.webp 409 KB, harrow-international-school 310-335 KB; many 160-250 KB. src/assets/img is 15 MB total. Some cards have a single-candidate srcset (e.g. royal-convention-centre-mysuru: `1.webp 1156w` only), others jump to the 768-960 px file for a 25rem card.
Fix: In the projects list and project templates (build.mjs / src/pages/projects.html), drop `loading="lazy"` and add `fetchpriority="high"` for the first 1-2 cards and for the first image on each project page. Generate 320/480/640 w variants with a tighter `sizes`; re-encode the 300-490 KB files at WebP q~70 (target < 150 KB); consider AVIF with WebP fallback.

### 5. Render-blocking, unminified CSS (2-3 files)
Severity: Low
Evidence: Home: site.css (41.7 KB raw, ~11 KB gz), home.css (26 KB, 7.4 KB gz), cycle.css (12.7 KB, 3.7 KB gz) all block render (Lighthouse est. 150 ms on mobile after first). /projects/: site.css + projects.css. Live sizes equal source sizes, so nothing is minified. Impact is small because TTFB is low and there are no third-party styles.
Fix: Minify CSS in build.mjs. Load cycle.css (below the fold) non-blocking with `media="print" onload="this.media='all'"` or inline the critical hero rules.

### 6. Fonts: only latin preloaded; no metric-matched fallback
Severity: Low
Evidence: Font transfer 48.7 KB (latin only was fetched; latin-ext 41.7 KB not requested on tested pages). font-display: swap in src/assets/css/site.css:8-21. CLS is 0 in lab, but a late font on slow networks can still shift text.
Fix: Add a fallback @font-face with `size-adjust`/`ascent-override` matching Geologica; optionally subset the latin file to used glyphs/axes. Keep the preload.

### 7. Image cache is 30 days, not immutable; HTML policy is correct
Severity: Low
Evidence: vercel.json `/assets/img/(.*)` is `public, max-age=2592000`. HTML `max-age=0, must-revalidate` with ETag is appropriate.
Fix: Keep HTML as is. If image filenames change whenever content changes, use 1 year + immutable; otherwise leave it.

### 8. No third-party cost; DOM size note
Severity: Info
Evidence: No third-party scripts, analytics or embeds on the tested pages. Home HTML is 83 KB raw but 16 KB transferred, so inline SVG is cheap on the wire. Home DOM is 1,275 elements, near the 1,500 guideline.
Fix: None required. If GA4/pixels are added later, load them after idle or first interaction. Avoid adding more inline SVG nodes to home.

## Caveats
- Lab-only, single run per cell, Lighthouse 12.8.2 locally. No INP/field data exists; re-check CrUX (CrUX Vis or API) after about 28 days of traffic.
- The score of 91 reflects very good measured vitals, discounted for no long cache on CSS/JS, unminified assets, animation-gated LCP text, and the heavy /projects/ image payload.
