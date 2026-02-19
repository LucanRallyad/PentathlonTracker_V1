import { z } from 'zod';

export const globalSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
  type: z.enum(['athletes', 'competitions', 'all']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;
