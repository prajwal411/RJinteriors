# Backlink Profile: rjinteriors.in

Score: Insufficient data. Only 1 of 7 scoring factors has any data source (free tier, no Moz/Bing/DataForSEO), and the domain is days old. A numeric score would be misleading.

Date: 2026-10-29. Sources: Common Crawl Web Graph (domain-level, confidence 0.50, release cc-main-2026-jan-feb-mar, quarterly); live page fetches of sister sites (Parsed, 0.95).

## Data found
| Metric | Value | Source |
|---|---|---|
| In Common Crawl crawl / rankings | No / No | CC (0.50) |
| PageRank, harmonic centrality | null (not in graph) | CC (0.50) |
| Referring domains, DA, spam score, anchors, velocity | Not available (no free source) | n/a |
| Link from grcbangalore.com (home, /contact/) | No hyperlink to rjinteriors.in. Only mailto:sandiil.k@rjinteriors.in | Parsed (0.95) |
| Link from frpbangalore.com (home, /contact) | No hyperlink to rjinteriors.in. Only mailto:sandiil.k@rjinteriors.in | Parsed (0.95) |
| rjinteriors.in outbound to both sister sites | Yes. /products/ fetched shows hrefs to both (from /brands/ and Organization schema per brief) | Parsed (0.95) |

The CC result is expected: the 2026 Q1 release predates the launch. It says nothing negative about the site. No real link data exists yet; nothing has been padded.

## What works
- Both sister sites already name RJ Interiors & Constructions as parent and show the rjinteriors.in email, so entity association exists (as text, not links).
- rjinteriors.in already links out to both sister sites.
- Sister sites have crawlable, server-rendered footers, so adding a link is a trivial edit.

## Findings

### 1. Sister sites do not link to rjinteriors.in; they point "parent company" to gfrcinnovation.in
Severity: High
Evidence: On grcbangalore.com (footer: "Parent company: <a href=https://www.gfrcinnovation.in>RJ Interiors & Constructions</a>") and its JSON-LD parentOrganization url = https://www.gfrcinnovation.in. frpbangalore.com JSON-LD parentOrganization url is also https://www.gfrcinnovation.in. Same link appears on /contact pages. Zero hrefs to rjinteriors.in on any of 4 pages fetched (home and contact of each). Note: the brief says GFRC Innovation has no website, yet both sites link to gfrcinnovation.in; I did not verify what that URL serves. It is also what the parent entity is labelled as.
Fix: On both sister sites change the footer "Parent company" anchor and the JSON-LD parentOrganization url/@id to https://www.rjinteriors.in/ (same @id as rjinteriors.in's Organization schema, so the entity graph is consistent). Add a visible "Part of RJ Interiors & Constructions" link in the header or footer and on /contact. Use plain, followed links; these are same-owner links, so keep anchor text as the brand name, not keyword-stuffed. Separately confirm what gfrcinnovation.in actually is (flag to owner), as it conflicts with "no website".

### 2. No third-party links or crawl presence yet
Severity: Info
Evidence: CC in_crawl false, in_rankings false. Domain launched days ago.
Fix: Re-run commoncrawl_graph.py after the next quarterly release (Q2/Q3 2026 releases or later) and add Google Search Console Links report and Bing Webmaster Tools for real link data. Verify the domain in both now.

### 3. No link-quality, anchor, toxicity, or velocity data available
Severity: Info
Evidence: No Moz, Bing, or DataForSEO source configured.
Fix: Use free Search Console Links report after about 4-8 weeks. Add Moz free key if desired. Revisit the score once at least 4 factors have data.

### 4. Starter link-acquisition plan (no paid links, no PBNs)
Severity: Medium
Evidence: Zero third-party links today.
Fix (in priority order; use only facts already published on the site in outreach copy, no invented history, certifications, awards, testimonials or project details):
1. Brand sites (fix #1): grcbangalore.com, frpbangalore.com link to rjinteriors.in. Optionally cross-link GRC<->FRP pages where genuinely relevant.
2. Business directories, with identical NAP (name, address, phone) matching the site and Google Business Profile: IndiaMART, JustDial, TradeIndia, Sulekha, plus Google Business Profile. Use the legal name "RJ Interiors & Constructions" and the Jakkur, Bengaluru address as published. WARNING: "Chennai GRC" on IndiaMART is a different company; do not claim, merge, or link to it, and do not use grcchennai.com anywhere. Directory links are often nofollow, so value is citations and enquiries rather than ranking.
3. Project credits: for the 27 published projects, contact the architect, builder or client of each where RJIC actually supplied the work, and ask whether they would add a credit or supplier link on their project page or portfolio. Ask only about projects you truly delivered, and get permission before naming them. Offer photos and factual spec details already on the site.
4. Industry associations and trade bodies relevant to GRC/FRP/precast/construction in Karnataka and India: check membership eligibility honestly; list only memberships actually held. Do not claim any that are not.
5. Supplier and partner pages: ask real material suppliers, mould/fabrication partners and contractors you already work with for a "suppliers/partners" listing.
6. Content that earns links: publish genuine technical guides (GRC vs GFRC, FRP cladding basics) from real expertise; share with architecture and construction communities, local news or trade publications.
7. Track: log each outreach target, status and live URL; recheck with verify_backlinks.py.

## Not done / limitations
- No claim made about links on pages not fetched (e.g. other sister-site inner pages, GRC Chennai/Kochi which have no websites).
- JS-rendered content was not needed; the pages were server-rendered.
- Validator script was not run: with no numeric score and minimal data, the report data file was not built.
