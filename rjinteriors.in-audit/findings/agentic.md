# Agent readiness: www.rjinteriors.in (checked 2026-10-29)

Score: 82/100

Lighthouse Agentic Browsing: not measurable. PSI returned HTTP 429 (daily quota, no API key) for mobile and desktop. Fraction unavailable; do not infer one. Re-run after configuring a Google API key. Standards facts checked 2026-09-23 (vendor-matrix.md).

Agent-UX heuristic (separate from Lighthouse): Home 100/100 (complete; 1070 a11y nodes, 97 interactive, 0 unnamed). /contact/ 100/100 (complete; 414 nodes, 49 interactive, 0 unnamed, 0 inputs without label). Heuristic only.

## What works
- Server-rendered static HTML; 1092 words on home without JS; real 404s (no soft-404).
- robots.txt reachable, single `User-agent: * / Allow: /` group, sitemap declared. No AI agent blocked.
- Contact form is agent-friendly: every control has a `<label for>`, fieldsets/legends for radio groups, `required` on name, phone, location, message; optional fields are labelled "(optional)" in the label text; `autocomplete` tokens; `aria-describedby` hints/errors; `role="status" aria-live` result region (src/pages/contact.html lines 27-147).
- Real buttons/links, no div-onclick widgets. JSON-LD present on home.

## Access policy (robots.txt, all via the `*` group, all allowed)
- Training (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended): allowed.
- Search (OAI-SearchBot, Claude-SearchBot, PerplexityBot): allowed.
- User-triggered (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): allowed by robots; some vendors ignore robots for user fetches by design.
- WAF/bot treatment on Vercel: NOT tested; agent UA matrix was not authorized. vercel.json has no firewall rules; Vercel Bot Protection settings live in the dashboard and could not be seen. Plain curl got 200.

## Findings

### 1. Enquiry form has no submit endpoint; mailto fallback is not agent-completable
Severity: Medium
Evidence: live form is `data-endpoint="" action="mailto:grcbanglore@gmail.com" method="post" enctype="text/plain" novalidate`. site.js (lines 123-243) with an empty endpoint builds a `window.location.href = mailto:` and only tells the user it "opened in your email app". A browsing agent (or any user without a mail client) cannot finish the task and gets no confirmation that anything was sent. Also, `novalidate` means the browser does not enforce `required`; only the JS does.
Fix: set `site.formEndpoint` (the `{{site.formEndpoint}}` value used in src/pages/contact.html line 27) to a real form service or Vercel function so submit is a normal POST with a success/error status. Keep the mailto link as visible fallback. Worth doing now (also a human conversion issue). The recipient being a personal Gmail address is the client's call; do not change facts.

### 2. Required state exposed only by the `required` attribute
Severity: Low
Evidence: `novalidate` plus custom validation sets `aria-invalid` after blur only. Required fields are announced as required via the attribute, which is sufficient for the a11y tree; the optional ones are marked in text.
Fix: optional: add `aria-required="true"` on the four required controls for older tooling. Not urgent.

### 3. No llms.txt
Severity: Info (opportunity)
Evidence: /llms.txt and /llms-full.txt return 404. Lighthouse treats this as not applicable, so it does not lower the fraction; publishing a valid one adds a counted audit. Google Search ignores it (community spec).
Fix: optional, cheap: a static file at src/ (copied to dist) with an H1, a `>` one-paragraph summary using only facts already on the site, and Markdown links to the 8 main pages and project index. Do not add claims not on the site.

### 4. No Content-Signal or per-purpose robots groups
Severity: Info
Evidence: robots.txt has no Content-Signal and no named AI groups. Content-Signal is a draft/preference, not enforcement; Google says it does not act on it (checked 2026-09-23).
Fix: current open policy suits a B2B manufacturer seeking discovery. Only add groups/Content-Signal if the client wants to opt out of training, e.g. `Content-Signal: search=yes, ai-input=yes, ai-train=no` (their decision).

### 5. Markdown delivery, ai-catalog.json, .well-known, WebMCP absent
Severity: Info (not defects)
Evidence: no Accept: text/markdown negotiation, no .md siblings, /.well-known/ai-catalog.json, api-catalog, oauth, agent-card, ucp all 404; no registerTool, `navigator.modelContext` absent. WebMCP is a W3C Community Group draft (WebKit opposes, Mozilla neutral); ai-catalog.json/ARD is a draft spec. Static scan was home only, which has no forms.
Fix: skip ai-catalog/.well-known (no agent services to list). WebMCP is experimental: if ever tried, one declarative annotation on the contact form (src/pages/contact.html line 27) is the only sensible candidate. Markdown delivery would need a build step in build.mjs plus Vercel rewrites; not recommended at this size.

### 6. Bot-protection verification pending
Severity: Info
Evidence: no UA matrix run. Fix: ask the client to confirm in the Vercel dashboard that Attack Challenge Mode / Bot Protection is not blocking AI crawlers and that Vercel Firewall has no AI-bot deny rule; authorize `--ua-matrix` for a live check.

## Priorities
Worth doing now: re-run PSI with an API key for the fraction; configure the form endpoint (#1); confirm Vercel bot settings (#6).
Optional/experimental: llms.txt (#3), Content-Signal (#4), aria-required (#2).
Skip: Markdown delivery, ai-catalog.json, .well-known, WebMCP (#5).

## Audit-data findings (AI Search Readiness)
[{"title":"Enquiry form has no endpoint; mailto-only","severity":"medium","description":"Empty data-endpoint; submit opens mail client, agents cannot complete or confirm.","recommendation":"Set site.formEndpoint to a real form service; keep mailto as fallback."},
{"title":"No llms.txt","severity":"info","description":"404; Lighthouse not-applicable.","recommendation":"Optional short llms.txt using only existing site facts."},
{"title":"No Content-Signal / WebMCP / ai-catalog / Markdown","severity":"info","description":"All draft or optional; absence is an opportunity.","recommendation":"Skip or treat as experimental."},
{"title":"Lighthouse agentic fraction unmeasured","severity":"info","description":"PSI quota 429.","recommendation":"Re-run with Google API key."}]
