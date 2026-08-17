import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkWikilinks from './src/lib/remark-wikilinks.mjs';

export default defineConfig({
  site: 'https://catstarry.xyz',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  // CI browser regressions inspect application console errors. Astro's development
  // toolbar is not product runtime and can emit HMR send-before-connect errors while
  // the dev WebSocket is still starting, so keep it for local development only.
  devToolbar: { enabled: process.env.CI !== 'true' },
  markdown: {
    processor: unified({ remarkPlugins: [remarkWikilinks] }),
    shikiConfig: {
      theme: 'catppuccin-mocha',
    },
  },
});
