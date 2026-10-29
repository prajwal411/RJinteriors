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
- [ ] Step 2: business details and contact
- [ ] Step 3: brand network
- [ ] Step 4: homepage and on-page
- [ ] Step 5: /products/ overview
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
