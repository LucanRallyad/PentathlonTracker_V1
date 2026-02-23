'use client';

import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenSettings?: () => void;
}

export default function CookieConsentBanner({ onOpenSettings }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = document.cookie.split(';').find(c => c.trim().startsWith('cookie_consent='));
    if (!consent) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    document.cookie = 'cookie_consent=all; path=/; max-age=31536000; SameSite=Lax';
    setVisible(false);
  };

  const acceptNecessary = () => {
    document.cookie = 'cookie_consent=necessary; path=/; max-age=31536000; SameSite=Lax';
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-4 md:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <Cookie className="w-6 h-6 text-gray-500 shrink-0 mt-1 md:mt-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            We use cookies to ensure the application works correctly. You can choose which optional cookies to accept.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={acceptNecessary}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Necessary Only
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Customize
            </button>
          )}
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
