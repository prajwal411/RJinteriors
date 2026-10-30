# Content Quality: rjinteriors.in

Score: 52/100 (PARTIAL: first pass, being completed)

Status: partial. Live pages fetched 2026-10-29 with render_page.py (mode never, 35/35 HTTP 200). The full version will replace this file.

## Early findings (verified)

- High: 26 of 27 project pages carry 30 to 61 words of description each, and Sandur Manganese & Iron Ores carries 13 words with no photos and no "What we made" list (src/data/projects.json:893).
- High: one /products/ URL covers 14 products in 12 to 41 words of description each. It cannot target separate queries such as GRC jali, GRC dome or FRP water tank. The phrase "water tank" appears nowhere on the site.
- High: there are no specifications anywhere (0 hits for mm, kg, thickness values, lead time, weeks). Needs client input.
- Medium: /products/ has 0 in-content links to projects or industries. The homepage main content has 0 links to /projects/ or to any project page.
- Medium: there are no people, no years active, no factory photos and no street address. Trust rests on 3 phone numbers and 2 email addresses.
- Info: the templated-metadata check (metadata_template.py) found site_risk low, templated_ratio 0.0 and no shared_cta_phrases.
