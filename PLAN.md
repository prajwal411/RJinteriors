# Plan: SEO for rjinteriors.in

This plan follows the brief, Steps 2–10. Nothing below is built yet. The work happens on the branch `seo-brief`, with one commit per step. Merging that branch into `main` is what deploys it.

## Decide before I start

1. **Contact form.** In your last message you asked me to remove every form and send enquiries straight to WhatsApp or email. Step 2 of the brief asks for a form that opens WhatsApp with the fields filled in.
   - **Default if you just approve:** follow the brief, since it's the later instruction. /contact/ gets a short form (name, product, site location, size or quantity, message). "Send on WhatsApp" opens a chat with +91 99005 79417 containing those details, and "Send by email" is the second option. Nothing is stored and there's nothing for the client to check: the message arrives in WhatsApp. All other pages keep the WhatsApp and email buttons.
   - **Alternative:** no form anywhere, buttons only.
2. **"Since 2008".** You told me earlier that it's true, but the brief lists it as unconfirmed. Default: follow the brief and remove it everywhere. It isn't on the live site; it only exists in uncommitted code from my last session.
3. **Factory map coordinates** for the schema `geo` field. I won't guess them. Open the Google listing, right-click the pin, and copy the two numbers it shows (e.g. 13.07…, 77.6…). If you don't send them, `geo` is left out and everything else still works.
4. **Google review link.** For now "Read our reviews on Google" uses a Maps search for "RJ Interiors & Constructions, Jakkur, Bengaluru". If you send the listing's own Share link, I'll use that instead.

## Step R: tidy up the uncommitted work from earlier sessions (first commit)

The working tree already has uncommitted changes. I'll keep what fits the brief and undo what doesn't, then commit before Step 2.

| Keep | Undo |
|---|---|
| Links to all five brand sites (`site.json`, footer, home, /brands/) | The 8 product pages (`/products/grc-jali/` etc., `src/data/products.json`, `src/templates/product.html`, their build code and CSS). The brief says the sister sites own those. They were never deployed, so no redirects are needed. |
| Street address in `site.json`, footer, /contact/ and the LocalBusiness schema (reworded in Step 2) | "Since 2008" everywhere (`site.json` `founded`, home hero, About, footer, schema `foundingDate`) |
| WhatsApp and email buttons, green WhatsApp button in the header | "What we made" links on project pages that point to the product pages (back to the `/products/#…` blocks) |
| Security headers and cache rules in `vercel.json`; the sitemap date fix; project titles that name the work | — |
| Home H1 keyword change (reworked in Step 4) | — |

`SEO-AUDIT.md` (committed by an earlier session) is deleted in the working tree; I'll leave that as it is unless you want it back. My own audit folder `rjinteriors.in-audit/` stays untracked.

## Step 2: business details and contact

- **`site.json`:**
  - Phones reordered so **+91 99005 79417** comes first. It's used everywhere a single number is shown: the header, the "Or call" line in the footer band, and schema `telephone`.
  - New `hours: "Monday to Saturday, 9 am to 6 pm"`, marked unconfirmed.
  - The address stored as the brief's exact string, ending "Bengaluru, Karnataka 560064".
- **Footer:** address, main phone and hours as three identical lines; WhatsApp stays. Brand links stay.
- **/contact/:**
  - Address, main phone and hours at the top of the side column.
  - Embedded Google map using the keyless `maps.google.com/maps?q=…&output=embed`. It's lazy-loaded and placed below the fold so it doesn't slow the page.
  - A "Get directions" link (Google Maps directions to the address) and a "Read our reviews on Google" link.
  - The form from Decision 1, with the line "You can attach drawings and photos in WhatsApp" next to the submit button.

## Step 3: brand network

