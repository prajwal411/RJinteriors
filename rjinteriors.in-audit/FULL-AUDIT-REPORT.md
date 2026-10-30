# SEO audit: www.rjinteriors.in

- **Audited:** 2026-10-29 with claude-seo 2.4.2, on the live site.
- **Pages crawled:** 35 canonical pages, plus 13 query-string variants and 61 images.
- **Business type:** B2B manufacturer with a Bangalore factory and a service area across Karnataka, Tamil Nadu and Kerala (hybrid local).
- **Data limits:** no Search Console, GA4, CrUX or paid backlink data exists yet. Speed figures are lab values from Lighthouse 12.8.2. The content, AI search and search-experience checks stopped early when a usage limit was hit, so their scores come from their first, partial pass.

## SEO Health Score: 73 / 100

| Category | Weight | Score | In one line |
|---|---|---|---|
| Technical SEO | 22% | 82 | Crawlable, indexable, clean redirects, real 404s. Security headers and asset caching are not live |
| Content quality | 23% | 52 | Main pages are good. Project pages are thin (30–61 words of write-up), there are no specs, and one page covers 14 products |
| On-page SEO | 20% | 80 | Unique titles and descriptions, one H1 per page. The home H1 has no keyword, and project titles describe the place, not the work |
| Schema | 10% | 72 | Valid Organization, WebSite and BreadcrumbList. No address, so no LocalBusiness yet |
| Performance (lab) | 10% | 91 | Mobile LCP 1.3–1.7 s and CLS 0 on every page tested |
| AI search readiness | 10% | 65 | All AI crawlers allowed, server-rendered. Product passages don't name RJIC or Bangalore, and there's no off-site footprint |
| Images | 5% | 85 | WebP, srcset, width and height set, good alt text on project pages. Some thumbnails are heavy |

Not in the score:
- **Local SEO: 38.** There's no Google Business Profile, and the address, history and parent company conflict across the three sites.
- **Search experience gap: 40.**
- **Backlinks:** too little data to score.

## Top 5 issues

1. **No Google Business Profile, Search Console or Bing listing.** Google hasn't been told the site exists. A profile may already exist for GRC Bangalore or FRP Bangalore. If so, claim it; don't create a duplicate. (local.md)
2. **The three sites contradict each other.** frpbangalore.com shows a Jakkur street address, "since 2008" and "18 years". rjinteriors.in shows only "Bangalore". Both sister sites name `gfrcinnovation.in` as the parent company's website, not rjinteriors.in. The client must confirm the real facts. (local.md, backlinks.md)
3. **One /products/ page covers 14 products.** The searches you want to win ("GRC jali manufacturers in Bangalore", "FRP water tank manufacturers Bangalore", "GFRC facade panels") reward one page per product, and directories like IndiaMART rank with specs and photos. The phrase "water tank" appears nowhere on the site. (sxo.md, content.md)
4. **Thin project pages and no specifications.** The 27 project pages have 30–61 words of write-up each; Sandur has 13 words and no photos. The site has no sizes, thicknesses, lead times or finishes anywhere. These need client input and must not be invented. (content.md)
5. **The enquiry form only opens the visitor's email app.** `formEndpoint` is empty in src/data/site.json. Visitors on phones or office PCs without a mail app can't send an enquiry, so leads from search are lost. (agentic.md) **Resolved:** the form was removed, and enquiries now go to WhatsApp or email directly.

## Top 5 quick wins

1. Point the "Parent company" link on grcbangalore.com and frpbangalore.com to `https://www.rjinteriors.in/`. Those are links you control, and they're the easiest backlinks you'll get.
2. Deploy security headers (X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy) and long caching for /assets/ through vercel.json.
3. Put a keyword in the home H1, for example "GRC and FRP architectural products, made in Bangalore", and keep the slogan as a styled line. Add what was made to project titles.
4. Add a tap-to-call or WhatsApp button to the mobile header.
5. Remove `loading="lazy"` from the first project card on /projects/ and give it `fetchpriority="high"`, because it is the LCP image.

## Technical SEO: 82 (findings/technical.md)

**Passes:**
- All 35 pages return 200 with a self-referencing canonical and no noindex.
- /about, /about.html and /about/index.html each redirect in one 308 hop.
- Unknown URLs return a real 404.
- The site is static HTML (about 1,300 words on the home page without JavaScript).
- HSTS is on.

**Issues:**
- **High:** only HSTS is sent. There's no X-Content-Type-Options, Referrer-Policy, X-Frame-Options or Permissions-Policy.
- **Medium:** there's no CSP. Inline scripts mean you'd start with Report-Only.
- **Medium:** `/.htaccess` is publicly served (build.mjs copies src/root/.htaccess). It does nothing on Vercel. `.cpanel.yml` is also stale if BigRock is no longer the host.
- **Medium:** all 35 sitemap `lastmod` values are 2026-10-25.
- **Low:** http://rjinteriors.in takes 2 hops to reach https://www.
- **Low:** the 404 page's canonical points to /404.html.
- **Low:** no IndexNow key file.

## Content quality: 52 (findings/content.md, partial)

- **High:** project write-ups are 30–61 words. Sandur Manganese has 13 words, no photos and no "What we made" list.
- **High:** /products/ gives each of 14 products 12–41 words. There are no specs anywhere (no mm, kg, thickness or lead time).
- **Medium:** /products/ has no links to projects or industries, and the home page's main content doesn't link to any project.
- **Medium:** trust signals are 3 phone numbers and 2 emails only. There are no people, years active, factory photos or street address.
- Templated-metadata risk is low: no shared boilerplate was detected.

