# SEO audit: www.rjinteriors.in

Checked live on 2026-11-24. The deployment was last modified on 2026-11-14 (Vercel `Last-Modified`). This is an audit only: no code was changed. Every finding below comes from the live pages, and each fix names the source file it lives in.

**SEO health score: 75 / 100.** Technical setup, titles and redirects are in good shape. The score is held down by thin project pages and by wrong business facts (the retired phone number, and the claim that FRP is made at Jakkur). Those facts matter more to the client than the score suggests.

| Category | Weight | Score | Main reason |
|---|---|---|---|
| Technical SEO | 22% | 85 | Redirects, canonicals, robots and headers are good. The sitemap has no `lastmod`. |
| Content quality | 23% | 55 | Project pages have 13–61 words each. The single-factory wording is wrong. |
| On-page SEO | 20% | 85 | Every title and description is within range, and the home H1 is right. |
| Structured data | 10% | 70 | Valid, but it carries the retired number and an address-search `hasMap`. |
| Performance | 10% | 85 | Lab score 90 on mobile (Lighthouse in PROGRESS.md). Not re-measured today; see 3.1. |
| AI search readiness | 10% | 65 | Clear entity data, but the project facts are missing. |
| Images | 5% | 90 | All WebP, with dimensions and alt text. 5 thumbnails are just over 100 KB. |

---

## 1. Critical: fix now

### 1.1 The retired number +91 78921 42197 is on every page (the last audit found 1)

It appears **73 times on 37 URLs**:
- **Footer "Call" list:** all 36 sitemap pages and the 404 page.
- **/contact/ "Call" box:** a second copy.
- **Organization JSON-LD `contactPoint`:** all 36 pages, as `+91-78921-42197`.

