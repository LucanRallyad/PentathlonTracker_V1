import { getMastersHandicapBonus } from "./constants";

/**
 * Apply Masters age handicap bonus to total score.
 * Base age = 40 (0 bonus).
 *
 * @param totalPoints - The athlete's raw total MP points
 * @param age - The athlete's current age
 * @returns The adjusted total with handicap bonus applied
 */
export function applyMastersHandicap(
  totalPoints: number,
  age: number
): { adjustedTotal: number; bonus: number } {
  const bonus = getMastersHandicapBonus(age);
  return {
    adjustedTotal: totalPoints + bonus,
    bonus,
  };
}

/**
 * Calculate athlete age from date of birth.
 */
export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
