import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (isErrorResponse(admin)) return admin;

  // Get counts
  const [
    totalUsers,
    totalAthletes,
    totalCompetitions,
    activeCompetitions,
    totalEvents,
    totalAuditLogs,
    totalSecurityAlerts,
    unacknowledgedAlerts,
    activeSessions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.athlete.count(),
    prisma.competition.count(),
    prisma.competition.count({ where: { status: "active" } }),
    prisma.event.count(),
    prisma.auditLog.count(),
    prisma.securityAlert.count(),
    prisma.securityAlert.count({ where: { acknowledged: false } }),
    prisma.sessionInfo.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  // User role breakdown
  const users = await prisma.user.findMany({ select: { role: true, createdAt: true } });
  const roleBreakdown: Record<string, number> = {};
  for (const u of users) {
    roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
  }

  // Competition status breakdown
  const competitions = await prisma.competition.findMany({
    select: { status: true },
  });
  const compStatusBreakdown: Record<string, number> = {};
  for (const c of competitions) {
    compStatusBreakdown[c.status] = (compStatusBreakdown[c.status] || 0) + 1;
  }

  // Athlete country breakdown (top 10)
  const athletes = await prisma.athlete.findMany({
    select: { country: true, gender: true, ageCategory: true },
  });
  const countryMap: Record<string, number> = {};
  const genderMap: Record<string, number> = {};
  const ageCatMap: Record<string, number> = {};
  for (const a of athletes) {
    countryMap[a.country] = (countryMap[a.country] || 0) + 1;
    genderMap[a.gender] = (genderMap[a.gender] || 0) + 1;
    ageCatMap[a.ageCategory] = (ageCatMap[a.ageCategory] || 0) + 1;
  }
  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  const genderBreakdown = Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));
  const ageCategoryBreakdown = Object.entries(ageCatMap).map(([category, count]) => ({ category, count }));

  // User growth over time (group by month)
  const userGrowth = getGrowthData(users.map(u => u.createdAt));

  // Recent audit activity (last 30 days by day)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentLogs = await prisma.auditLog.findMany({
    where: { timestamp: { gte: thirtyDaysAgo } },
    select: { timestamp: true, severity: true },
    orderBy: { timestamp: "asc" },
  });

  const activityByDay: Record<string, number> = {};
  for (const log of recentLogs) {
    const day = log.timestamp.toISOString().split("T")[0];
    activityByDay[day] = (activityByDay[day] || 0) + 1;
  }
  const dailyActivity = Object.entries(activityByDay).map(([date, count]) => ({ date, count }));

  // Security severity breakdown
  const alerts = await prisma.securityAlert.findMany({
    select: { severity: true, alertType: true },
  });
  const severityMap: Record<string, number> = {};
  const alertTypeMap: Record<string, number> = {};
  for (const a of alerts) {
    severityMap[a.severity] = (severityMap[a.severity] || 0) + 1;
    alertTypeMap[a.alertType] = (alertTypeMap[a.alertType] || 0) + 1;
  }

  return NextResponse.json({
    overview: {
      totalUsers,
      totalAthletes,
      totalCompetitions,
      activeCompetitions,
      totalEvents,
      totalAuditLogs,
      totalSecurityAlerts,
      unacknowledgedAlerts,
      activeSessions,
    },
    roleBreakdown: Object.entries(roleBreakdown).map(([role, count]) => ({ role, count })),
    compStatusBreakdown: Object.entries(compStatusBreakdown).map(([status, count]) => ({ status, count })),
    topCountries,
    genderBreakdown,
    ageCategoryBreakdown,
    userGrowth,
    dailyActivity,
    securitySeverity: Object.entries(severityMap).map(([severity, count]) => ({ severity, count })),
    alertTypes: Object.entries(alertTypeMap).map(([type, count]) => ({ type, count })),
  });
}

function getGrowthData(dates: Date[]) {
  const monthMap: Record<string, number> = {};

  // Ensure we have data for at least the last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = 0;
  }

  for (const date of dates) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  }

  // Convert to cumulative growth
  const entries = Object.entries(monthMap).sort();
  let cumulative = 0;
  return entries.map(([month, count]) => {
    cumulative += count;
    return { month, newUsers: count, totalUsers: cumulative };
  });
}