- **Homepage, /brands/, footer:** all five brands linked by name. This is already done in the working tree; I'll check it.
- **/brands/:** add a short "Which brand should I contact?" list.
  - GRC in Bangalore and Karnataka: GRC Bangalore
  - FRP products and FRP tanks: FRP Bangalore
  - Chennai and Tamil Nadu: GRC Chennai
  - Kochi and Kerala: GRC Kochi
  - The rest of India: GFRC Innovation
  - "Not sure? Contact RJIC directly."
  - Plus one line saying every product is made at the Jakkur factory.
- GFRC Innovation's description changes from "architectural GFRC products" to "GRC and FRP for the rest of India", as the brief says.

## Step 4: homepage and on-page

- **Home H1** becomes "GRC and FRP manufacturer in Bangalore", and "Your design, cast in GRC and FRP" becomes the subheading.
  - **Look:** unchanged. The H1 keeps the small orange line style it has now, and the large text stays the same size, but it's a `<p>` instead of part of the H1.
- **Made to order:** one plain sentence near the top of the home page and in the /products/ intro saying everything is custom-made in any size and design, from the customer's drawings, photos, sketches or samples.
- **Naming:** "RJ Interiors & Constructions (RJIC)" and "Jakkur, Bangalore" go once into the opening text of /products/, /manufacturing/, /industries/ and /projects/, and once into the project-page template. No "best", "leading" or "No.1".
- **Titles and descriptions:** these are measured. The build will warn about any title over 60 characters or description outside 140–160.

| Page | Title (characters) | Description (characters) |
|---|---|---|
| `/` | GRC and FRP Manufacturer in Bangalore \| RJ Interiors (RJIC) (59) | RJ Interiors & Constructions (RJIC) is a GRC and FRP manufacturer in Jakkur, Bangalore, making custom architectural products in any size and design. (148) |
| `/about/` | About RJ Interiors & Constructions (RJIC), Bangalore (52) | RJ Interiors & Constructions (RJIC) makes custom GRC and FRP products at its factory in Jakkur, Bangalore, and is the parent company of five brands. (148) |
| `/products/` | GRC and FRP Products, Made to Order in Bangalore \| RJIC (55) | Custom GRC and FRP products from RJIC in Jakkur, Bangalore: domes, jalis, columns, cornices, facade panels, FRP tanks and planters in any size or design. (153) |
| `/manufacturing/` | Custom GRC and FRP Manufacturing in Jakkur, Bangalore \| RJIC (60) | How RJ Interiors & Constructions makes custom GRC and FRP products at its Jakkur factory: drawings, a mould for each design, casting, finishing, delivery. (154) |
| `/industries/` | GRC and FRP for Hotels, Hospitals and Temples \| RJIC (52) | GRC and FRP products by RJ Interiors & Constructions, Bangalore, for homes, offices, hotels, hospitals, schools, places of worship and industrial sites. (152) |
| `/brands/` | Our Brands: GRC Bangalore, FRP Bangalore and More \| RJIC (56) | RJIC is the parent company of GRC Bangalore, FRP Bangalore, GRC Chennai, GRC Kochi and GFRC Innovation. Every product is made at our Jakkur factory. (148) |
| `/projects/` | GRC and FRP Projects in South India \| RJ Interiors (RJIC) (57) | Completed GRC and FRP projects by RJ Interiors & Constructions: jalis, domes, columns, cornices and cladding for hotels, hospitals, malls and temples. (150) |
| `/contact/` | Contact RJ Interiors & Constructions, Jakkur, Bangalore (55) | Address, map, phone and WhatsApp for RJ Interiors & Constructions (RJIC), Jakkur, Bangalore. WhatsApp +91 99005 79417 with your drawings for a quote. (149) |
| `/faq/` | FAQ: Custom GRC and FRP Products \| RJ Interiors (RJIC) (54) | Answers from RJ Interiors & Constructions: where our Jakkur factory is, custom sizes and designs, what to send for a quote, installation and our brands. (152) |
| 27 project pages | "Name, Place: work \| RJIC", kept at ≤ 60 as now | Built from the project summary and place, plus "by RJ Interiors & Constructions (RJIC), Bangalore". The build picks the wording that lands in 140–160. |

