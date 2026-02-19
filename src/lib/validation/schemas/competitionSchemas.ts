import { z } from 'zod';

const competitionStatusEnum = z.enum(['upcoming', 'active', 'completed']);
const competitionTypeEnum = z.enum(['individual', 'relay', 'team']);
const ageCategoryEnum = z.enum([
  'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Junior', 'Senior', 'Masters', 'All',
]);

export const createCompetitionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  location: z.string().min(1, 'Location is required').max(200),
  description: z.string().max(2000).optional(),
  competitionType: competitionTypeEnum.optional().default('individual'),
  ageCategory: ageCategoryEnum.optional().default('Senior'),
}).strict();

export const updateCompetitionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: competitionStatusEnum.optional(),
  competitionType: competitionTypeEnum.optional(),
  ageCategory: ageCategoryEnum.optional(),
}).strict();

export const addCompetitionAthleteSchema = z.object({
  athleteId: z.string().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  country: z.string().min(1).max(100).optional(),
  ageCategory: ageCategoryEnum.optional(),
  gender: z.enum(['M', 'F']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  club: z.string().max(100).optional(),
}).strict();

export const competitionSearchSchema = z.object({
  status: competitionStatusEnum.optional(),
  search: z.string().max(100).optional(),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
