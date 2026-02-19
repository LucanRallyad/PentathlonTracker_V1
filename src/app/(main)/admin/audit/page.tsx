'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ALERT: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = new URLSearchParams();
  params.set('page', String(page));
  if (eventType) params.set('eventType', eventType);
  if (severity) params.set('severity', severity);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const { data, isLoading } = useSWR(`/api/admin/audit?${params}`, fetcher);

  return (
    <AdminGuard>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          </div>
          <a
            href="/api/admin/audit/export"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Events</option>
            <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
            <option value="AUTH_LOGIN_FAILURE">Login Failure</option>
            <option value="AUTH_DOB_LOGIN_FAILURE">DOB Login Failure</option>
            <option value="AUTH_REGISTER">Registration</option>
            <option value="AUTH_PASSWORD_CHANGE">Password Change</option>
            <option value="DATA_CREATE">Data Create</option>
            <option value="DATA_UPDATE">Data Update</option>
            <option value="SCORE_CREATE">Score Create</option>
            <option value="SCORE_UPDATE">Score Update</option>
            <option value="ADMIN_ROLE_CHANGE">Role Change</option>
            <option value="PRIVACY_CONSENT_CHANGE">Consent Change</option>
            <option value="PRIVACY_DELETION_REQUEST">Deletion Request</option>
            <option value="PRIVACY_DATA_EXPORT">Data Export</option>
          </select>
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Severity</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ALERT">Alert</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="End Date"
          />
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              )}
              {data?.logs?.map((log: Record<string, string | number>) => (
                <tr key={log.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(log.timestamp as string).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{log.eventType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEVERITY_COLORS[log.severity as string] || 'bg-gray-100'}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{(log.actorId as string)?.substring(0, 8)}...</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {log.targetType && `${log.targetType}:${(log.targetId as string)?.substring(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.actorIp}</td>
                </tr>
              ))}
              {data?.logs?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded border disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 50 >= data.total}
                className="p-2 rounded border disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
