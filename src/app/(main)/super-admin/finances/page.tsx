'use client';

import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount);
}

export default function FinancialDashboard() {
  const { data, isLoading } = useSWR('/api/super-admin/finances', fetcher);

  return (
    <SuperAdminGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-sm text-gray-500">Budget tracking and financial overview</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* ─── Summary Cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinanceCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Total Revenue"
                value={formatCurrency(data.summary.totalRevenue)}
                color="bg-emerald-50 text-emerald-600"
                trend={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
              />
              <FinanceCard
                icon={<TrendingDown className="w-5 h-5" />}
                label="Total Expenses"
                value={formatCurrency(data.summary.totalExpenses)}
                color="bg-red-50 text-red-600"
                trend={<ArrowDownRight className="w-4 h-4 text-red-500" />}
              />
              <FinanceCard
                icon={<Wallet className="w-5 h-5" />}
                label="Net Income"
                value={formatCurrency(data.summary.netIncome)}
                color={data.summary.netIncome >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
                subtitle={`${data.summary.profitMargin}% margin`}
              />
              <FinanceCard
                icon={<PiggyBank className="w-5 h-5" />}
                label="Budget Utilization"
                value={`${Math.round((data.summary.totalBudgetSpent / data.summary.totalBudgetAllocated) * 100)}%`}
                color="bg-blue-50 text-blue-600"
                subtitle={`${formatCurrency(data.summary.totalBudgetSpent)} / ${formatCurrency(data.summary.totalBudgetAllocated)}`}
              />
            </div>

            {/* ─── Monthly Revenue vs Expenses ─── */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue vs Expenses</h2>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2} dot={false} name="Profit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ─── Row: Revenue Sources + Budget Breakdown ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Revenue by Source</h2>
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
                        <span className="text-sm text-gray-700">{item.source}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Quarterly Performance</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#f97316" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── Budget Categories ─── */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Budget Allocation vs Spent</h2>
              <div className="space-y-4">
                {data.budgetCategories.map((cat: { category: string; allocated: number; spent: number; color: string }) => {
                  const pct = Math.round((cat.spent / cat.allocated) * 100);
                  const isOverBudget = pct > 100;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {formatCurrency(cat.spent)} / {formatCurrency(cat.allocated)}
                          </span>
                          <span className={`text-xs font-semibold ${isOverBudget ? 'text-red-600' : pct > 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: isOverBudget ? '#ef4444' : cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Key Metrics ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">Revenue per Athlete</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(data.metrics.revenuePerAthlete)}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">Cost per Competition</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(data.metrics.costPerCompetition)}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">Total Athletes</div>
                <div className="text-xl font-bold text-gray-900">{data.metrics.totalAthletes}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">Total Competitions</div>
                <div className="text-xl font-bold text-gray-900">{data.metrics.totalCompetitions}</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Failed to load financial data</p>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function FinanceCard({
  icon,
  label,
  value,
  color,
  subtitle,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
  trend?: React.ReactNode;
}) {
  const [bg, text] = color.split(' ');
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${text}`}>
          {icon}
        </div>
        {trend}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}
