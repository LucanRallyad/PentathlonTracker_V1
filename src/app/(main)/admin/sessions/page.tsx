'use client';

import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { Monitor, Trash2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ActiveSessionsPage() {
  const { data: sessions, mutate, isLoading } = useSWR('/api/admin/sessions', fetcher, { refreshInterval: 30000 });

  const terminateSession = async (sessionId: string) => {
    if (!confirm('Force terminate this session?')) return;
    await fetch('/api/admin/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    mutate();
  };

  return (
    <AdminGuard>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {sessions?.length || 0} active
          </span>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              )}
              {sessions?.map((s: Record<string, unknown>) => (
                <tr key={s.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {(s.user as Record<string, string>)?.name || 'Unknown'}
                    <div className="text-xs text-gray-500">{(s.user as Record<string, string>)?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      (s.user as Record<string, string>)?.role === 'admin' ? 'bg-red-100 text-red-700' :
                      (s.user as Record<string, string>)?.role === 'official' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(s.user as Record<string, string>)?.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{s.ipAddress as string}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{s.userAgent as string}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(s.createdAt as string).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(s.lastActiveAt as string).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(s.expiresAt as string).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => terminateSession(s.id as string)}
                      className="text-red-500 hover:text-red-700 transition"
                      title="Force Terminate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sessions?.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No active sessions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
