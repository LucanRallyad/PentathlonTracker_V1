'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AdminGuard } from '@/components/AdminGuard';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CONSENT_TYPES = ['DATA_COLLECTION', 'PUBLIC_DISPLAY', 'PHOTO_USAGE', 'COMPETITION_PARTICIPATION'];
const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  active: { icon: CheckCircle, color: 'text-green-500' },
  expired: { icon: AlertTriangle, color: 'text-yellow-500' },
  missing: { icon: XCircle, color: 'text-red-500' },
};

export default function ConsentManagementPage() {
  const [filter, setFilter] = useState('all');
  const { data: athletes, isLoading } = useSWR(`/api/admin/consent?status=${filter}`, fetcher);

  return (
    <AdminGuard>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Consent Management</h1>
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'missing', 'expired', 'active'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Athlete</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                {CONSENT_TYPES.map(type => (
                  <th key={type} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {type.replace('_', ' ')}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              )}
              {athletes?.map((athlete: Record<string, unknown>) => (
                <tr key={athlete.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/consent/${athlete.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                      {athlete.firstName as string} {athlete.lastName as string}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{athlete.ageCategory as string}</td>
                  {CONSENT_TYPES.map(type => {
                    const status = ((athlete.consentStatus as Record<string, Record<string, string>>)?.[type]?.status) || 'missing';
                    const { icon: Icon, color } = STATUS_STYLES[status] || STATUS_STYLES.missing;
                    return (
                      <td key={type} className="px-4 py-3 text-center">
                        <Icon className={`w-5 h-5 inline ${color}`} />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      athlete.overallStatus === 'active' ? 'bg-green-100 text-green-700' :
                      athlete.overallStatus === 'expired' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {(athlete.overallStatus as string)?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {athletes?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No minor athletes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