## On-page SEO: 80 (findings/onpage.md)

**Passes:**
- Unique titles and descriptions on all 35 pages, one H1 each, `lang="en-IN"`.
- Query-string variants canonicalize to the clean URL.
- No orphan pages.

**Issues:**
- **Medium:** the home H1 has no product or place keyword.
- **Medium:** project titles name only the building, for example "TDP Office | Projects | RJIC".
- **Low:** descriptions over 160 characters on home (197), /about/ (209), /brands/ (194), /products/ (187) and /projects/ (184).
- **Low:** the /brands/ title is 88 characters.

## Schema: 72 (findings/schema.md)

- Keep Organization for now. Move to LocalBusiness once the address is confirmed.
- Add `alternateName` and `inLanguage` to the WebSite node.
- Don't use the sister sites as `sameAs`.
- Pick "Bangalore" or "Bengaluru" and use it everywhere.
- **Optional:** CollectionPage and ItemList on /projects/, and CreativeWork and ImageObject on project pages.

## Performance: 91 (findings/performance.md, lab only)

| Page (mobile) | Perf | LCP | CLS | TBT |
|---|---|---|---|---|
| Home | 99 | 1.7 s | 0 | 70 ms |
| /products/ | 100 | 1.3 s | 0 | 0 |
| /projects/ | 99 | 1.7 s | 0 | 60 ms |
| Courtyard by Marriott | 100 | 1.5 s | 0 | 0 |

- **Medium:** CSS, JS, fonts and images are all served with `max-age=0` on the live site.
- **Medium:** walk.js is 75 KB unminified, with long tasks up to 308 ms on mobile. This is the INP risk.
- **Medium:** the hero text waits for the entrance animation, adding 0.6–1.2 s to LCP.
- **Medium:** /projects/ transfers 0.8–1.4 MB, and its LCP image is lazy-loaded. Some full-size WebPs are 300–490 KB.
- **Low:** CSS is unminified and render-blocking.

## AI search readiness: 65 (findings/geo.md partial, findings/agentic.md)

**Works:**
- 21 AI and search crawler user agents all get 200 with identical content. There's no bot blocking.
- /about/ defines the entity clearly.
- /products/ explains GRC and FRP and has a comparison table.

**Issues:**
- **High:** product passages never name RJIC or Bangalore, so an AI answer quoting them can't say who makes the product.
- **High:** inline elements without spaces join words in extracted text, for example "GRCGlass fibre reinforced concrete".
- **High:** there's no off-site footprint (no Google Business Profile, directories or profiles).
- **Optional:** llms.txt.

**Agent readiness: 82.** The contact form is well labelled. The mailto-only submit is the gap.

## Images: 85 (findings/images.md)

- All images are WebP with srcset and dimensions.
- The thumbnails on the /projects/ grid have `alt=""`. That's acceptable because the card text names the project.
- Some thumbnails are 117–174 KB.

## Local SEO: 38 (findings/local.md)

- **Critical:** there's no Google Business Profile for rjinteriors.in, and one may already exist for the sister brands.
- **Critical:** the address, years in business and project count conflict across the three sites.
- **High:** there are no product-plus-city pages.
- **High:** directory listings (IndiaMART, JustDial, TradeIndia, Sulekha) can't be verified.
- **High:** there's no process for asking customers for reviews.
- **Medium:** the /contact/ page has a single line about location.
- local.md has the full step-by-step Google Business Profile setup and the list of questions for the client.

## Search experience: gap 40 (findings/sxo.md, partial)

| Query | What ranks | Our page | Mismatch |
|---|---|---|---|
| GRC jali manufacturers in Bangalore | IndiaMART, TradeIndia, single-product manufacturer pages | /products/#jalis | Critical |
| GFRC facade panels Bangalore | IndiaMART listings with thickness and price per sq ft | /products/#facade-panels | Critical |
| FRP planters manufacturer Bangalore | Directories, Houzz, product pages | /products/#frp-planters | Critical |
| FRP water tank manufacturers Bangalore | Directories with capacity and price | /products/#frp-tanks | Critical |
| GRC dome manufacturer | Marketplace listings, technical references | /products/#domes-minarets | High |
| GRC cornice / columns Bangalore | IndiaMART categories, product pages | /products/#cornices | High |
| GRC manufacturers Bangalore | Directory company profiles | Home | Medium |

grcbangalore.com and frpbangalore.com already have product pages aimed at these same searches. Before building product pages here, decide which site should own each search, so the three sites don't compete with each other.

## Backlinks: insufficient data (findings/backlinks.md)

- The domain isn't in Common Crawl yet.
- Neither sister site links to rjinteriors.in. Their "parent company" link points to gfrcinnovation.in.
- backlinks.md has a starter plan for building links without paying for them.

## Needs client input

- Factory street address and PIN code, and whether it can be shown publicly
- Opening hours
- Google Maps link
- "Bangalore" or "Bengaluru"
- Whether a Google Business Profile already exists, and which account owns it
- What gfrcinnovation.in is, and whether RJIC or GFRC Innovation is the parent company
- Whether "since 2008", "18 years" and the Jakkur address on frpbangalore.com are true
- Product specs (sizes, thicknesses, finishes, tank capacities, lead times)
- Year, material (GRC or FRP) and scope for each project, plus the locations of 7 projects
- Real profile URLs (LinkedIn, IndiaMART, JustDial)
