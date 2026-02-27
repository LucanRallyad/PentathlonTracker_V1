'use client';

import { Eye } from 'lucide-react';

interface DataAccessNoticeProps {
  athleteName: string;
}

export default function DataAccessNotice({ athleteName }: DataAccessNoticeProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
      <Eye className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-blue-800">
          Data Access Recorded
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          You are viewing {athleteName}&apos;s personal data. This access has been logged for audit purposes.
        </p>
      </div>
    </div>
  );
}
