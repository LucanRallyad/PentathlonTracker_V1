/**
 * Team classification calculator.
 * team_score = sum of top 3 athletes' total_scores from same nation.
 * Minimum 3 athletes required. If 4 athletes, only best 3 count.
 */

export interface TeamInput {
  athleteId: string;
  athleteName: string;
  country: string;
  totalPoints: number;
}

export interface TeamResult {
  country: string;
  athletes: { athleteId: string; athleteName: string; totalPoints: number }[];
  teamTotal: number;
  rank: number;
}

export function calculateTeamStandings(athletes: TeamInput[]): TeamResult[] {
  // Group by country
  const byCountry = new Map<string, TeamInput[]>();
  for (const athlete of athletes) {
    const existing = byCountry.get(athlete.country) || [];
    existing.push(athlete);
    byCountry.set(athlete.country, existing);
  }

  const teams: TeamResult[] = [];

  for (const [country, countryAthletes] of byCountry.entries()) {
    // Need at least 3 athletes
    if (countryAthletes.length < 3) continue;

    // Sort by total points descending, take top 3
    const sorted = [...countryAthletes].sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
    const top3 = sorted.slice(0, 3);

    teams.push({
      country,
      athletes: top3.map((a) => ({
        athleteId: a.athleteId,
        athleteName: a.athleteName,
        totalPoints: a.totalPoints,
      })),
      teamTotal: top3.reduce((sum, a) => sum + a.totalPoints, 0),
      rank: 0,
    });
  }

  // Sort teams by total descending and assign ranks
  teams.sort((a, b) => b.teamTotal - a.teamTotal);
  teams.forEach((team, i) => {
    team.rank = i + 1;
  });

  return teams;
}
