import { z } from 'zod';

const ageCategoryEnum = z.enum([
  'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Junior', 'Senior', 'Masters',
]);

const genderEnum = z.enum(['M', 'F']);

export const createAthleteSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  country: z.string().min(1, 'Country is required').max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  ageCategory: ageCategoryEnum,
  club: z.string().max(100).optional(),
  gender: genderEnum,
}).strict();

export const updateAthleteSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  country: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  ageCategory: ageCategoryEnum.optional(),
  club: z.string().max(100).optional().nullable(),
  gender: genderEnum.optional(),
}).strict();

export const athleteSearchSchema = z.object({
  search: z.string().max(100).optional(),
  competitionId: z.string().optional(),
  ageCategory: ageCategoryEnum.optional(),
  gender: genderEnum.optional(),
});

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
