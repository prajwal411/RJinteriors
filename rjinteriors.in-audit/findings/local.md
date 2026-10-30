# Local SEO findings: rjinteriors.in

Score: 38/100

Business type: hybrid (factory in Bangalore, address withheld; service area Karnataka, Tamil Nadu, Kerala). Vertical: B2B manufacturer (closest to construction supply).

| Dimension | Weight | Score | Note |
|---|---|---|---|
| GBP signals | 25 | 5 | No GBP linked or created; sister-site evidence suggests one may already exist |
| Reviews and reputation | 20 | 6 | None on site by design; no process yet |
| Local on-page | 20 | 11 | City and region in copy, footer, meta; no service-area or product-location pages |
| NAP and citations | 15 | 7 | Phones/emails consistent; address inconsistent across sites; citations unverified |
| Local schema | 10 | 5 | Organization only, locality-level address |
| Local links/authority | 10 | 4 | Reciprocal brand links only |

Proximity (about 55% of local ranking variance) cannot be influenced; with no public street address, "near me" queries are unlikely to be won by this site.

## What works
- Phones, emails and name are identical across src/data/site.json, src/partials/footer.html, src/pages/contact.html and JSON-LD.
- No invented address, history or reviews (matches brief). Locality-only address is consistent in footer, contact page, meta description and schema.
- Organization JSON-LD has @id, logo, 3 ContactPoints, areaServed (State), knowsAbout, Brand (build.mjs jsonLd(), lines 318-350).
- Crawlable text phone list and tel: links; enquiry form with a location field.
- The map partial (src/partials/map.html) is a clearly schematic SVG, not a deceptive Maps imitation.

## Findings

### 1. No GBP strategy; an existing profile may be duplicated (Critical)
Evidence: No GBP link or Maps embed on rjinteriors.in. The sister sites grcbangalore.com and frpbangalore.com (fetched) both display two Google reviews from named reviewers and describe the business as RJ Interiors & Constructions; frpbangalore.com has a Maps search link to a Jakkur address. That implies a GBP for RJ Interiors & Constructions may already exist. I could not confirm it: Google and DuckDuckGo fetches returned no results (blocked/bot challenge), and no DataForSEO access.
Fix: Before creating anything, ask the client (a) whether they own any profile for RJ Interiors, GRC Bangalore or FRP Bangalore and under which Google account; (b) for the URL behind the "Read the reviews on Google" link on frpbangalore.com. Search Maps manually for each name plus "GFRC Innovation". If one exists, claim it and set its website to https://www.rjinteriors.in/. Do not create a second one (duplicates violate Google guidelines and split reviews). GRC and FRP are divisions of one business, so they should not each get a profile.

### 2. Address ambiguity blocks GBP verification and conflicts across sites (Critical)
Evidence: rjinteriors.in shows only "Bangalore, Karnataka, India" (site.json address; contact.html line 166; footer.html line 6). frpbangalore.com (fetched) shows a full street address (No. 162/1, Sy No 21, Venkateshwara Nagar, Sampigehalli Main Road, Jakkur Post, Bengaluru 560064), "since 2008" and "18 years". grcbangalore.com (fetched) shows only Bangalore. My fetch of both sites reported "27 projects", not the 200+ in your brief; the fetch tool summarises, so recheck by eye. Either way the sites disagree with each other or with the RJIC brief. None of these claims are adopted here.
Fix (Needs client input): ask (1) Is the Jakkur address the current factory and may it be public? (2) Do customers visit, or is this service-area only? (3) Are "since 2008", 18 years and the project count accurate and provable (and which figure: 27 or 200+)? (4) Which entity is the parent (grcbangalore.com mentions gfrcinnovation.in)? Keep rjinteriors.in unchanged until answered. Then make all three sites match exactly (address, pin, phone order, hours). If the address stays private, create the GBP as a service-area business with the address hidden (Google still needs the real address to verify).

### 3. GBP setup plan and categories (High)
Evidence: no profile data available.
Fix, step by step:
1. Resolve findings 1 and 2.
2. Ask the client for: exact legal/trading name, street address and pin and whether it is public, hours (sister sites say Mon-Sat 9-6; confirm), one primary phone (sister sites call +91 78921 42197 the main line), owner Google account, service cities, 10+ real photos (factory, moulds, finished products with permission, team), logo, product list with approved descriptions.
3. Create or claim the profile. Name must be "RJ Interiors & Constructions" only; do not stuff "GRC Bangalore" into the name (suspension risk).
4. Category: pick the primary by the largest revenue line (ask: GRC or FRP?). Candidate names to confirm in the GBP category picker, since I could not query the live list and names change: "Concrete product supplier", "Fiberglass products supplier" (or "Fiberglass supplier"), "Building materials supplier", "Manufacturer", "Construction company", "Interior designer". Avoid "Interior designer" as primary because this is a manufacturer; a wrong primary category is the biggest negative factor.
5. Add service areas (main cities in Karnataka, Tamil Nadu, Kerala the client genuinely serves; Google caps the number).
6. Add products from the wording on src/pages/products.html; no unverified specs.
7. Verify (video or phone), then post updates and photos at least monthly.
8. Link the GBP from the footer/contact page and add its URL to JSON-LD sameAs.

