# Redirects from the old rjinteriors.in

Source: the Wayback Machine (`web.archive.org/cdx ... url=rjinteriors.in/*`), checked 2026-10-30. The archive lists 267 URLs; 86 are page-like and the rest are images, CSS and fonts.

These will be added to `vercel.json` in Step 9 as permanent 301 redirects (`"statusCode": 301`). The "Today" column is what the live site returns now.

## Old pages with a new equivalent

| Old URL | Old topic | Today | Redirect to |
|---|---|---|---|
| `/index.php` | Old home | 403 | `/` |
| `/index-2.php` | Old home (copy) | 403 | `/` |
| `/index-2.html` | Old home (copy) | 404 | `/` |
| `/about.html` | About | 308 → `/about/` (works already) | no rule needed |
| `/contact.html` | Contact | 308 → `/contact/` (works already) | no rule needed |
| `/services.html` | Services | 404 | `/manufacturing/` |
| `/products.php` | Product list | 403 | `/products/` |
| `/products18c8.html` (`?id=wall cladding`) | Wall cladding | 404 | `/products/#facade-panels` |
| `/products2926.html` (`?id=potters`) | Pots | 404 | `/products/#frp-arches-gutters` |
| `/products43a0.html` (`?id=sculptures`) | Sculptures | 404 | `/products/#grc-custom` |
| `/updates.php/36516/Suppliers-for-pots` | Post: pots | 404 | `/products/#frp-arches-gutters` |
| `/updates.php/36958/Manufacturers-and-Suppliers-of-` | Post: title cut off in the archive | 404 | `/products/` |
| `/updates.php/36959/Manufacturers-and-Suppliers-of-` | Post: title cut off in the archive | 404 | `/products/` |
| `/updates.php/41428/RJ-Interiors-Providing-total-solutions-for-your-requirement-with-unique-products-using-FRP-` | Post: FRP products | 404 | `/products/#frp` |
| `/updates.php/41844/RJ-Interiors-offers-the--best-figurative-sculptures-suppliers-in-Bangalore` | Post: sculptures | 404 | `/products/#grc-custom` |
| `/updates.php/42096/We-Manufacturer-of-decorating-products----FRP-Planters` | Post: FRP planters | 404 | `/products/#frp-planters` |
| `/updates.php/42514/Rjinteriors-Offers-Wall-Cladding-System-Supplier` | Post: wall cladding | 404 | `/products/#facade-panels` |
| `/updates.php/47418/Find-the-best-FRP-works-for-your-home` | Post: FRP for homes | 404 | `/products/#frp` |

Each `updates.php` rule matches on the post number (`/updates.php/42096/(.*)`), so any version of the slug redirects. Query strings such as `?id=wall%20cladding` are ignored for matching.

## Old pages with no equivalent: leave as 404

RJIC doesn't currently list these products or topics, so a redirect would send the visitor somewhere irrelevant. Google treats that as a "soft 404" anyway.

| Old URL | Old topic |
|---|---|
| `/products8e52.html` (`?id=furnitures`) | Furniture |
| `/products97e1.html` (`?id=water bodies`) | Water bodies |
| `/productsd704.html` (`?id=murals`) | Murals [ASK CLIENT: are GRC murals or relief panels still offered? If yes, redirect to `/products/#grc-custom`] |
| `/updates.php/36517/Canvas-oil-paintings` | Paintings |
| `/updates.php/41207/Nothing-makes-a-house-feel-more-like-a-home-than-an-enticing-display-of-wall-art` | Wall art |
| `/admin/admin/index.html` and `/admin/admin/upload/*` | Old admin panel and uploads |
| `/opengraph-image?...` | Old share image |
| `/css/*`, `/fonts/*`, `/images/*`, `/demo/*` (the archive saved many as `.html`) | Old theme files, not pages |

## Notes

- `.php` URLs currently return 403 on Vercel, not 404. After deploying, check that the `vercel.json` rules run before that block. If they don't, the `.php` rows can't be redirected on Vercel.
- `/about.html` and `/contact.html` already redirect in one hop through Vercel's `cleanUrls`.
