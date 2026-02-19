'use client';

import { useAuth } from '@/lib/useAuth';
import { getFieldClassification, canRoleAccessLevel } from '@/lib/dataClassification';

interface ProtectedFieldProps {
  model: string;
  field: string;
  value: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export default function ProtectedField({
  model,
  field,
  value,
  fallback = <span className="text-gray-400 italic">[Restricted]</span>,
  className,
}: ProtectedFieldProps) {
  const { user } = useAuth();
  const viewerRole = user?.role ?? null;
  const classification = getFieldClassification(model, field);

  if (!canRoleAccessLevel(viewerRole, classification)) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{value}</span>;
}
