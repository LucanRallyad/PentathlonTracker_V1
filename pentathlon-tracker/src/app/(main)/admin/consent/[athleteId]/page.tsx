'use client';

import { useState, use } from 'react';
import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AthleteConsentPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = use(params);
  const { data: athlete, mutate } = useSWR(`/api/admin/consent/${athleteId}`, fetcher);

  const [form, setForm] = useState({
    guardianName: '',
    guardianEmail: '',
    guardianRelationship: 'PARENT',
    consentType: 'DATA_COLLECTION',
    consentGiven: true,
    consentExpiryDate: '',
    consentMethod: 'ONLINE_FORM',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const res = await fetch(`/api/admin/consent/${athleteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        consentExpiryDate: form.consentExpiryDate || undefined,
      }),
    });

    if (res.ok) {
      setMessage('Consent record saved successfully');
      setForm(f => ({ ...f, guardianName: '', guardianEmail: '', notes: '' }));
      mutate();
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
    setSubmitting(false);
  };

  return (
    <AdminGuard>
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/admin/consent" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Consent Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {athlete?.firstName} {athlete?.lastName}
            </h1>
            <p className="text-sm text-gray-500">{athlete?.ageCategory} · Consent Management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Record New Consent</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name *</label>
              <input
                type="text"
                value={form.guardianName}
                onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Email</label>
              <input
                type="email"
                value={form.guardianEmail}
                onChange={e => setForm(f => ({ ...f, guardianEmail: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
              <select
                value={form.guardianRelationship}
                onChange={e => setForm(f => ({ ...f, guardianRelationship: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="PARENT">Parent</option>
                <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                <option value="COACH_WITH_AUTHORITY">Coach with Authority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consent Type *</label>
              <select
                value={form.consentType}
                onChange={e => setForm(f => ({ ...f, consentType: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="DATA_COLLECTION">Data Collection</option>
                <option value="PUBLIC_DISPLAY">Public Display</option>
                <option value="PHOTO_USAGE">Photo Usage</option>
                <option value="COMPETITION_PARTICIPATION">Competition Participation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consent Method *</label>
              <select
                value={form.consentMethod}
                onChange={e => setForm(f => ({ ...f, consentMethod: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="ONLINE_FORM">Online Form</option>
                <option value="PAPER_SCANNED">Paper (Scanned)</option>
                <option value="VERBAL_RECORDED">Verbal (Recorded)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.consentExpiryDate}
                onChange={e => setForm(f => ({ ...f, consentExpiryDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={e => setForm(f => ({ ...f, consentGiven: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Consent Given</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Saving...' : 'Record Consent'}
          </button>
        </form>

        <div className="bg-white rounded-lg border">
          <h2 className="px-6 py-4 font-semibold text-gray-900 border-b">Existing Consent Records</h2>
          {athlete?.consentRecords?.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-500">No consent records yet</p>
          )}
          <div className="divide-y">
            {athlete?.consentRecords?.map((c: Record<string, unknown>) => (
              <div key={c.id as string} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{(c.consentType as string)?.replace('_', ' ')}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      c.consentGiven ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.consentGiven ? 'Given' : 'Denied'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(c.consentDate as string).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Guardian: {c.guardianName as string} ({c.guardianRelationship as string}) · Method: {c.consentMethod as string}
                  {c.consentExpiryDate ? ` · Expires: ${new Date(c.consentExpiryDate as string).toLocaleDateString()}` : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
