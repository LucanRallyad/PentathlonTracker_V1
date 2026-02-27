'use client';

import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { ShieldAlert, CheckCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  HIGH: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  LOW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
};

export default function SecurityAlertsPage() {
  const { data: alerts, mutate, isLoading } = useSWR('/api/admin/security/alerts', fetcher, { refreshInterval: 15000 });

  const acknowledgeAlert = async (alertId: string) => {
    await fetch('/api/admin/security/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    });
    mutate();
  };

  const acknowledgeAll = async () => {
    await fetch('/api/admin/security/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgeAll: true }),
    });
    mutate();
  };

  const unacknowledged = alerts?.filter((a: Record<string, unknown>) => !a.acknowledged) || [];
  const acknowledged = alerts?.filter((a: Record<string, unknown>) => a.acknowledged) || [];

  return (
    <AdminGuard>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Security Alerts</h1>
          </div>
          {unacknowledged.length > 0 && (
            <button
              onClick={acknowledgeAll}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Acknowledge All ({unacknowledged.length})
            </button>
          )}
        </div>

        {isLoading && <p className="text-gray-500">Loading alerts...</p>}

        {unacknowledged.length === 0 && !isLoading && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-medium">No unacknowledged alerts</p>
          </div>
        )}

        {unacknowledged.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-gray-600 uppercase">Active Alerts</h2>
            {unacknowledged.map((alert: Record<string, unknown>) => {
              const style = SEVERITY_STYLES[alert.severity as string] || SEVERITY_STYLES.LOW;
              return (
                <div key={alert.id as string} className={`${style.bg} border ${style.border} rounded-lg p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${style.text}`}>{alert.severity as string}</span>
                        <span className="text-xs text-gray-500 font-mono">{alert.alertType as string}</span>
                      </div>
                      <p className={`text-sm font-medium ${style.text}`}>{alert.message as string}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp as string).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id as string)}
                      className="px-3 py-1.5 bg-white border rounded-md text-xs hover:bg-gray-50 transition"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {acknowledged.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600 uppercase">Acknowledged</h2>
            {acknowledged.map((alert: Record<string, unknown>) => (
              <div key={alert.id as string} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-mono mr-2">{alert.alertType as string}</span>
                  <span className="text-sm text-gray-600">{alert.message as string}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(alert.timestamp as string).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
