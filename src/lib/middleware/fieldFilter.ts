import { ClassificationLevel, canRoleAccessLevel, getFieldClassification } from '@/lib/dataClassification';

/**
 * Field-level response filtering based on viewer role and data classification.
 * Strips fields the viewer is not authorized to see.
 */
export function filterFieldsForRole<T extends Record<string, unknown>>(
  data: T,
  model: string,
  viewerRole: string | null
): Partial<T> {
  const filtered: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(data)) {
    const classification = getFieldClassification(model, field);
    if (canRoleAccessLevel(viewerRole, classification)) {
      filtered[field] = value;
    }
  }

  return filtered as Partial<T>;
}

/**
 * Filter an array of records.
 */
export function filterArrayForRole<T extends Record<string, unknown>>(
  data: T[],
  model: string,
  viewerRole: string | null
): Partial<T>[] {
  return data.map(item => filterFieldsForRole(item, model, viewerRole));
}

/**
 * Get a Prisma select object that only includes fields the viewer can access.
 */
export function getPrismaSelectForRole(
  model: string,
  viewerRole: string | null,
  maxLevel?: ClassificationLevel
): Record<string, boolean> {
  const select: Record<string, boolean> = {};
  const effectiveMaxLevel = maxLevel ?? getMaxLevelForRole(viewerRole);

  const { getFieldsAtLevel } = require('@/lib/dataClassification');
  const fields = getFieldsAtLevel(model, effectiveMaxLevel);

  for (const field of fields) {
    select[field] = true;
  }

  return select;
}

function getMaxLevelForRole(role: string | null): ClassificationLevel {
  if (role === 'admin') return ClassificationLevel.RESTRICTED;
  if (role === 'official') return ClassificationLevel.CONFIDENTIAL;
  if (role === 'athlete') return ClassificationLevel.INTERNAL;
  return ClassificationLevel.PUBLIC;
}
