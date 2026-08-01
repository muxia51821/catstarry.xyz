import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkWikilinks from './src/lib/remark-wikilinks.mjs';

export default defineConfig({
  site: 'https://catstarry.xyz',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  markdown: {
    processor: unified({ remarkPlugins: [remarkWikilinks] }),
    shikiConfig: {
      theme: 'catppuccin-mocha',
    },
  },
});
