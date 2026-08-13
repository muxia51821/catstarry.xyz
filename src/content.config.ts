import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/data/blog',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['tech', 'life', 'opinion']),
    tags: z.array(z.string()).default([]),
    description: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    state: z.enum(['draft', 'published', 'withdrawn']).optional(),
    // Transitional reader only. New Blog content must use state.
    draft: z.boolean().optional(),
    publication_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  }),
});

const learn = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/data/learn',
  }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string(),
    track: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    section: z.string().optional(),
    tags: z.array(z.string()).default([]),
    state: z.enum(['draft', 'published', 'superseded', 'withdrawn']).optional(),
    publishedAt: z.coerce.date().optional(),
    revisedAt: z.coerce.date().optional(),
    // Transitional readers only. New Learn content must use state/publishedAt/revisedAt.
    draft: z.boolean().optional(),
    publishDate: z.coerce.date().optional(),
    lastModified: z.coerce.date().optional(),
    excerpt: z.string().optional(),
  }),
});

export const collections = { blog, learn };
