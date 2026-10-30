# GEO / AI search readiness: www.rjinteriors.in

Status: PARTIAL (first pass: crawler access, llms.txt, on-page citability). Brand-mention and SERP-presence checks still running.

Score: 58/100 (provisional)

## What works
- robots.txt is `User-agent: * / Allow: /` and all 21 tested crawler UAs (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Googlebot, Bingbot, Applebot, CCBot, cohere-ai, meta-externalagent, Amazonbot, DuckAssistBot, Bytespider, MistralAI-User, GoogleOther) get HTTP 200 on /, /products/, /manufacturing/ and /robots.txt. Bodies are byte-identical to a Chrome UA, so there is no Vercel firewall, bot-protection or cloaking.
- All content is server-rendered static HTML (is_spa = false). No JavaScript is needed to read any text.
- /about/ opens with a clear entity definition naming RJIC, its materials, its Bangalore facility and its five brands.
- /products/ has a definitional passage for GRC and FRP and a GRC vs FRP comparison table.

## Findings (first pass, to be expanded)
- Medium: llms.txt returns 404 (optional; Google ignores it).
- Medium: inline spans with no whitespace produce joined words in text extraction ("GRCGlass fibre reinforced concrete", "Domes and minaretsGRC", "1Prepare the mould").
- High: homepage passages lose most content in boilerplate-stripped extraction (120 of ~1,000 words kept).
- High: product passages on /products/ never name RJIC or Bangalore, so a quoted passage does not answer "who makes GRC jalis in Bangalore".
- High: no off-site entity footprint yet (no sameAs, no Google Business Profile, no directory listings).
