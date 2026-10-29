# SEO progress: rjinteriors.in

Work follows the brief. The plan is in PLAN.md, phrases in KEYWORD-MAP.md, and old URLs in REDIRECTS.md. Branch: `seo-brief`, with one commit per step.

- [x] **Step 0: quick checks** (2026-10-30, no changes)
  - Static site built by `build.mjs` (no dependencies) with `npm run build`, output to `dist/`. Hosted on Vercel (`vercel.json`: cleanUrls, trailingSlash). The build works.
  - The final URL form is `https://www.rjinteriors.in/<path>/`. http, the bare domain and `.html` all 308 in one hop, except `http://rjinteriors.in`, which takes 2 hops.
  - robots.txt allows everything and has a Sitemap line. The live sitemap lists 35 URLs, all 200, all indexable.
  - Live security headers: only HSTS.
  - Old site: 86 page-like URLs in the Wayback Machine. `.html` pages give 404, and `.php` pages give 403 on Vercel. See REDIRECTS.md.
- [x] **Step 1: plan** (KEYWORD-MAP.md, REDIRECTS.md, PLAN.md). Approved 2026-10-30; decisions recorded at the top of PLAN.md.
- [x] **Step R: tidy the earlier work.** The 8 product pages were removed and their links point back to the `/products/#` blocks. Address, brand links, WhatsApp and email buttons, "since 2008", headers, the sitemap date fix and the project titles were kept.
- [x] **Step 2: business details and contact**
  - The address in the exact Google Business Profile wording, the main phone +91 99005 79417 and the hours ("Monday to Saturday, 9 am to 6 pm", **unconfirmed**) appear identically in the footer of every page and in "Visit the factory" on /contact/.
  - The main number is first everywhere a single number shows: header, "Or call" line, schema.
  - /contact/ has an embedded map (lazy-loaded) and a "Get directions" link.
  - The map and directions search for the address only, because searching for the business name pins a different "RJ Interiors" in Amruthahalli (560092).
  - "Read our reviews on Google" is built but hidden until the listing share link goes into `site.json` → `googleListing`, so it can't open the wrong business.
  - No form, as decided.
- [x] **Step 3: brand network**
  - All five brands are linked by name on the home page, /brands/ and in the footer of every page.
  - /brands/ has a "Which brand should I contact?" list: GRC Bangalore/Karnataka, FRP and FRP tanks, Tamil Nadu, Kerala, the rest of India, or RJIC directly. It also says every product is made at the Jakkur factory.
  - GFRC Innovation moved to the regional group as "the rest of India".
- [x] **Step 4: homepage and on-page**
  - The home H1 is "GRC and FRP manufacturer in Bangalore". "Your design, cast in GRC and FRP" is now the subheading, and the look is unchanged.
  - The made-to-order (any size and design) sentence is in the home hero and the /products/ intro.
  - RJIC and Jakkur are named in the opening text of /products/, /manufacturing/, /industries/ and /projects/.
  - The titles and descriptions follow PLAN.md.
  - Project descriptions are built to land in 140–160 characters.
  - The build now warns about any title over 60 or description outside 140–160. Current count: 0.
- [x] **Step 5: /products/ overview** (still one page)
  - 14 product blocks, each with: what it is, where it's used, what you choose, why GRC or FRP, how it's generally fixed, what to send for a quote, projects with this kind of work (generated), and a link to its page on grcbangalore.com or frpbangalore.com.
  - The tanks block is "FRP water tanks and MS FRP tanks" (water, effluent, chemicals).
  - The FRP block no longer claims FRP columns, and "sculptures" is gone from the custom GRC block, because the brief doesn't list either. Both are [ASK CLIENT].
  - The comparison table is replaced by a short note linking to gfrcinnovation.in/grc-vs-frp/.
  - FRP blocks have no project list, because no project records FRP work.
- [x] **Step 6: projects**
  - Every project in `projects.json` has the same fact fields: location, building type (sector), year, products made (work), material, finish, size or quantity, and scope.
  - 135 unknown fields are marked "[ASK CLIENT]", including 7 missing locations.
  - Each page shows only the known facts, in a fixed order, and "Products made" links to the /products/ blocks. The build fails if "[ASK CLIENT]" would reach a page.
  - A closing line names RJ Interiors & Constructions (RJIC) and the Jakkur factory. The photo-based descriptions are unchanged and not padded.
  - Product blocks link back to their projects (Step 5).
- [x] **Step 7: /faq/**
  - Seven questions: the brief's six, plus "How long have you been making GRC and FRP?" (since 2008, confirmed).
  - The answers live in `src/data/faq.json` and use site values for the address, hours, phone and email, so they always match the rest of the site.
  - Linked from the footer page list on every page, /contact/ and /brands/. Listed in the sitemap.
- [x] **Step 8: structured data** (one `jsonLd()` function in build.mjs)
  - Organization + LocalBusiness:
    - legalName, alternateName "RJIC", logo, foundingDate 2008;
    - the exact address and telephone +91-99005-79417;
    - opening hours (Mon–Sat 09:00–18:00, **unconfirmed**);
    - the five brand sites as `subOrganization`, not sameAs;
    - `geo` is added automatically once `site.json` gets `"geo": { "latitude": …, "longitude": … }`.
  - WebSite on home, BreadcrumbList on inner pages, FAQPage on /faq/, CollectionPage + ItemList on /projects/. No Product, price or rating markup.
  - Every build parses each page's JSON-LD and checks the required fields per type. Check with Google's Rich Results Test after deploying.
- [x] **Step 9: technical**
  - **Redirects:** 16 old URLs 301 to their closest page (REDIRECTS.md), tested on the local preview, which now applies `vercel.json` redirects and headers like Vercel. After deploying, check that the `.php` rules beat Vercel's 403 for `.php`.
  - **Headers:**
    - HSTS (`max-age=63072000`, the value Vercel already sends). `includeSubDomains` is deliberately left out, because mail or old-host subdomains of rjinteriors.in may not have HTTPS.
    - X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy.
    - Content-Security-Policy: scripts from self, Google Tag Manager and two hashed inline scripts; frames from google.com for the map; GA4 connections.
  - **CSP testing:**
    - Tested in headless Edge on /, /contact/, /products/, /projects/, a project page, /faq/ and /brands/ with GA4 switched on: 0 violations.
    - A deliberately disallowed script was blocked and reported, which proves the test catches violations.
    - The build stops if an inline script changes without its hash being updated in `vercel.json`.
  - **Images:** `tools/project-images.py` lowers the quality of heavy photos until they fit 100 KB per thumbnail or 250 KB per full photo; dimensions are unchanged.
    - Thumbnails total 4,451 → 4,215 KB.
    - 8 very textured photos still sit slightly over the budget at the quality floor (largest thumbnail 174 → 140 KB, largest photo 481 → 340 KB).
    - Below-the-fold images were already lazy-loaded.
  - **Environment:** `GOOGLE_SITE_VERIFICATION` adds the verification meta tag and `GA4_ID` adds GA4. Both are read at build time and nothing is hard-coded; without them the pages carry neither tag.
  - **GA4 events:** `assets/js/analytics.js` sends `contact_click` (method: phone, whatsapp or email) on every such link. There's no form, so there's no form event.
- [ ] Step 10: finish (build, Lighthouse, summary, [ASK CLIENT] list, unconfirmed-facts list)

## Decisions (2026-10-30)

1. No forms: enquiries go to WhatsApp or email.
2. "Since 2008" is confirmed.
3. Map coordinates: the user will confirm them later, so schema `geo` is left out until then.
4. Google listing link: the client will send it. Until then, the reviews link is a Maps search.
