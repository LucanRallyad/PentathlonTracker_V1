'use client';

import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import { TopNav } from '@/components/TopNav';
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
  super_admin: '#E03E3E',
  admin: '#0B6E99',
  official: '#D9730D',
  athlete: '#0F7B6C',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#0F7B6C',
  MEDIUM: '#DFAB01',
  HIGH: '#D9730D',
  CRITICAL: '#E03E3E',
};

const PIE_COLORS = ['#0B6E99', '#6940A5', '#0F7B6C', '#D9730D', '#DFAB01', '#E03E3E', '#9B9A97'];

export default function SuperAdminDashboard() {
  const { data, isLoading } = useSWR('/api/super-admin/stats', fetcher, { refreshInterval: 60000 });

  return (
    <SuperAdminGuard>
      <TopNav
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin/dashboard' },
          { label: 'Dashboard' },
        ]}
      />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-[4px] bg-[#0B6E99] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">Dashboard</h1>
            <p className="text-sm text-[#787774]">System overview and analytics</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={data.overview.totalUsers} iconBg="bg-[#DDEBF1]" iconColor="text-[#0B6E99]" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Athletes" value={data.overview.totalAthletes} iconBg="bg-[#DDEDEA]" iconColor="text-[#0F7B6C]" />
              <StatCard icon={<Trophy className="w-5 h-5" />} label="Competitions" value={data.overview.totalCompetitions} iconBg="bg-[#FBF3DB]" iconColor="text-[#DFAB01]" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="Active Comps" value={data.overview.activeCompetitions} iconBg="bg-[#FAEBDD]" iconColor="text-[#D9730D]" />
              <StatCard icon={<Monitor className="w-5 h-5" />} label="Active Sessions" value={data.overview.activeSessions} iconBg="bg-[#DDEBF1]" iconColor="text-[#0B6E99]" />
              <StatCard icon={<Shield className="w-5 h-5" />} label="Audit Logs" value={data.overview.totalAuditLogs} iconBg="bg-[#EDE4F0]" iconColor="text-[#6940A5]" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Security Alerts" value={data.overview.totalSecurityAlerts} iconBg="bg-[#FAEBDD]" iconColor="text-[#D9730D]" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Unacknowledged" value={data.overview.unacknowledgedAlerts} iconBg="bg-[#FBE4E4]" iconColor="text-[#E03E3E]" />
            </div>

            {/* Row: User Growth + Role Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">User Growth</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.userGrowth}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B6E99" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0B6E99" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#787774' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#787774' }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalUsers"
                      stroke="#0B6E99"
                      fill="url(#colorTotal)"
                      name="Total Users"
                    />
                    <Bar dataKey="newUsers" fill="#DDEBF1" name="New Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Users by Role</h2>
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

            {/* Row: Countries + Gender + Age Category */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#787774]" /> Top Countries
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#787774' }} />
                    <YAxis dataKey="country" type="category" tick={{ fontSize: 12, fill: '#787774' }} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0B6E99" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Gender Distribution</h2>
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
                      <Cell fill="#0B6E99" />
                      <Cell fill="#D9730D" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Age Categories</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.ageCategoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#787774' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#787774' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0F7B6C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row: Daily Activity + Security */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Audit Activity (Last 30 Days)</h2>
                {data.dailyActivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data.dailyActivity}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F7B6C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0F7B6C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#787774' }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12, fill: '#787774' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#0F7B6C" fill="url(#colorActivity)" name="Events" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[#9B9A97] text-center py-8">No audit activity in the last 30 days</p>
                )}
              </div>

              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Security Alerts by Severity</h2>
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
                  <p className="text-sm text-[#9B9A97] text-center py-8">No security alerts recorded</p>
                )}
              </div>
            </div>

            {/* Competition Status */}
            <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
              <h2 className="font-semibold text-[#37352F] mb-4">Competition Status Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                {data.compStatusBreakdown.map((item: { status: string; count: number }) => (
                  <div key={item.status} className="text-center p-4 rounded-[4px] bg-[#F7F6F3]">
                    <div className="text-2xl font-bold text-[#37352F]">{item.count}</div>
                    <div className="text-sm text-[#787774] capitalize">{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[#9B9A97]">Failed to load dashboard data</p>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function StatCard({ icon, label, value, iconBg, iconColor }: { icon: React.ReactNode; label: string; value: number; iconBg: string; iconColor: string }) {
  return (
    <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-[4px] ${iconBg} flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#37352F]">{value.toLocaleString()}</div>
        <div className="text-xs text-[#9B9A97]">{label}</div>
      </div>
    </div>
  );
}
