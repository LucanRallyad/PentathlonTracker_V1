import { hash, compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * DOB Protection Service
 * Handles DOB verification without exposing raw values.
 */
export const DOBProtectionService = {
  /**
   * Hash a DOB string for storage.
   */
  async hashDOB(dob: string): Promise<string> {
    return hash(dob, 10);
  },

  /**
   * Verify a DOB input against the stored hash.
   */
  async verifyDOB(athleteId: string, inputDOB: string): Promise<boolean> {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { dobHash: true, dateOfBirth: true },
    });

    if (!athlete) return false;

    // If dobHash exists, use it
    if (athlete.dobHash) {
      return compare(inputDOB, athlete.dobHash);
    }

    // Fallback to raw DOB comparison (for migration period)
    return athlete.dateOfBirth === inputDOB;
  },

  /**
   * Get age category without exposing DOB.
   */
  async getAgeCategory(athleteId: string): Promise<string | null> {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { ageCategory: true },
    });
    return athlete?.ageCategory ?? null;
  },

  /**
   * Get actual age (admin-only usage).
   */
  async getAge(athleteId: string): Promise<number | null> {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { dateOfBirth: true },
    });

    if (!athlete?.dateOfBirth) return null;

    const birthDate = new Date(athlete.dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },

  /**
   * Get age range string instead of exact age (for non-admin users).
   */
  async getAgeRange(athleteId: string): Promise<string | null> {
    const age = await this.getAge(athleteId);
    if (age === null) return null;

    if (age < 9) return 'Under 9';
    if (age < 11) return '9-10';
    if (age < 13) return '11-12';
    if (age < 15) return '13-14';
    if (age < 17) return '15-16';
    if (age < 19) return '17-18';
    if (age < 22) return '19-21';
    return '22+';
  },

  /**
   * Hash all existing plain-text DOBs in the database.
   * Run this as a migration script.
   */
  async hashAllExistingDOBs(): Promise<{ processed: number }> {
    const athletes = await prisma.athlete.findMany({
      where: {
        dateOfBirth: { not: null },
        dobHash: null,
      },
      select: { id: true, dateOfBirth: true },
    });

    let processed = 0;
    for (const athlete of athletes) {
      if (athlete.dateOfBirth) {
        const dobHash = await this.hashDOB(athlete.dateOfBirth);
        await prisma.athlete.update({
          where: { id: athlete.id },
          data: { dobHash },
        });
        processed++;
      }
    }

    return { processed };
  },
};
