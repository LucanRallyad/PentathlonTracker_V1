'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/useAuth';
import { Shield, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PrivacySettingsPage() {
  const { user, athleteId } = useAuth();
  const router = useRouter();
  const { data: settings, mutate: mutateSettings } = useSWR(
    athleteId ? '/api/athlete/privacy' : null,
    fetcher
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    showFullName: true,
    showCountry: true,
    showClub: true,
    showAgeCategory: true,
    showInDirectory: true,
    showOnLeaderboard: true,
    allowTrainingDataSharing: false,
    profileVisibility: 'PUBLIC',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        showFullName: settings.showFullName ?? true,
        showCountry: settings.showCountry ?? true,
        showClub: settings.showClub ?? true,
        showAgeCategory: settings.showAgeCategory ?? true,
        showInDirectory: settings.showInDirectory ?? true,
        showOnLeaderboard: settings.showOnLeaderboard ?? true,
        allowTrainingDataSharing: settings.allowTrainingDataSharing ?? false,
        profileVisibility: settings.profileVisibility || 'PUBLIC',
      });
    }
  }, [settings]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/athlete/privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMessage('Privacy settings saved!');
      mutateSettings();
    } else {
      setMessage('Failed to save settings');
    }
    setSaving(false);
  };

  const requestExport = async () => {
    const res = await fetch('/api/athlete/export', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const err = await res.json();
      alert(err.error || 'Export failed');
    }
  };

  const requestDeletion = async () => {
    if (!confirm('Are you sure? This will schedule your data for deletion after a 14-day cooling-off period. You can cancel within that period.')) return;
    const res = await fetch('/api/athlete/deletion', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(`Deletion scheduled for ${new Date(data.scheduledDate).toLocaleDateString()}. You can cancel from this page.`);
    } else {
      alert(data.error || 'Failed to create deletion request');
    }
  };

  if (!user && !athleteId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please log in to manage your privacy settings.</p>
        <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Profile Visibility</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Who can see your profile?</label>
          <select
            value={form.profileVisibility}
            onChange={e => setForm(f => ({ ...f, profileVisibility: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="PUBLIC">Public — anyone can view</option>
            <option value="AUTHENTICATED_ONLY">Authenticated — only logged-in users</option>
            <option value="PRIVATE">Private — only you and officials</option>
          </select>
        </div>

        <h2 className="font-semibold text-gray-900 pt-2">Display Preferences</h2>

        {[
          { key: 'showFullName', label: 'Show Full Name', desc: 'Display your full name publicly. If disabled, only first name and last initial shown.', icon: Eye },
          { key: 'showCountry', label: 'Show Country', desc: 'Display your country on public pages.', icon: Eye },
          { key: 'showClub', label: 'Show Club', desc: 'Display your club affiliation publicly.', icon: Eye },
          { key: 'showAgeCategory', label: 'Show Age Category', desc: 'Display your age category on public pages.', icon: Eye },
          { key: 'showInDirectory', label: 'Appear in Athlete Directory', desc: 'Allow your profile to be listed in the athlete directory.', icon: Eye },
          { key: 'showOnLeaderboard', label: 'Appear on Leaderboards', desc: 'Show your name and scores on competition leaderboards.', icon: Eye },
          { key: 'allowTrainingDataSharing', label: 'Share Training Data', desc: 'Allow coaches to view your training entries.', icon: EyeOff },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key as keyof typeof form] as boolean}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </label>
        ))}

        {message && <p className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}

        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Your Data</h2>
        <div className="space-y-3">
          <button
            onClick={requestExport}
            className="flex items-center gap-2 w-full px-4 py-3 border rounded-lg hover:bg-gray-50 transition text-left"
          >
            <Download className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Export My Data</p>
              <p className="text-xs text-gray-500">Download a copy of all your data (JSON format). Limited to once per 24 hours.</p>
            </div>
          </button>

          <button
            onClick={requestDeletion}
            className="flex items-center gap-2 w-full px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50 transition text-left"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Request Account Deletion</p>
              <p className="text-xs text-red-500">Your data will be anonymized after a 14-day cooling-off period.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
