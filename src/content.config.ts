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
    draft: z.boolean().default(false),
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
    draft: z.boolean().default(true),
    publishDate: z.coerce.date(),
    lastModified: z.coerce.date(),
    excerpt: z.string().optional(),
    completionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    parentSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    sourceUrl: z.string().url().optional(),
  }),
});

export const collections = { blog, learn };
