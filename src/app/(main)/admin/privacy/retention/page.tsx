'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { Database, Play } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DataRetentionPage() {
  const { data, mutate, isLoading } = useSWR('/api/admin/privacy/retention', fetcher);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | Record<string, unknown>>(null);

  const runRetention = async () => {
    if (!confirm('Run data retention process? This will permanently delete expired data.')) return;
    setRunning(true);
    const res = await fetch('/api/admin/privacy/retention/process', { method: 'POST' });
    const data = await res.json();
    setResult(data);
    setRunning(false);
    mutate();
  };

  return (
    <AdminGuard>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Data Retention</h1>
          </div>
          <button
            onClick={runRetention}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm"
          >
            <Play className="w-4 h-4" />
            {running ? 'Processing...' : 'Run Retention Process'}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-green-800">Retention process completed</p>
            <pre className="text-xs text-green-700 mt-1">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="bg-white rounded-lg border mb-6">
              <h2 className="px-6 py-4 font-semibold text-gray-900 border-b">Retention Policies</h2>
              <div className="divide-y">
                {data?.retentionPolicies && Object.entries(data.retentionPolicies).map(([key, days]) => (
                  <div key={key} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm font-mono text-gray-500">{days as number} days</span>
                  </div>
                ))}
              </div>
            </div>

            {data?.upcomingDeletions?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">Upcoming Deletions</h3>
                {data.upcomingDeletions.map((d: Record<string, unknown>, i: number) => (
                  <p key={i} className="text-xs text-yellow-700">
                    {d.model as string}: {d.count as number} records pending {d.action as string}
                  </p>
                ))}
              </div>
            )}

            <div className="bg-white rounded-lg border">
              <h2 className="px-6 py-4 font-semibold text-gray-900 border-b">Recent Retention Log</h2>
              {data?.recentLogs?.length === 0 ? (
                <p className="px-6 py-8 text-center text-gray-500">No retention actions yet</p>
              ) : (
                <div className="divide-y">
                  {data?.recentLogs?.map((log: Record<string, unknown>) => (
                    <div key={log.id as string} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{log.action as string}</span>
                        <span className="text-xs text-gray-500 ml-2">{log.targetType as string}:{log.targetId as string}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(log.processedAt as string).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
