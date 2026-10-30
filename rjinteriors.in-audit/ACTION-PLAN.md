# Action plan: www.rjinteriors.in

SEO Health Score 73/100, from the audit on 2026-10-29. Items are ordered by priority. **[Code]** means Claude can do it in this repo. **[You]** and **[Client]** mean account work or facts only you or the client can supply.

## Critical (this week)

1. **[You] Google Search Console.**
   1. Add a **Domain** property for `rjinteriors.in`.
   2. Add the DNS TXT record it gives you, then click Verify.
   3. Submit `sitemap.xml`.
   4. Request indexing for `/`, `/products/`, `/projects/`, `/about/`, `/manufacturing/`, `/industries/`, `/brands/` and `/contact/`.
2. **[You] Bing Webmaster Tools.** Use "Import from Google Search Console".
3. **[Client] Confirm the basic facts.**
   - The factory address and PIN code
   - Opening hours
   - Whether a Google Business Profile already exists for GRC Bangalore or FRP Bangalore
   - What gfrcinnovation.in is
   - Whether the "since 2008", "18 years" and Jakkur address on frpbangalore.com are true
4. **[You] Google Business Profile.** Claim the existing profile, or create one if none exists, using the confirmed address (hidden if it's a service-area business). Name: "RJ Interiors & Constructions". Phone: +91 78921 42197. Website: https://www.rjinteriors.in/. Add real project photos. The steps are in findings/local.md.
5. **[Code] Done:** the enquiry form was removed. Every enquiry button now opens WhatsApp (+91 99005 79417, the number on the Google listing and the brand sites) or an email, each with a first line filled in. Both are set in src/data/site.json.

## High (weeks 1–2)

6. **[You / Client] Fix the sister sites.** On grcbangalore.com and frpbangalore.com, point the "Parent company" link and the `parentOrganization` url to `https://www.rjinteriors.in/`.
7. **[Code] Deploy headers and caching in vercel.json.**
   - Security headers: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy.
   - Fonts: cache for 1 year.
   - Images: cache for 30 days.
   - CSS and JS: a short cache with stale-while-revalidate.
8. **[Code] On-page fixes.**
   - Keyword in the home H1.
   - Add what was made to project titles.
   - Trim the 5 long meta descriptions and the /brands/ title.
9. **[Code] AI-readable passages.**
   - Name RJIC and Bangalore in each product section on /products/.
   - Fix the joined words ("GRCGlass") by adding spaces or separators between inline spans.
10. **[Code] Mobile tap-to-call or WhatsApp button** in the header.
11. **[Code] /projects/ speed.**
    - Load the first card image eagerly with `fetchpriority="high"`.
    - Re-encode full-size WebPs over 150 KB.
    - Show the hero text without waiting for the entrance animation.
12. **[You] Directories.** IndiaMART, JustDial, TradeIndia and Sulekha, with exactly the same name, phone and city as the website. Don't confuse RJIC with "Chennai GRC" on IndiaMART or with grcchennai.com.

## Medium (month 2)

13. **[Client + Code] One page per product type.**
    - Candidates: GRC jali, GRC domes and minarets, GRC facade panels, GRC columns and cornices, FRP planters, FRP tanks.
    - First decide which site owns each search (rjinteriors.in, grcbangalore.com or frpbangalore.com), so the three sites don't compete.
    - Each page needs real specs from the client and photos from the matching projects.
    - Plan them with `/seo cluster "GRC jali Bangalore"` and `/seo content-brief "FRP water tank manufacturer Bangalore"`.
14. **[Client + Code] Expand the project pages.** Add the year, material, scope and city for each project, using confirmed facts only. Either fix the Sandur page or set it to noindex until it has photos.
15. **[Code] Schema.**
    - Add `alternateName` and `inLanguage` to the WebSite node.
    - Add `areaServed` and `availableLanguage` to the ContactPoints.
    - Add CollectionPage and ItemList on /projects/.
    - Switch to LocalBusiness and add `sameAs` once the address is confirmed and the Business Profile is live.
16. **[Code] Clean-up.**
    - Fix the sitemap `lastmod` source, or drop it.
    - Minify CSS and JS, and split up walk.js setup.
    - Stop publishing .htaccess, and remove .cpanel.yml if BigRock is retired.
    - Fix the canonical on the 404 page.
17. **[You] Reviews.** Ask past clients for real Google reviews, for example on WhatsApp. Never add rating schema unless the reviews are real.

## Ongoing

18. Once Search Console has a week of data, run `/seo google setup` and then `/seo google`.
19. Before the next deploy, run `/seo drift baseline https://www.rjinteriors.in`. After each deploy, run `/seo drift compare`.
20. Weekly, check Search Console Pages and Performance.
21. **Expect:** indexing in 1–4 weeks and rankings building over 3–6 months.
22. **If 4 weeks after submitting the sitemap fewer than 30 of the 35 pages are indexed,** bring the "Why pages aren't indexed" reasons back here.
