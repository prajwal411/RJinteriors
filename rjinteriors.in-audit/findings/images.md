# Images: rjinteriors.in

Score: 85/100

Source: full crawl on 2026-10-29 (raw/crawl.json). 62 unique `<img>` sources and 61 linked full-size gallery images. All are WebP, every one returned 200, and they total about 4.4 MB across the site.

## What works

- Every photo is WebP, produced by tools/project-images.py: full size at quality 80, thumbnails with a 640px short edge at quality 74.
- Every `<img>` has `srcset`, `width` and `height`, so layout shift is avoided. The one exception is a `data:,` placeholder in the gallery viewer, which is expected.
- On project pages, the first image has `fetchpriority="high"` and the rest have `loading="lazy"`.
- Project-page alt text describes what the photo actually shows, for example "Geometric jali screens beside the Courtyard by Marriott sign and green wall".
- The home page uses inline SVG line drawings instead of photos, so it loads no image files.

## Findings

### Project grid thumbnails have empty alt text
- **Severity:** Low
- **Evidence:** all 27 card thumbnails on /projects/ (and the project cards on the home page) have `alt=""`. That is valid for accessibility because the card's text names the project, but Google Images gets no description for them.
- **Fix:** optional. Because the same files carry descriptive alt text on each project page, Google can still index them from there, so this is low priority. If you want the grid to count too, use the project name as alt text (for example "Courtyard by Marriott, Bengaluru").

### Some thumbnails are heavy for their size
- **Severity:** Low
- **Evidence:** /assets/img/projects/commercial-complex-malleswaram/2-thumb.webp is 174 KB and 1-thumb.webp is 165 KB (640×989 px). Indian Tiffin Club, Bismilla Green Masjid and Harrow thumbnails are 117–138 KB.
- **Fix:** lower the thumbnail quality from 74 to about 65 for busy photos (tools/project-images.py:64), or also output AVIF. The goal is under 100 KB per card thumbnail.

### Images could be in an image sitemap
- **Severity:** Info
- **Evidence:** the 27 project pages carry 61 real photos of finished work, which is useful for Google Images searches like "GRC jali design".
- **Fix:** add `<image:image>` entries to sitemap.xml (see sitemap.md). This is optional, since the images are already linked and have alt text.
