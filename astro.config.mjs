import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://catstarry.xyz',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-latte',
    },
  },
});
