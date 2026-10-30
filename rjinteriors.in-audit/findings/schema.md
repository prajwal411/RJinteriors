# Schema: rjinteriors.in

Score: 72/100

Status: summarised from the schema check's report. The original file did not survive.

## What works
- One valid, server-rendered JSON-LD @graph on every page: Organization on all pages, WebSite on the home page, and BreadcrumbList on inner pages. The BreadcrumbList is correct and eligible for rich results.
- No deprecated types and no FAQPage.

## Findings
- **Medium:** don't add grcbangalore.com or frpbangalore.com as `sameAs`, because sameAs means "same entity". The existing `brand` array is the right relation. Use sameAs only for real profiles: Google Business Profile, LinkedIn, IndiaMART or JustDial, once they exist.
- **Medium:** keep Organization and don't use LocalBusiness yet. There is no street address, PIN code, geo coordinates or hours. Once the client confirms the address, use `["Organization","LocalBusiness"]` on the same @id.
- **Medium:** add `alternateName: "RJIC"` and `inLanguage: "en-IN"` to the WebSite node, for Google's site-name feature (jsonLd() in build.mjs).
- **Medium:** the markup says "Bangalore" but the project data says "Bengaluru". Pick one spelling for the address.
- **Low:** ContactPoints lack `areaServed` and `availableLanguage`, and the second email isn't in the markup.
- **Low:** /projects/ could get CollectionPage plus ItemList, and project pages could get CreativeWork plus ImageObject built from the existing alt text and image sizes.
- **Info:** no Product or Review markup. There are no prices or real reviews, and the brief forbids invented specs.
- **Needs client input:** street address and PIN, hours, Maps link, city spelling, official profile URLs, and the languages spoken on calls.
