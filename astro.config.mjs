import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://catstarry.xyz',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-latte',
    },
  },
});