### 4. Local schema is minimal and generic (Medium)
Evidence: build.mjs jsonLd() emits Organization with PostalAddress (addressLocality, addressRegion, addressCountry only). No geo, openingHoursSpecification, sameAs or LocalBusiness subtype. telephone is only the first phone; all three ContactPoints are contactType "sales".
Fix: Do not invent geo or street. Now: add sameAs (sister sites, later GBP and directory pages). After the client confirms the address: use ["Organization","LocalBusiness"] with streetAddress, postalCode, geo (5 decimals), openingHoursSpecification, hasMap. If the address stays hidden, keep Organization with areaServed.

### 5. Contact page and map give little location signal (Medium)
Evidence: contact.html lines 164-167 show one line, "Manufacturing facility: Bangalore, Karnataka, India". No directions link, hours or service-area text. src/partials/map.html labels "Chennai: GRC Chennai" and "Kochi: GRC Kochi" as markets served by regional brands, but site.json gives those brands no URL, and the SVG text is not a strong local signal.
Fix: Add a plain-text line on /contact/ such as "Supplying Karnataka, Tamil Nadu and Kerala" (from areaServed). Add hours only after confirmation. Add a Maps embed only once the address is public. Ask the client to confirm GRC Chennai and GRC Kochi are genuinely their brands (Needs client input) and provide URLs. Note that "Chennai GRC" on IndiaMART is a different company and grcchennai.com is unrelated; do not link or claim them.

### 6. No dedicated product/service pages for target queries (High)
Evidence: queries like "GRC jali manufacturers in Bangalore", "FRP planters Bangalore", "GRC facade panels" need dedicated pages; src/pages/ has only products, industries, manufacturing, projects (plus project pages). Dedicated service pages are the top local organic factor (Whitespark 2026).
Fix: One page per core product (GRC jali, facade panels, FRP planters, FRP tanks) with Bangalore in title/H1 and only client-approved facts. Create city pages (Chennai, Kochi, Mysuru) only if each can carry unique factual content; otherwise they are doorway pages. Also decide how the three domains avoid competing for the same queries (consolidate, canonicalise or differentiate).

### 7. NAP comparison across sites (Medium)
| Element | rjinteriors.in | grcbangalore.com | frpbangalore.com |
|---|---|---|---|
| Name | RJ Interiors & Constructions (RJIC) | GRC Bangalore, unit of RJIC | FRP Bangalore, division of RJIC |
| Address | Bangalore only | Bangalore only | Jakkur street address |
| Phones | 3, same | same | same (99005 79417 shown as WhatsApp) |
| Emails | same 2 | same | same |
| Hours | none | Mon-Sat 9-6 | Mon-Sat 9-6 |
| Claims | none | 27 projects, 2 Google reviews | since 2008, 18 years, 27 projects |
Phones and emails agree; only address, hours and claims differ. "grcbanglore@gmail.com" is a generic Gmail with a spelling that differs from the brand.
Fix: ask the client the questions in finding 2; set one canonical NAP; suggest a domain email (for example enquiries@rjinteriors.in) if desired.

### 8. Indian directory citations unverified, likely missing (High)
Evidence: IndiaMART, JustDial, TradeIndia and Sulekha could not be checked (search engines blocked automated fetch). Not confirmed either way.
Fix: Search each directory for the three phone numbers and the names RJ Interiors, GRC Bangalore, FRP Bangalore. Create or claim IndiaMART first (key for B2B), then JustDial, TradeIndia, Sulekha, plus Bing Places and a LinkedIn page. Use identical name and phone (and address once decided). Add URLs to sameAs. Ask for corrections to any listing using their numbers incorrectly. Never claim "Chennai GRC".

### 9. Reviews: none on site; build an acquisition process (High)
Evidence: no review widget or aggregateRating (correct per brief). Sister sites show two Google reviews; not reused here.
Fix (no fabricated reviews):
1. Client confirms which GBP holds the two existing reviews.
2. After each delivery, send the architect/builder/contractor a WhatsApp message with the GBP review short link within 1 to 2 weeks.
3. Aim for a steady cadence (for example a few per month) rather than bursts; no incentives and no gating of reviews.
4. Reply to every review within days.
5. Only once real reviews exist and the client approves: quote them with attribution and consider aggregateRating only if the reviews are visible on the page.
Needs client input: permission to name reviewers and approval to ask clients for reviews.

### 10. Local links and brand structure (Low)
Evidence: footer brand links ({{brand-links}} in footer.html) point to the two sister sites; Chennai, Kochi and GFRC Innovation have blank URLs in site.json.
Fix: Get URLs or remove blank brands from public view once the client clarifies. Pursue relevant links: Karnataka architect and builder associations, supplier lists, project partners (with permission), IndiaMART catalogue link.

### Info: Limitations
Not assessed: live GBP status, local pack positions, citation counts, review velocity and response rate, the live GBP category list, geo coordinates. No DataForSEO or Google credentials; search fetches were blocked. Sister-site data came from a summarising fetch tool and needs a manual recheck. Proximity cannot be changed.

## Top actions
1. Critical: find out whether a GBP exists; claim, don't duplicate.
2. Critical: get client answers on address, hours and claims; align the three sites.
3. High: product service pages with Bangalore and service area.
4. High: claim IndiaMART, JustDial, TradeIndia, Sulekha with identical NAP.
5. High: start the review-request process.
6. Medium: extend JSON-LD (sameAs now; LocalBusiness fields after address confirmed).
7. Medium: add service-area text (and hours later) to /contact/; clarify Chennai/Kochi on the map.
8. Medium: plan for sister-site overlap.
9. Low: domain email instead of Gmail.
10. Low: clarify parent and brand structure.