All of these come from one line, [src/data/site.json:19](src/data/site.json#L19). Delete that entry from `phones`. The footer list ([src/partials/footer.html:20](src/partials/footer.html#L20)), the /contact/ list ([src/pages/contact.html:49](src/pages/contact.html#L49)) and `contactPoint` ([build.mjs:498](build.mjs#L498)) all read that array, so they all update.

*How we'd know it failed:* after the deploy, `curl` every sitemap URL and the 404 page, then search for `78921`. The search should find nothing.

### 1.2 +91 63633 85312 has no WhatsApp link

It appears only as a `tel:` link (37 times). Every WhatsApp button and link on the site (about 180) goes to 99005 79417, because `site.json` has a single `whatsapp` entry ([build.mjs:193](build.mjs#L193)).
- **Fix:** in the footer "Call" list and the /contact/ "Call" box, add a WhatsApp link next to each number (`https://wa.me/916363385312`).
- **Keep:** 99005 79417 as the default for the "WhatsApp us" buttons.

### 1.3 No Google link points to the GRC BANGALORE listing

None of the Google links opens the listing. All three search for the street address instead:

| Where | Link today |
|---|---|
| /contact/ map embed | `google.com/maps?q=<address>&output=embed` |
| "Get directions" (/contact/ and the FAQ answer) | `google.com/maps/dir/?api=1&destination=<address>` |
| JSON-LD `hasMap` (all 36 pages) | `google.com/maps/search/?api=1&query=<address>` |

- **The good part:** nothing links to or quotes an "RJ Interiors" or "RJ Interiors & Constructions" listing. There are no review quotes, ratings or review markup anywhere. The "Read our reviews on Google" link stays hidden while `googleListing` in [src/data/site.json:16](src/data/site.json#L16) is empty.
- **The risk:** an address search can still land on a different pin. PROGRESS.md notes that searching by name pins another "RJ Interiors" in Amruthahalli.
- **Fix:** get the GRC BANGALORE listing's share link and Place ID.
  - Put the share link in `googleListing`.
  - Use it for `hasMap` ([build.mjs:495](build.mjs#L495)) and for "Get directions" (`?api=1&destination=GRC+BANGALORE&destination_place_id=<id>`).
  - Embed the map by Place ID.
- **ASK-CLIENT.md needs correcting:** question 1 still asks for the "RJ Interiors & Constructions" listing. Change it to ask for the GRC BANGALORE listing.

### 1.4 The site says GRC and FRP are made in one factory

The home page still has the heading **"Two materials, one factory"** ([src/pages/index.html:61](src/pages/index.html#L61)). The same claim appears in at least 15 other places. Only GRC is made at Jakkur; FRP comes from FRP Bangalore's own factory.

| Live text | Page | Source |
|---|---|---|
| "Two materials, one factory" | home | [index.html:61](src/pages/index.html#L61) |
| "has made GRC and FRP products to order at our factory in Jakkur" | home hero | [index.html:17](src/pages/index.html#L17) |
| "Made at our factory in Jakkur, Bangalore" (hero badge) | home | [index.html:22](src/pages/index.html#L22) |
| "every product they offer is made at our factory in Jakkur" | home | [index.html:218](src/pages/index.html#L218) |
| Meta description: "Every product is made at our Jakkur factory." | /brands/ | [brands.html:3](src/pages/brands.html#L3) |
| "every product all five offer is made at our factory in Jakkur" | /brands/ | [brands.html:16](src/pages/brands.html#L16) |
| "Products for all five brands are manufactured at the same factory in Jakkur" | /brands/ | [brands.html:26](src/pages/brands.html#L26) |
| "The products are the same, and they are all made at our Jakkur factory" | /brands/ | [brands.html:39](src/pages/brands.html#L39) |
| "has made custom GRC and FRP products at its factory in Jakkur" (meta description) | /about/ | [about.html:3](src/pages/about.html#L3) |
| "GRC and FRP … at its facility in Bangalore" | /about/ | [about.html:16](src/pages/about.html#L16) |
| "All five are supplied from our factory in Jakkur" | /about/ | [about.html:65](src/pages/about.html#L65) |
| "Both materials are produced at our facility in Bangalore" | /manufacturing/ | [manufacturing.html:71](src/pages/manufacturing.html#L71) |
| "makes every product here … at its factory in Jakkur" | /products/ | [products.html:16](src/pages/products.html#L16) |
| "RJIC moulds every FRP product below … at its factory in Jakkur" | /products/ | [products.html:180](src/pages/products.html#L180) |
| "Every product that RJIC and its five brands supply is made there" | /faq/ (text and FAQPage schema) | [faq.json:4](src/data/faq.json#L4) |
| "All five are supplied from our factory in Jakkur" | /faq/ | [faq.json:20](src/data/faq.json#L20) |

**Also check:**
- the single "Manufacturing facility" pin on the map ([src/partials/map.html:16](src/partials/map.html#L16));
- "Scroll to walk through the factory" in the home animation, which shows FRP being made ([index.html:30](src/pages/index.html#L30));
- the meta descriptions on the home page and /manufacturing/, which put "GRC and FRP" next to "Jakkur".

**Fix:** say that GRC is made at Jakkur and FRP at FRP Bangalore's own factory. Name no FRP address until it is confirmed.

**Project pages:** every one ends "Made by RJIC at its factory in Jakkur" ([build.mjs:290](build.mjs#L290), [build.mjs:415](build.mjs#L415)). That is right only if the project was GRC, and no project's material is confirmed yet (`material` is "[ASK CLIENT]"). Keep the line only where the work is confirmed as GRC.

---

## 2. High: fix this week

### 2.1 Project pages are thin, and the fact blocks are mostly empty

Each of the 27 project pages has 13–61 words of its own text, counted without the shared closing line. The median is 42 words. The fact block shows at most 4 fields: Location, Building type, Products made, Photos. None shows year, material (GRC/FRP), finish, size or quantity, or scope, because all 135 of those fields are still "[ASK CLIENT]".

| Page | Own words | Facts shown | Photos |
|---|---|---|---|
| sandur-manganese-iron-ores | 13 | Building type only | 0: "Photos of this project aren't on the website yet." |
| iskcon-temple-coimbatore | 30 | 4 | 1 |
| cmh-hospital-kolar, victoria-hospital-bengaluru | 33 | 4 | 1 |
| harrow-international-school, janatha-bazar-basavana-bagewadi | 34 | 4 | 2 |
| basil-wood-international-gunjur | 35 | 4 | 1 |
| bismilla-green-masjid, indian-tiffin-club, infant-jesus-shrine, princess-golf, tdp-office, venkatamma-ramaiah-kalyana-soudha | 41–47 | 3 (no location) | 2–5 |
| courtyard-by-marriott-bengaluru (the longest) | 61 | 4 | 3 |

- **Placeholder text:** no "[ASK CLIENT]", lorem or TBD reached any page; the build guard works. The only placeholder-like text is Sandur's empty-gallery line.
- **Sandur:** it also has no "Products made" fact.
- **Ranking risk:** these pages are where the brand sites send visitors. They will struggle to rank for "[project] + GRC" until they carry real facts.
- **Fix:** get the ASK-CLIENT.md project answers back, or at least year, material and scope. Once the fields are filled in `projects.json`, the fact block shows them automatically.
- **Sandur:** either get photos, or drop it from the "More projects" cards until it has some.
- **URLs:** keep every project URL exactly as it is. All 27 return 200 today.

### 2.2 The email route fails on a phone with no email app

- **There is no enquiry form.** The site has no `<form>`, as decided in PLAN.md.
- **What /contact/ offers:**
  - "Chat on WhatsApp";
  - "Write an email", which is a plain `mailto:` link;
  - every project page also has an "Email us" `mailto:` button.
- **What fails:** on a phone with no email app set up, tapping a `mailto:` button does nothing or shows a system error. No script catches this: site.js has no fallback.
- **What still works:**
  - WhatsApp is the first and most visible option on every page;
  - the email address is shown as text on /contact/, where it can be long-pressed and copied.

**Fix (pick one):**
- **(a)** Add a "Copy email address" button next to each "Write an email".
- **(b)** Build a small form that opens WhatsApp with the fields filled in. Nothing is stored, so `form-action 'self'` in the CSP still holds.

Either way, the GA4 event can't be measured yet (see 2.4).

### 2.3 The brand sites' GRC-vs-FRP link now redirects to an unrelated page

/products/ and /faq/ link to `gfrcinnovation.in/grc-vs-frp/`. That URL now 301s to `/grc/`, titled "GRC (GFRC) manufacturer in India", which is not a comparison.
- **Fix:** point the two links at the right page on gfrcinnovation.in, or remove the comparison wording.

The other 18 brand-site links all return 200. All five domains are correct on every page, each linked 40 times: grcbangalore.com, frpbangalore.com, grcchennai.co.in, grckochi.in and gfrcinnovation.in.

### 2.4 GA4 and Search Console verification are not live

- **GA4:** no page loads `googletagmanager.com` or a `G-` ID, so `contact_click` events aren't being recorded. Set `GA4_ID` in Vercel (Project → Settings → Environment Variables) and redeploy.
- **Search Console:** no verification meta tag either. That is fine if the domain is verified by DNS, as PROGRESS.md says.

---

## 3. Medium: fix this month

### 3.1 Home page mobile speed

**Not re-measured today:**
- The PageSpeed Insights API was over its daily quota.
- Installing Lighthouse locally was blocked by a permission check in this session.
- Re-run with `npx lighthouse https://www.rjinteriors.in/ --form-factor=mobile`, or at pagespeed.web.dev.

**Last lab result (PROGRESS.md, before deploy):** mobile 90, LCP 2.80 s, TBT 180 ms.

**What was measured today, over the wire:**

| Resource | Compressed | Uncompressed |
|---|---|---|
| HTML | 16.9 KB | 89.7 KB |
| 3 CSS files | 22 KB | 80 KB |
| Font | 48.5 KB | |
| 4 deferred scripts | 29.5 KB | |
| **Total** | **117 KB** | |

- **Images:** the home page has none (62 inline SVGs).
- **walk.js** (74.8 KB uncompressed) drives the scroll animation and is the main source of blocking time.

**What to try:**
- Load walk.js only when the walk section scrolls into view.
- Merge `home.css` and `cycle.css` into `site.css` so there are fewer render-blocking requests.
- The LCP element is text that waits for the font. Check that `font-display: swap` is set for Geologica.

### 3.2 Structured data corrections

The JSON-LD parses on all 36 pages. The page types:
- every page: Organization + LocalBusiness;
- the home page: WebSite;
- inner pages: BreadcrumbList;
- /projects/: CollectionPage + ItemList;
- /faq/: FAQPage.

There is no Product, rating or review markup, which is correct. To fix:
- **Retired number:** remove the `+91-78921-42197` ContactPoint. Fixing 1.1 does this.
- **`hasMap`:** point it at the GRC BANGALORE listing, as in 1.3.
- **`areaServed`:** it lists only Karnataka, Tamil Nadu and Kerala. FRP Bangalore serves all of South India, and GFRC Innovation serves the rest of India. Change it to `India`, or list the regions the brands really cover ([src/data/site.json](src/data/site.json) `areaServed`).
- **FAQPage:** its "Where is your factory?" answer repeats the single-factory claim. Fixing 1.4 corrects it. Google no longer shows FAQ rich results (retired 7 May 2026). The markup does no harm, but it brings no Google search feature.
- **`geo`:** still left out until the client confirms coordinates.
- **Project pages:** they have only BreadcrumbList. Once the facts arrive, a `CreativeWork` node per project (name, `locationCreated`, `dateCreated`, `material`, `creator`: `#organization`, `image`) would make them machine-readable. Low effort, because the data is already in `projects.json`.

### 3.3 The sitemap has no `lastmod`

`sitemap.xml` lists the 36 URLs but no dates. Adding `lastmod` from the build date or each file's change date helps Google recrawl edited project pages sooner.

### 3.4 Email address spelling

The main email is `grcbanglore@gmail.com` ("banglore"). It is used in every `mailto:` link and in the schema. If that is the real inbox, leave it. If not, every email enquiry is lost. Confirm it with the client.

---

## 4. Low: backlog

- **Old URLs:** none of the 31 page-like URLs in the Wayback Machine 404 unexpectedly. All 16 redirects in REDIRECTS.md work, in 1–2 hops (an `.html` or `updates.php` address takes 2). The URLs that still 404 are the ones REDIRECTS.md deliberately leaves:
  - furniture, water bodies and murals (`products8e52`, `products97e1`, `productsd704`);
  - paintings and wall art (`updates.php/36517`, `/41207`);
  - the old admin pages.

  If the client confirms murals are still offered, redirect `productsd704.html` and `/productsd704/` to `/products/#grc-custom`.
- **`http://rjinteriors.in`** takes 2 hops: first to `https://rjinteriors.in`, then to `https://www.`. Fine for Google. A single hop needs a domain redirect set in Vercel.
- **Security headers:** all present.
  - Sent: HSTS (2 years), CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy.
  - HSTS has no `includeSubDomains`, on purpose (see PROGRESS.md).
  - Optional: `Cross-Origin-Opener-Policy: same-origin`.
- **Images:**
  - 61 WebP files (4.2 MB of thumbnails), all with width and height.
  - The 27 hidden lightbox `<img src="data:,">` placeholders have no dimensions, which is harmless.
  - Five thumbnails are slightly over the 100 KB budget: commercial-complex-malleswaram 1 and 2 (137–143 KB), indian-tiffin-club 1 and 2, and bismilla-green-masjid 2.
  - Project photos have descriptive alt text. Card images in links use `alt=""`, which is correct because the card text names the project.
- **The 404 page** returns a real 404 and is `noindex`. It shows the retired number too, which fixing 1.1 removes.
- **llms.txt** is missing. It is optional, and Google ignores it.

---

## 5. Checked and fine

- **Status:** all 36 sitemap URLs return 200. Each has one canonical pointing to itself, no `noindex` and full Open Graph tags. robots.txt allows everything and names the sitemap.
- **Titles:** 36–60 characters, none duplicated.
- **Meta descriptions:** 140–160 characters, none duplicated.
- **H1s:** exactly one per page. The home H1 is "GRC and FRP manufacturer in Bangalore".
- **Product pages:** none. Product searches are left to the brand sites, and /products/ is one overview page linking out to them.
- **Brand links:** all five brands are linked on every page with the correct domains.
- **Contact details:** the address matches the brief word for word everywhere. The main number +91 99005 79417 comes first everywhere a single number shows.

---

## 6. Order of work

1. **1.1** Delete the retired number from `site.json`. It's one line, and it also fixes the schema and the 404 page.
2. **1.4** Rewrite the single-factory wording, including the /brands/ and /about/ meta descriptions and the FAQ answers.
3. **1.2** Add a WhatsApp link for +91 63633 85312.
4. **2.3** Fix the gfrcinnovation.in comparison link.
5. **2.4** Set `GA4_ID` in Vercel and redeploy.
6. **1.3** Get the GRC BANGALORE share link and Place ID, then switch the map, directions and `hasMap` to them. Correct ASK-CLIENT.md question 1 first.
7. **2.2** Add the email fallback.
8. **2.1** Chase the project facts from the client. Add `CreativeWork` schema once they arrive (3.2).
9. **3.1** Re-run mobile Lighthouse, then lazy-load walk.js if TBT is still above 200 ms.
10. **3.3, 3.4** and section 4 as time allows.

**What to watch after the deploy (in Search Console):**
- Coverage: 35 indexed pages after the fixes (36 before, minus Sandur, which is now noindex until its photos arrive).
- Queries for "RJ Interiors & Constructions" and "RJIC".
- Impressions on /projects/* pages, which should rise once the facts are added.

---

## 7. Before and after the fixes

"Before" is the live site on 2026-11-24. "After" is the local build of branch `seo-fixes-2`, which is not live until it is merged and deployed. PROGRESS.md has the details for each step.

| Check | Before (live) | After (branch) |
|---|---|---|
| +91 78921 42197 | 73 times on 37 URLs (footer, /contact/, 404, schema) | 0 |
| +91 63633 85312 on WhatsApp | Call link only | Call and WhatsApp links wherever numbers are listed (footer on every page, /contact/) |
| "Two materials, one factory" and similar | 1 heading and about 16 sentences, including 2 meta descriptions and the FAQ | 0. GRC is made at the Jakkur unit and FRP at FRP Bangalore's own factory, all in Bangalore |
| Project pages "made at its factory in Jakkur" | 27 pages | 0. "These elements were made by RJ Interiors & Constructions (RJIC) in Bangalore." |
| Google links | Map, directions and schema `hasMap` all search the address | Map and directions unchanged until the GRC BANGALORE link arrives; schema `hasMap` removed; reviews link still hidden |
| GRC vs FRP link | gfrcinnovation.in/grc-vs-frp/ (301 to /grc/) | https://www.gfrcinnovation.in/, "GFRC Innovation: GRC and FRP across India" |
| Email without an email app | `mailto:` buttons only | The address as plain text beside every email button |
| Brand regions | Chennai/Tamil Nadu, Kochi/Kerala, FRP products | Tamil Nadu and Puducherry, Kerala, FRP across South India |
| Project text (About block) | 13–61 words of their own (median 42) | 50–74 words (median 59), from the photos |
| Fact row for the elements | "Products made" | "Elements made" |
| Sandur Manganese & Iron Ores | Indexed and in the sitemap, with 1 fact and no photos | noindex, out of the sitemap and ItemList until photos arrive |
| Links from projects to brand sites | None | 26 projects link to their elements on the regional brand site (39 URLs, all 200) |
| Structured data | Organization + LocalBusiness, 3 phones, 3 states, address-search `hasMap`, opening hours | Organization, 2 contactPoints, areaServed India, no `hasMap` until the profile link arrives; CreativeWork on project pages. 0 errors against the schema.org vocabulary |
| Sitemap | 36 URLs, no `lastmod` | 35 URLs, all with `lastmod` (git date, or the build date) |
| Thumbnails over 100 KB | 5 (largest 139 KB) | 0 (largest 99 KB) |
| GA4 | Not on the site (`GA4_ID` not set) | Code checked: 78 of 78 test clicks sent `contact_click`. Set `GA4_ID` in Vercel |
| Security headers | 6 | 7 (adds Cross-Origin-Opener-Policy) |
| Titles and descriptions | All within 60 / 140–160 | All within 60 / 140–160 |
| Build | 0 errors, 0 warnings | 0 errors, 0 warnings |

**Still open:**
- [ASK CLIENT] items: the GRC BANGALORE profile link, the email spelling, the project facts, 7 locations and Sandur's photos.
- `GA4_ID` in Vercel.
- The http://rjinteriors.in redirect, set in Vercel's Domains settings.
- Mobile speed: re-measure after the deploy.

