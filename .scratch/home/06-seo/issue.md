**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# H06: Home SEO - Title, Description, OG Tags + Sitemap

## Parent

docs/final-requirements-homepage.json - Goal G006

## What to build

SEO optimization for the Home page:
- title: site title
- meta description: site description
- OG tags: og:title, og:description, og:type (website), og:url, og:image
- Twitter card: summary_large_image
- /sitemap.xml includes Home page with priority 1.0
- Structured data: WebSite schema

## Acceptance criteria

- [ ] title element set correctly
- [ ] meta description present and correct
- [ ] OG tags: title, description, type, url, image all present
- [ ] Twitter card meta tags present
- [ ] Home appears in sitemap.xml with priority 1.0
- [ ] Valid HTML head structure

## Blocked by

- H01: needs Home route to inject SEO tags
