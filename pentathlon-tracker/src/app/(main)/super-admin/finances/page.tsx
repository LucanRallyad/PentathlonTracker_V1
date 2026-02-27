'use client';

import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import { TopNav } from '@/components/TopNav';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const COLORS = ['#0B6E99', '#6940A5', '#0F7B6C', '#D9730D', '#DFAB01', '#E03E3E', '#9B9A97'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount);
}

export default function FinancialDashboard() {
  const { data, isLoading } = useSWR('/api/super-admin/finances', fetcher);

  return (
    <SuperAdminGuard>
      <TopNav
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin/dashboard' },
          { label: 'Finances' },
        ]}
      />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-[4px] bg-[#0F7B6C] flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">Finances</h1>
            <p className="text-sm text-[#787774]">Budget tracking and financial overview</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinanceCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Total Revenue"
                value={formatCurrency(data.summary.totalRevenue)}
                iconBg="bg-[#DDEDEA]"
                iconColor="text-[#0F7B6C]"
                trend={<ArrowUpRight className="w-4 h-4 text-[#0F7B6C]" />}
              />
              <FinanceCard
                icon={<TrendingDown className="w-5 h-5" />}
                label="Total Expenses"
                value={formatCurrency(data.summary.totalExpenses)}
                iconBg="bg-[#FBE4E4]"
                iconColor="text-[#E03E3E]"
                trend={<ArrowDownRight className="w-4 h-4 text-[#E03E3E]" />}
              />
              <FinanceCard
                icon={<Wallet className="w-5 h-5" />}
                label="Net Income"
                value={formatCurrency(data.summary.netIncome)}
                iconBg={data.summary.netIncome >= 0 ? "bg-[#DDEDEA]" : "bg-[#FBE4E4]"}
                iconColor={data.summary.netIncome >= 0 ? "text-[#0F7B6C]" : "text-[#E03E3E]"}
                subtitle={`${data.summary.profitMargin}% margin`}
              />
              <FinanceCard
                icon={<PiggyBank className="w-5 h-5" />}
                label="Budget Utilization"
                value={`${Math.round((data.summary.totalBudgetSpent / data.summary.totalBudgetAllocated) * 100)}%`}
                iconBg="bg-[#DDEBF1]"
                iconColor="text-[#0B6E99]"
                subtitle={`${formatCurrency(data.summary.totalBudgetSpent)} / ${formatCurrency(data.summary.totalBudgetAllocated)}`}
              />
            </div>

            {/* Monthly Revenue vs Expenses */}
            <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
              <h2 className="font-semibold text-[#37352F] mb-4">Monthly Revenue vs Expenses</h2>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#787774' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#787774' }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0F7B6C" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#E03E3E" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="#0B6E99" strokeWidth={2} dot={false} name="Profit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Row: Revenue Sources + Quarterly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Revenue by Source</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.revenueBySource}
                      dataKey="amount"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      label={(props: PieLabelRenderProps) => {
                        const p = props as PieLabelRenderProps & Record<string, unknown>;
                        return `${p.source} (${p.percentage}%)`;
                      }}
                    >
                      {data.revenueBySource.map((_: unknown, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Revenue breakdown list */}
                <div className="space-y-2 mt-4">
                  {data.revenueBySource.map((item: { source: string; amount: number; percentage: number }, i: number) => (
                    <div key={item.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-[#787774]">{item.source}</span>
                      </div>
                      <span className="text-sm font-medium text-[#37352F]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
                <h2 className="font-semibold text-[#37352F] mb-4">Quarterly Performance</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#787774' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#787774' }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#0F7B6C" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#D9730D" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budget Categories */}
            <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-6">
              <h2 className="font-semibold text-[#37352F] mb-4">Budget Allocation vs Spent</h2>
              <div className="space-y-4">
                {data.budgetCategories.map((cat: { category: string; allocated: number; spent: number; color: string }) => {
                  const pct = Math.round((cat.spent / cat.allocated) * 100);
                  const isOverBudget = pct > 100;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#37352F]">{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#9B9A97]">
                            {formatCurrency(cat.spent)} / {formatCurrency(cat.allocated)}
                          </span>
                          <span className={`text-xs font-semibold ${isOverBudget ? 'text-[#E03E3E]' : pct > 85 ? 'text-[#D9730D]' : 'text-[#0F7B6C]'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#F7F6F3] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: isOverBudget ? '#E03E3E' : pct > 85 ? '#D9730D' : '#0F7B6C',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
                <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1">Revenue per Athlete</div>
                <div className="text-xl font-bold text-[#37352F]">{formatCurrency(data.metrics.revenuePerAthlete)}</div>
              </div>
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
                <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1">Cost per Competition</div>
                <div className="text-xl font-bold text-[#37352F]">{formatCurrency(data.metrics.costPerCompetition)}</div>
              </div>
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
                <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1">Total Athletes</div>
                <div className="text-xl font-bold text-[#37352F]">{data.metrics.totalAthletes}</div>
              </div>
              <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4 text-center">
                <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mb-1">Total Competitions</div>
                <div className="text-xl font-bold text-[#37352F]">{data.metrics.totalCompetitions}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[#9B9A97]">Failed to load financial data</p>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function FinanceCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  subtitle,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[4px] border border-[#E9E9E7] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-[4px] ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {trend}
      </div>
      <div className="text-xl font-bold text-[#37352F]">{value}</div>
      <div className="text-xs text-[#9B9A97]">{label}</div>
      {subtitle && <div className="text-xs text-[#9B9A97] mt-0.5">{subtitle}</div>}
    </div>
  );
}
