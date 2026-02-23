'use client';

import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { UserX } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  COOLING_OFF: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function DeletionRequestsPage() {
  const { data: requests, mutate, isLoading } = useSWR('/api/admin/privacy/deletion-requests', fetcher);

  const cancelRequest = async (requestId: string) => {
    if (!confirm('Cancel this deletion request?')) return;
    await fetch('/api/admin/privacy/deletion-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'cancel' }),
    });
    mutate();
  };

  return (
    <AdminGuard>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <UserX className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Deletion Requests</h1>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Athlete</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              )}
              {requests?.map((r: Record<string, unknown>) => (
                <tr key={r.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {(r.athlete as Record<string, string>)?.firstName} {(r.athlete as Record<string, string>)?.lastName}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.requestedBy as string}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.status as string] || ''}`}>
                      {r.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.requestDate as string).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.scheduledDeletionDate ? new Date(r.scheduledDeletionDate as string).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'COOLING_OFF' && (
                      <button
                        onClick={() => cancelRequest(r.id as string)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {requests?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No deletion requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
