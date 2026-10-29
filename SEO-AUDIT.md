# SEO audit: www.rjinteriors.in

Phase 1 of the SEO brief. Audited 2026-10-29.

**Setup**
- **Build:** static site built by `build.mjs` (Node, no dependencies, `npm run build`), from `src/` into `dist/`.
- **Hosting:** Vercel, configured in `vercel.json` (`cleanUrls`, `trailingSlash`).
- **Legacy files:** `.cpanel.yml` and `src/root/.htaccess` are left over from the earlier BigRock hosting.

**Two versions were checked**
- **Live:** the 35-page site Google sees today.
- **Working copy:** 44 pages, uncommitted. This session added brand links, the factory address, "since 2008", 8 product pages, schema upgrades, and header and cache settings.

The **State** column says which version each finding applies to.

## Corrections to the brief

Fix these before Phase 3. Each one changes what gets built.

| # | Brief says | Verified fact | Effect |
|---|---|---|---|
| C1 | GFRC Innovation is at gfrinnovation.com | gfrinnovation.com does not resolve. The live site is **gfrcinnovation.in**, the URL you gave earlier. | Link and plan with gfrcinnovation.in. |
| C2 | GRC Chennai has no link | It is live at **grcchennai.co.in**, but see A1. | Link it once A1 is fixed. |
| C3 | Address: "Venkateshwara Nagar", no ward number | The Google listing says "No. 162/1, Sy No 21, BBMP Ward No:05, Venkateshwar Nagar, Sampigehalli Main Road, Post, Jakkur, Bengaluru, Karnataka 560064". | NAP has to match the Google Business Profile exactly. Pick one spelling for the listing and every site. **[ASK CLIENT]** |
| C4 | "FRP tanks are likely not covered by a sister site" | frpbangalore.com/frp-products/frp-tanks/ (including MS FRP tanks) and gfrcinnovation.in/frp/tanks/ both exist. | FRP tanks don't need a page here. |
| C5 | Redirects must be single 301s | Vercel's permanent redirects are 308, which Google treats the same as 301. `http://rjinteriors.in` takes 2 hops (Vercel's own HTTPS upgrade, then apex to www). vercel.json can't merge them. | Accept 308s and the 2-hop apex chain. Every other variant is one hop. |
| C6 | Add sameAs links to the sister sites | `sameAs` means "this is the same entity". Each brand site describes a brand, not RJIC itself. | Keep the sister sites as `brand` with their url. Use sameAs only for RJIC's own profiles: Google Business Profile, LinkedIn, IndiaMART. |
| C7 | Industry pages and "GRC vs FRP" belong to this site | gfrcinnovation.in already has /applications/ (by building type) and /grc-vs-frp/. frpbangalore.com has /industrial-frp-solutions/. | Overlap. Decide which site owns each before writing (see KEYWORD-MAP.md). |
| C8 | Add a Search Console meta tag | The domain is already verified by DNS. | No tag needed. An optional env variable is harmless. |
| C9 | Products are #anchors and three brands have no links | That was true at the last commit. The working copy already has brand links and 8 standalone product pages. | Those 8 pages conflict with the site's job in the brief (see A3). |

## Findings

Severity: **Critical** = damages indexing or trust now. **High** = blocks this site's job or its leads. **Medium** = clear ranking or UX cost. **Low** = polish.

