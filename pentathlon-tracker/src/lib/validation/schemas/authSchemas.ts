import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .regex(/\d/, 'Password must contain at least 1 digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
}).strict();

export const athleteLoginSchema = z.object({
  athleteId: z.string().min(1, 'Athlete selection is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .regex(/\d/, 'Password must contain at least 1 digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AthleteLoginInput = z.infer<typeof athleteLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
