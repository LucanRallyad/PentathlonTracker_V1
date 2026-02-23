'use client';

import { ShieldAlert } from 'lucide-react';

export default function SensitiveDataBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">
          Confidential Data — Do Not Share
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          This page displays confidential athlete information. Do not screenshot, copy, or share this data outside of official competition management purposes.
        </p>
      </div>
    </div>
  );
}
