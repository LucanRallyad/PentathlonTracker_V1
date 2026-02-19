'use client';

import useSWR from 'swr';
import { ShieldAlert } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SecurityAlertBadge() {
  const { data } = useSWR('/api/admin/security/alerts/count', fetcher, {
    refreshInterval: 30000,
  });

  const total = data
    ? (data.HIGH || 0) + (data.CRITICAL || 0)
    : 0;

  if (total === 0) return null;

  return (
    <div className="relative inline-flex">
      <ShieldAlert className="w-5 h-5 text-red-500" />
      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
        {total > 9 ? '9+' : total}
      </span>
    </div>
  );
}
