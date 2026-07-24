import { mountPhase42Runtime, type ActivityState } from './home-runtime';
import aboutFocus from '../../../docs/design/assets/planets/selected/planet-about-focus.webp?url';
import aboutMobile from '../../../docs/design/assets/planets/selected/planet-about-mobile.webp?url';
import aboutOverview from '../../../docs/design/assets/planets/selected/planet-about-overview.webp?url';
import blogFocus from '../../../docs/design/assets/planets/selected/planet-blog-focus.webp?url';
import blogMobile from '../../../docs/design/assets/planets/selected/planet-blog-mobile.webp?url';
import blogOverview from '../../../docs/design/assets/planets/selected/planet-blog-overview.webp?url';
import feedFocus from '../../../docs/design/assets/planets/selected/planet-feed-focus.webp?url';
import feedMobile from '../../../docs/design/assets/planets/selected/planet-feed-mobile.webp?url';
import feedOverview from '../../../docs/design/assets/planets/selected/planet-feed-overview.webp?url';
import learnFocus from '../../../docs/design/assets/planets/selected/planet-learn-focus.webp?url';
import learnMobile from '../../../docs/design/assets/planets/selected/planet-learn-mobile.webp?url';
import learnOverview from '../../../docs/design/assets/planets/selected/planet-learn-overview.webp?url';
import projectsFocus from '../../../docs/design/assets/planets/selected/planet-projects-focus.webp?url';
import projectsMobile from '../../../docs/design/assets/planets/selected/planet-projects-mobile.webp?url';
import projectsOverview from '../../../docs/design/assets/planets/selected/planet-projects-overview.webp?url';
import satelliteAsset from '../../../docs/design/prototypes/phase4-2/assets/satellites/has-beacon-body-v1.png?url';

type ProductionManifest = { schema_version?: number; signals?: Partial<Record<'blog' | 'feed' | 'learn' | 'projects', { state?: ActivityState }>> };
const assets = { about: { overview: aboutOverview, focus: aboutFocus, mobile: aboutMobile }, blog: { overview: blogOverview, focus: blogFocus, mobile: blogMobile }, feed: { overview: feedOverview, focus: feedFocus, mobile: feedMobile }, projects: { overview: projectsOverview, focus: projectsFocus, mobile: projectsMobile }, learn: { overview: learnOverview, focus: learnFocus, mobile: learnMobile } };
let mounted = false;
export function mountHome(): void { if (mounted) return; const journey = document.querySelector<HTMLElement>('.journey'); if (!journey) return; mounted = true; document.body.dataset.variant = 'drift'; const applyActivity = mountPhase42Runtime({ assets, satelliteAsset }); const url = journey.dataset.homeManifestUrl; if (!url) return; void fetch(url, { headers: { Accept: 'application/json' } }).then(async (response) => ({ response, manifest: await response.json() as ProductionManifest })).then(({ response, manifest }) => { if (!response.ok || manifest.schema_version !== 1 || !manifest.signals) return; const keys = ['blog', 'feed', 'learn', 'projects'] as const; const states = Object.fromEntries(keys.map((planet) => [planet, manifest.signals?.[planet]?.state])); if (!keys.every((planet) => states[planet] === 'active' || states[planet] === 'stable' || states[planet] === 'dormant')) return; applyActivity(states as Record<'blog' | 'feed' | 'learn' | 'projects', ActivityState>); }).catch(() => undefined); }
