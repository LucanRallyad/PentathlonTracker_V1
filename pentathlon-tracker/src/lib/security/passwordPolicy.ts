import { hash, compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const PASSWORD_HISTORY_COUNT = 5;
const PASSWORD_EXPIRY_DAYS: Record<string, number> = {
  admin: 90,
  official: 90,
  athlete: 180,
};

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const passwordPolicy = {
  /**
   * Validate password complexity requirements.
   */
  validateComplexity(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 10) errors.push('Password must be at least 10 characters');
    if (password.length > 128) errors.push('Password must be at most 128 characters');
    if (!/[A-Z]/.test(password)) errors.push('Must contain at least 1 uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain at least 1 lowercase letter');
    if (!/\d/.test(password)) errors.push('Must contain at least 1 digit');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain at least 1 special character');

    return { valid: errors.length === 0, errors };
  },

  /**
   * Check if a password was previously used (last 5 passwords).
   */
  async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_COUNT,
    });

    for (const entry of history) {
      if (await compare(newPassword, entry.hashedPassword)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Record a password in history after a successful change.
   */
  async recordPasswordHistory(userId: string, hashedPassword: string): Promise<void> {
    await prisma.passwordHistory.create({
      data: { userId, hashedPassword },
    });

    // Clean up old entries beyond the limit
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (history.length > PASSWORD_HISTORY_COUNT) {
      const toDelete = history.slice(PASSWORD_HISTORY_COUNT);
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete.map(h => h.id) } },
      });
    }
  },

  /**
   * Check if a user's password has expired.
   */
  async isPasswordExpired(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, passwordChangedAt: true, forcePasswordChange: true },
    });

    if (!user) return false;
    if (user.forcePasswordChange) return true;

    if (!user.passwordChangedAt) return true; // Never changed

    const expiryDays = PASSWORD_EXPIRY_DAYS[user.role] || 180;
    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    return new Date() > expiryDate;
  },

  /**
   * Change a user's password with full validation.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) return { success: false, error: 'User not found' };

    // Verify current password
    const currentValid = await compare(currentPassword, user.passwordHash);
    if (!currentValid) return { success: false, error: 'Current password is incorrect' };

    // Validate complexity
    const complexity = this.validateComplexity(newPassword);
    if (!complexity.valid) return { success: false, error: complexity.errors[0] };

    // Check password history
    const reused = await this.isPasswordReused(userId, newPassword);
    if (reused) return { success: false, error: 'Cannot reuse a recent password' };

    // Hash and save
    const newHash = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        forcePasswordChange: false,
      },
    });

    // Record in history
    await this.recordPasswordHistory(userId, newHash);

    return { success: true };
  },

  /**
   * Calculate password strength score (0-100).
   */
  calculateStrength(password: string): number {
    let score = 0;

    // Length scoring
    score += Math.min(password.length * 4, 40);

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    // Penalty for common patterns
    if (/^[a-zA-Z]+$/.test(password)) score -= 10;
    if (/^\d+$/.test(password)) score -= 15;
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeating characters

    return Math.max(0, Math.min(100, score));
  },
};
