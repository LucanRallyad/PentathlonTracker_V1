'use client';

interface PasswordStrengthMeterProps {
  password: string;
}

function calculateStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  score += Math.min(password.length * 4, 40);
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/^[a-zA-Z]+$/.test(password)) score -= 10;
  if (/^\d+$/.test(password)) score -= 15;
  if (/(.)\1{2,}/.test(password)) score -= 10;

  score = Math.max(0, Math.min(100, score));

  if (score < 30) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score < 50) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score < 70) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score < 90) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-emerald-500' };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, color } = calculateStrength(password);

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Strength: <span className="font-medium">{label}</span>
      </p>
      <div className="text-xs text-gray-400 mt-1 space-y-0.5">
        <p className={password.length >= 10 ? 'text-green-600' : ''}>
          {password.length >= 10 ? '\u2713' : '\u2717'} At least 10 characters
        </p>
        <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
          {/[A-Z]/.test(password) ? '\u2713' : '\u2717'} Uppercase letter
        </p>
        <p className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
          {/[a-z]/.test(password) ? '\u2713' : '\u2717'} Lowercase letter
        </p>
        <p className={/\d/.test(password) ? 'text-green-600' : ''}>
          {/\d/.test(password) ? '\u2713' : '\u2717'} Number
        </p>
        <p className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>
          {/[^A-Za-z0-9]/.test(password) ? '\u2713' : '\u2717'} Special character
        </p>
      </div>
    </div>
  );
}