| # | Issue | Pages | Severity | Fix | State |
|---|---|---|---|---|---|
| A1 | **grcchennai.co.in canonicalises to grcchennai.com, an unrelated online-gambling site.** Its sitemap also lists grcchennai.com URLs. Google is told the real copy of every GRC Chennai page lives on a spam domain. | grcchennai.co.in, every page | Critical | On the GRC Chennai site, set every canonical, `og:url`, schema URL and sitemap `<loc>` to `https://www.grcchennai.co.in/...`. Never link grcchennai.com. | Sister site, live |
| A2 | **The five-site network repeats the same content.** All 27 projects are published on rjinteriors.in, grcbangalore.com, frpbangalore.com, grckochi.in and grcchennai.co.in. Every GRC product has a page on 3 GRC sites. grckochi.in copies 2 of 4 sentences of the Courtyard by Marriott write-up from this site word for word. This risks Google's scaled-content and doorway policies, and Google will filter all but one copy. | /projects/* and the sister sites | High | Make rjinteriors.in the home of the full project case studies, since RJIC is the manufacturer. Sister sites should show a short, different summary and link to the RJIC case study. Remove the copied sentences on grckochi.in. | Live |
| A3 | **The working copy's 8 product pages compete with sister sites.** /products/grc-jali/, grc-domes-minarets, grc-columns, grc-cornices, grc-arches-balustrades, grc-facade-panels, frp-water-tanks and frp-planters target product + city searches the brief gives to grcbangalore.com and frpbangalore.com. | /products/*/ (not live) | High | Following the brief, remove them before deploy (never live, so no redirects needed). Keep /products/ as a short overview whose sections link to the sister site's page. See A12 for the one possible exception. | Working copy |
| A4 | **Home and contact titles lack the full name.** The live home title ends "RJIC"; "RJ Interiors & Constructions" isn't in any title except /about/ (H1). Other businesses are called "RJ Interiors", so brand searches need the full name with "GRC and FRP manufacturer". | /, /contact/, /projects/ | High | For example, home: "RJ Interiors & Constructions: GRC and FRP Manufacturer" (52). Contact: "Contact RJ Interiors & Constructions, Jakkur, Bengaluru" (54). | Live and working copy |
| A5 | **Sister sites don't point back to RJIC.** The "Parent company" link and `parentOrganization` on grcbangalore.com and grcchennai.co.in point to gfrcinnovation.in. gfrcinnovation.in only has a mailto link. Only grckochi.in links to rjinteriors.in. | Sister sites | High | Point every sister site's parent-company link and `parentOrganization.url` to `https://www.rjinteriors.in/`. | Live |
| A6 | **The quote form is mailto-only** (`formEndpoint` is empty). It loses leads on phones without a mail app, can't be tracked as a conversion, and causes Lighthouse Best Practices 79 on /contact/ (an insecure `mailto:` form action is flagged as mixed content). | /contact/ | High | Use an HTTPS form endpoint (e.g. Web3Forms) and keep mailto as a fallback link. **[ASK CLIENT]** Which inbox should receive enquiries? | Live |
| A7 | **No analytics or conversion events.** | All pages | High | GA4 ID from an env variable at build time. Track events for form submits and tel:, WhatsApp and mailto: clicks. | Live |
| A8 | **NAP is incomplete.** Live shows only "Bangalore, Karnataka, India". The working copy adds the street address to the footer and /contact/. Hours (Mon–Sat 9 am–6 pm) appear nowhere, and there's no map. | Footer, /contact/ | High | One NAP block from site.json in the footer and on /contact/, written identically, with hours and an embedded map (lazy-loaded) on /contact/. Wording depends on C3. | Live / working copy partial |
| A9 | **Old-site URLs, from the Wayback Machine.** | Old URLs | Medium | Detail below. | Live |
| A10 | **Brand links.** Live: GRC Chennai, GRC Kochi and GFRC Innovation have no links. The working copy links grckochi.in, gfrcinnovation.in and grcchennai.co.in. | /, /brands/, footer | Medium | Keep the links, using brand names as link text. Hold the GRC Chennai link until A1 is fixed. | Working copy |
| A11 | **Structured data.** Live has Organization (city only), WebSite and BreadcrumbList. The working copy adds LocalBusiness with street address, `foundingDate` 2008, `hasMap`, Service and CollectionPage. Missing: `openingHoursSpecification`, `legalName`, FAQPage for visible FAQs, and per-page images. | All | Medium | Add hours. Add `legalName` once confirmed. FAQPage only where the questions are visible. **[ASK CLIENT]** Exact registered company name? | Working copy partial |
| A12 | **Product coverage gaps on the sister sites.** No sister site has a dedicated **FRP planters** page for Bangalore (frpbangalore.com has only /frp-decorative-pots/; gfrcinnovation.in/frp/pots-and-planters/ is all-India). grcbangalore.com has no **GRC fins** page (grckochi.in has one). Every other product listed in the brief has a sister page. | Sister sites | Medium | Per the brief, these are the only candidates for a page here. It's better to add them to frpbangalore.com and grcbangalore.com, where product + city belongs. | Live |
| A13 | **Colour contrast fails** on below-fold headings (home 96, products 96, contact 96). The heading "cure" animation starts headings in a pale colour (#8A6E9C on dark, #BBA9BC on light). Lighthouse doesn't scroll, so it measures that start colour. | /, /products/, /contact/ | Medium | Make the un-cured colour pass 4.5:1, or animate only the sharpness and position, not the colour. The design stays the same once the heading is in view. | Live |
| A14 | **Every page has the same og:image.** | All | Medium | Use a unique image per main page. Project and product pages can use their cover photo. | Live |
| A15 | **The /projects/ LCP image is lazy-loaded** (Lighthouse `lcp-lazy-loaded`, LCP 1.8 s). | /projects/ | Medium | Done in the working copy: the first card is eager with `fetchpriority="high"`. | Fixed, not deployed |
| A16 | **Security headers and asset caching aren't live.** Only HSTS is sent, and everything is `max-age=0`. | All | Medium | Already in the working copy's vercel.json. Deploy it. | Fixed, not deployed |
| A17 | **Home TBT is 160 ms** from the scroll-driven factory walk (walk.js is 75 KB unminified, with long tasks up to about 300 ms). CSS is render-blocking and unminified. | / | Low (scores are 98–100) | Minify CSS and JS at build, yield during walk.js setup, and load cycle.css non-blocking. Keep the design. | Live |
| A18 | **Some titles are over 60 characters:** /manufacturing/ (61), /projects/ (62), /projects/saree-manufacturer-office-dharmavaram/ (63). Live also has /brands/ at 88. | 3–4 pages | Low | Rewrite to the keyword map. | Working copy |
| A19 | **15 meta descriptions fall outside 140–160 characters.** Mostly project pages (122–181), plus /products/grc-cornices/ (139). /404.html (63) is noindex and doesn't matter. | 14 indexable pages | Low | Rewrite project descriptions from their own data, within 140–160. | Working copy |
| A20 | **The Sandur Manganese project has no photos and 13 words.** 7 projects have no location: Bismilla Green Masjid, Indian Tiffin Club, Infant Jesus Shrine, Princess Golf, TDP Office, Venkatamma Ramaiah Kalyana Soudha, Sandur. | 8 project pages | Low | Set Sandur to noindex until photos arrive. **[ASK CLIENT]** Photos and locations. | Live |
| A21 | **`/favicon.ico` returns 404.** Icons are PNG only. | Root | Low | Add a favicon.ico at the root. | Live |
| A22 | **The 404 page's canonical points to /404.html.** It's noindex and returns 404, so this is harmless. | /404.html | Low | Drop the canonical when a page is noindex. | Live |
| A23 | **Stale Apache files.** `/.htaccess` is publicly served on Vercel, and `.cpanel.yml` is still in the repo. | Root | Low | Stop copying .htaccess to dist. Remove .cpanel.yml if BigRock is retired. **[ASK CLIENT]** Is BigRock hosting still used? | Live |

**Checks that passed**
- URL form: `https://www.` with a trailing slash, and every variant redirects permanently in one hop (apart from C5).
- Internal links: all use the final form. No broken internal links and no orphan pages. Checked on all 44 working-copy pages.
- Exactly one H1 on every page. No duplicate titles or descriptions.
- robots.txt allows crawling and has a `Sitemap:` line.
- The sitemap contains only 200, indexable, canonical URLs: 35 live, 43 in the working copy. Lighthouse's robots.txt failure on /projects/ was a failed download in that run; the file returns 200.
- A real 404 status with noindex.
- No placeholder text.
- Every `<img>` has alt text, width and height.
- Every project has its own page with photos (except Sandur), a "What we made" list and descriptive alt text.

### A9: old URLs (Wayback Machine CDX)

The earlier site, archived 2016–2018, was a PHP/HTML template.

| Old URL | Now | Action |
|---|---|---|
| /about.html | 308 to /about/ (Vercel cleanUrls) | Already handled |
| /contact.html | 308 to /contact/ | Already handled |
| /index.php, /index-2.php | 403 | 301 to / |
| /index-2.html | 308 to /index-2/, then 404 | 301 to / |
| /logo.png, /images/logo.png | 404 | 301 to /assets/img/icon-512.png (optional) |
| /admin/admin/index.html and about 60 /admin/admin/upload/*.png/jpg | 308, then 404 | No equivalent. Leave as 404. |
| /css/\*, /js/\*, /fonts/\*, /images/\*, /demo/\* (template assets) | 404 | No equivalent. Leave as 404. |
| /favicon.ico | 404 | Add the file (A21) |

## Lighthouse, before

Live site, mobile, Lighthouse 12.8.2 with simulated throttling, 2026-10-29. Raw files are in rjinteriors.in-audit/lighthouse-before/.

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | LCP element |
|---|---|---|---|---|---|---|---|---|
| / | 98 | 96 | 100 | 100 | 1.3 s | 0 | 160 ms | Hero H1 |
| /products/ | 100 | 96 | 100 | 100 | 1.3 s | 0 | 0 ms | GRC intro paragraph |
| /projects/ | 99 | 100 | 100 | 92 (robots.txt download flake) | 1.8 s | 0 | 110 ms | First card image (lazy) |
| /contact/ | 100 | 96 | 79 (mailto form) | 100 | 1.5 s | 0.022 | 50 ms | Intro paragraph |

## [ASK CLIENT] so far

1. The exact address spelling to use everywhere (C3).
2. The registered company name, for `legalName`.
3. Which inbox should receive web enquiries, and whether WhatsApp should be offered (and on which number).
4. Photos for Sandur Manganese, and the locations of the 7 projects listed in A20.
5. Whether BigRock hosting is still in use.
6. Who manages the sister sites, so A1, A2 and A5 can be fixed there.
