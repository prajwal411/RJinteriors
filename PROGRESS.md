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
- [ ] Step 6: projects
- [ ] Step 7: /faq/
- [ ] Step 8: structured data
- [ ] Step 9: technical (redirects, headers, CSP, thumbnails, env, GA4 events)
- [ ] Step 10: finish (build, Lighthouse, summary, [ASK CLIENT] list, unconfirmed-facts list)

## Decisions (2026-10-30)

1. No forms: enquiries go to WhatsApp or email.
2. "Since 2008" is confirmed.
3. Map coordinates: the user will confirm them later, so schema `geo` is left out until then.
4. Google listing link: the client will send it. Until then, the reviews link is a Maps search.
