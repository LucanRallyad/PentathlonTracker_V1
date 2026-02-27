import { z } from 'zod';

/**
 * Environment variable validation.
 * Fails fast on startup if required variables are missing.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters').optional(),
  ENCRYPTION_KEY: z.string().min(16, 'ENCRYPTION_KEY must be at least 16 characters').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables. See logs for details.');
    } else {
      console.warn('Running with missing env vars in development mode.');
    }
  }

  validatedEnv = (result.success ? result.data : process.env) as Env;
  return validatedEnv;
}

export function getEnv(): Env {
  return validateEnv();
}