## Step 5: /products/ (one overview page)

- **Intro:** made to order in any size and design, at RJIC's Jakkur factory.
- **Each product block** keeps its current anchor, so old links and redirects still land on it. Every block covers the same things, following section 2 of the brief:
  - what it is and where it's used;
  - what the customer chooses (size, shape, pattern or profile, finish);
  - which material suits it and why, and how it's generally fixed;
  - what to send for a quote;
  - "Projects with this", with links to project pages, generated from the project data;
  - a link to the brand site.
- **Blocks and their brand-site links:**

| Block (anchor) | Links to |
|---|---|
| GRC jalis and screens (`#jalis`) | grcbangalore.com/grc-products/grc-jali/ |
| GRC domes and minarets (`#domes-minarets`) | grcbangalore.com/grc-products/grc-domes/ |
| GRC columns and capitals (`#columns`) | grcbangalore.com/grc-products/grc-columns/ |
| GRC cornices and brackets (`#cornices`) | grcbangalore.com/grc-products/grc-cornices/ |
| GRC arches, balusters and railings (`#arches-balustrades`) | grcbangalore.com/grc-products/grc-arches/ |
| GRC facade panels and cladding (`#facade-panels`) | grcbangalore.com/grc-products/grc-facades/ |
| GRC fins and decorative elements (`#fins`) | grcbangalore.com/grc-products/custom-grc-elements/ |
| Custom GRC pieces (`#grc-custom`) | grcbangalore.com/grc-products/custom-grc-elements/ |
| FRP storage tanks and MS FRP tanks (`#frp-tanks`) | frpbangalore.com/frp-products/frp-tanks/ |
| FRP brackets, corbels and cornices (`#frp-columns`) | frpbangalore.com/frp-products/frp-columns-corbels/ |
| FRP arches, gutters and pots (`#frp-arches-gutters`) | frpbangalore.com/frp-products/frp-arches/ |
| FRP facade elements (`#frp-facade`) | frpbangalore.com/frp-products/frp-facades-cladding/ |
| FRP planters (`#frp-planters`) | frpbangalore.com/frp-products/ (there's no planters page on that site) |
| Custom FRP pieces (`#frp-custom`) | frpbangalore.com/frp-products/custom-frp-architectural-elements/ |

- **Content changes to match the brief's product list:**
  - The tanks block is titled "FRP water tanks" and lists water, effluent and chemicals.
  - The FRP block "Columns, brackets, corbels and cornices" becomes "Brackets, corbels and cornices", because the brief doesn't list FRP columns. [ASK CLIENT]
  - "Sculptures" comes out of the custom GRC title. [ASK CLIENT]
- **"GRC or FRP?":** the current comparison table becomes a short paragraph that links to gfrcinnovation.in/grc-vs-frp/.
  - **Look:** the table disappears.
- No new numbers anywhere. Any number I'd want goes into the [ASK CLIENT] list.

## Step 6: projects

- **New fields in `projects.json`:** `year`, `material`, `finish`, `size`, `scope`, all set to `"[ASK CLIENT]"`. Known facts stay as they are: location, building type (sector) and products made (from the photos).
- **Fact block on each project page:**
  - It shows only known fields: Location, Building type, Products made (each linked to its `/products/#…` block) and Photos.
  - Fields that are `[ASK CLIENT]` or empty are left out.
  - The build fails if "[ASK CLIENT]" would appear in any page.
- **Descriptions:** keep the existing photo-based text, which isn't padded. Add one generated line naming RJ Interiors & Constructions (RJIC), Jakkur, Bangalore as the maker.
- **Product links:** each /products/ block lists its projects (Step 5), and each project lists its products. The links go both ways.

## Step 7: /faq/ (new page)

- Six questions, using facts from section 1 only:
  1. Where is the factory?
  2. Can you make any size or design?
  3. What should I send for a quote?
  4. Do you install? ("installation where offered")
  5. Which of your brands serves my city?
  6. Should I choose GRC or FRP? (short answer and a link to gfrcinnovation.in/grc-vs-frp/)
- Linked from the footer page list, /contact/ and /brands/. The header menu stays as it is.
- FAQPage schema is generated from the same text, so the two always match.

## Step 8: structured data (one function in `build.mjs`)

- `Organization` + `LocalBusiness` (one node, `@id /#organization`):
  - `legalName`, `alternateName: "RJIC"` and `logo`;
  - the exact address;
  - `geo`, only if you send the coordinates;
  - `telephone: +91-99005-79417` and `openingHoursSpecification` (Mon–Sat 09:00–18:00, unconfirmed);
  - `subOrganization`: the five brand sites, each as an Organization with name and URL (replacing the current `brand` list);
  - no `foundingDate`.
- `WebSite` on the home page and `BreadcrumbList` on inner pages: kept.
- `FAQPage` on /faq/.
- The `Service` and `ItemList` nodes added earlier stay only where they're still accurate: `ItemList` on /projects/ yes, `Service` goes with the product pages.
- No `Product`, prices or ratings.
- **Validation:** parse every JSON-LD block at build time and check the required fields, then run the validator script from the plugin you installed (claude-seo) on the built pages.

## Step 9: technical

- **Redirects:** the 301s from REDIRECTS.md go into `vercel.json`.
- **Headers:** `vercel.json` gets:
  - **HSTS:** add includeSubDomains;
  - X-Content-Type-Options, Referrer-Policy, X-Frame-Options and Permissions-Policy (kept);
  - **Content-Security-Policy:**
    - scripts from `'self'`, Google Tag Manager and a hash of the one small inline script in `layout.html`, plus `'inline-speculation-rules'`;
    - styles `'self' 'unsafe-inline'`, which the inline `style` attributes need;
    - fonts `'self'`;
    - frames from google.com (the map);
    - connections to Google Analytics.
  - The build checks that the inline-script hash in `vercel.json` still matches, so a later edit can't silently break the site.
  - **Testing:** the local preview server will send the same headers as Vercel, so I can load each page and confirm there are no CSP errors.
- **Thumbnails:** re-encode the ones over 100 KB (the largest is 174 KB) with `tools/project-images.py` at a lower quality, keeping width and height. Below-the-fold images are already lazy-loaded.
- **Env variables:** the build reads `GOOGLE_SITE_VERIFICATION` and `GA4_ID`. Each tag is added only if its variable is set; nothing is hard-coded. You set both in Vercel → Project → Settings → Environment Variables.
- **GA4 events:** one listener in `site.js` sends `contact_click` with `method` = phone, whatsapp or email on every such link, and `generate_lead` when the contact form is sent. It does nothing if GA4 isn't loaded.

## Step 10: finish

- Build with zero errors and warnings.
- Lighthouse on mobile for `/`, `/products/`, `/projects/` and `/contact/`, compared with the audit (Performance 99/100/99/–).
  - GA4 and the map will cost a little. If any page drops, I'll report it with the numbers rather than hide it.
- Then I'll give you:
  1. a summary of what changed;
  2. the [ASK CLIENT] list as one message;
  3. every place the unconfirmed facts appear.

## Changes to the look, for your approval

1. **Green WhatsApp buttons** (header, hero, pages). Already in the working tree from your last request.
2. **Map** on /contact/.
3. **Form** on /contact/, if you keep Decision 1's default.
4. **Comparison table** on /products/ replaced by a short note.
5. **Project fact list** becomes longer.
6. **Hours** added in the footer.
7. **New /faq/ page** in the existing page style.

Everything else keeps the current design.
