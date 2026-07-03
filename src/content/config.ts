import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.enum(['tech', 'life', 'opinion']),
    tags: z.array(z.string()).default([]),
    description: z.string(),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
