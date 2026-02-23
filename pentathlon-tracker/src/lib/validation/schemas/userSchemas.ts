import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'official', 'athlete']),
}).strict();

export const userSearchSchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(['admin', 'official', 'athlete']).optional(),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
