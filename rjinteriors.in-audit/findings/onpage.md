# On-Page SEO: rjinteriors.in

Score: 80/100

Source: full crawl on 2026-10-29 (raw/crawl.json). 109 URLs fetched: 35 canonical HTML pages, 13 query-string variants (?type=, ?brand=, ?sector=) and 61 WebP gallery images. Every URL returned 200, with no redirects inside the site.

## What works

- Every one of the 35 pages has a unique title, a unique meta description, exactly one H1, a self-referencing canonical, `lang="en-IN"` and a viewport tag.
- The 13 query-string variants (`/contact/?type=quote`, `/projects/?sector=retail` and so on) all canonicalize to the clean URL, so they won't compete with it.
- Core page titles carry the main terms: "GRC and FRP Architectural Products Manufacturer in Bangalore" (home), "GRC and FRP Products: Jalis, Domes, Columns, Tanks" (/products/).
- Project titles name the building and city (for example "Courtyard by Marriott, Bengaluru | Projects | RJIC").
- No noindex anywhere and no orphan pages. Every sitemap URL is linked from the site, and every crawled canonical page is in the sitemap.

## Findings

### Home H1 has no product or place keyword
- **Severity:** Medium
- **Evidence:** the home H1 is "Your design, cast in GRC and FRP". It doesn't contain "manufacturer", "Bangalore" or any product name; those appear only in the title.
- **Fix:** keep the slogan, but make the H1 carry the topic, for example "GRC and FRP architectural products, made in Bangalore", and move the slogan to a styled line. The H1 is in src/pages/index.html.

### Project titles describe the place, not the work
- **Severity:** Medium
- **Evidence:** project titles run 28–74 characters and say only where the project is ("TDP Office | Projects | RJIC", "Princess Golf | Projects | RJIC"). Nothing says what was made, so they can't match searches like "GRC jali hospital facade".
- **Fix:** add the product types from each project's own "what we made" list, which comes from the photos. For example: "Courtyard by Marriott, Bengaluru: arches, columns and jalis | RJIC". Don't say GRC or FRP per project, because the material isn't confirmed (needs client input). Titles are built in build.mjs from src/data/projects.json.

### Some meta descriptions will be cut off in results
- **Severity:** Low
- **Evidence:** home 197, /about/ 209, /brands/ 194, /products/ 187 and /projects/ 184 characters. Google usually shows about 150–160 characters on desktop and fewer on mobile.
- **Fix:** put the key phrase and the phone number in the first 150 characters. These descriptions are set in the front matter of src/pages/*.html.

### /brands/ title is too long
- **Severity:** Low
- **Evidence:** 88 characters: "Our Brands: GRC Bangalore, FRP Bangalore, GRC Chennai, GRC Kochi, GFRC Innovation | RJIC". It will be cut off after about 60 characters.
- **Fix:** shorten to something like "Our Brands: GRC Bangalore, FRP Bangalore and More | RJIC" (55 characters) and keep the full list in the H1 or intro.

### Short project titles have room to spare
- **Severity:** Low
- **Evidence:** TDP Office (28), Princess Golf (31), CMH Hospital (37), Indian Tiffin Club (36) and Infant Jesus Shrine (37).
- **Fix:** this is covered by the project-title fix above. The client should also confirm the city for the seven projects whose location is unknown.
