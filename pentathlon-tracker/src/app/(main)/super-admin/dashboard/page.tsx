'use client';

import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import {
  Users, Trophy, Shield, Activity, Globe, BarChart3, AlertTriangle, Monitor,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Helper to create pie chart label renderers with proper typing
function renderPieLabel(nameKey: string, valueKey: string) {
  return (props: PieLabelRenderProps) => {
    const p = props as PieLabelRenderProps & Record<string, unknown>;
    return `${p[nameKey]} (${p[valueKey]})`;
  };
}

function renderGenderLabel(props: PieLabelRenderProps) {
  const p = props as PieLabelRenderProps & Record<string, unknown>;
  return `${p.gender === 'M' ? 'Male' : 'Female'} (${p.count})`;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#dc2626',
  admin: '#6366f1',
  official: '#0ea5e9',
  athlete: '#10b981',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

export default function SuperAdminDashboard() {
  const { data, isLoading } = useSWR('/api/super-admin/stats', fetcher, { refreshInterval: 60000 });

  return (
    <SuperAdminGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-sm text-gray-500">System overview and analytics</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* ─── Stat Cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={data.overview.totalUsers} color="bg-indigo-50 text-indigo-600" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Athletes" value={data.overview.totalAthletes} color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={<Trophy className="w-5 h-5" />} label="Competitions" value={data.overview.totalCompetitions} color="bg-amber-50 text-amber-600" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="Active Comps" value={data.overview.activeCompetitions} color="bg-cyan-50 text-cyan-600" />
              <StatCard icon={<Monitor className="w-5 h-5" />} label="Active Sessions" value={data.overview.activeSessions} color="bg-blue-50 text-blue-600" />
              <StatCard icon={<Shield className="w-5 h-5" />} label="Audit Logs" value={data.overview.totalAuditLogs} color="bg-purple-50 text-purple-600" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Security Alerts" value={data.overview.totalSecurityAlerts} color="bg-orange-50 text-orange-600" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Unacknowledged" value={data.overview.unacknowledgedAlerts} color="bg-red-50 text-red-600" />
            </div>

            {/* ─── Row: User Growth + Role Breakdown ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">User Growth</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.userGrowth}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalUsers"
                      stroke="#6366f1"
                      fill="url(#colorTotal)"
                      name="Total Users"
                    />
                    <Bar dataKey="newUsers" fill="#a5b4fc" name="New Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Users by Role</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.roleBreakdown}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      label={renderPieLabel('role', 'count')}
                    >
                      {data.roleBreakdown.map((entry: { role: string }, index: number) => (
                        <Cell key={index} fill={ROLE_COLORS[entry.role] || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── Row: Countries + Gender + Age Category ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Top Countries
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="country" type="category" tick={{ fontSize: 12 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Gender Distribution</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.genderBreakdown}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      label={renderGenderLabel}
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Age Categories</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.ageCategoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── Row: Daily Activity + Competition Status + Security ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Audit Activity (Last 30 Days)</h2>
                {data.dailyActivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data.dailyActivity}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#colorActivity)" name="Events" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No audit activity in the last 30 days</p>
                )}
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Security Alerts by Severity</h2>
                {data.securitySeverity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.securitySeverity}
                        dataKey="count"
                        nameKey="severity"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={3}
                        label={renderPieLabel('severity', 'count')}
                      >
                        {data.securitySeverity.map((entry: { severity: string }, index: number) => (
                          <Cell key={index} fill={SEVERITY_COLORS[entry.severity] || PIE_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No security alerts recorded</p>
                )}
              </div>
            </div>

            {/* ─── Competition Status ─── */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Competition Status Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                {data.compStatusBreakdown.map((item: { status: string; count: number }) => (
                  <div key={item.status} className="text-center p-4 rounded-lg bg-gray-50">
                    <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                    <div className="text-sm text-gray-500 capitalize">{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Failed to load dashboard data</p>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const [bg, text] = color.split(' ');
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center ${text}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
