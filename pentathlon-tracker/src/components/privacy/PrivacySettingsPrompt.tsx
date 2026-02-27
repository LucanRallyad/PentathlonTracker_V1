'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';

interface PrivacySettingsPromptProps {
  onDismiss: () => void;
  onNavigate: () => void;
}

export default function PrivacySettingsPrompt({ onDismiss, onNavigate }: PrivacySettingsPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-4 mb-6 flex items-start gap-3">
      <Shield className="w-6 h-6 text-indigo-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-indigo-800">
          Review Your Privacy Settings
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          Control how your data is displayed to other users. You can choose what information is visible on public pages.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onNavigate}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition"
          >
            Review Settings
          </button>
          <button
            onClick={() => { setDismissed(true); onDismiss(); }}
            className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-300 text-xs rounded-md hover:bg-indigo-50 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
