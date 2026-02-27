/**
 * Fencing Direct Elimination Bracket Engine
 *
 * Implements the standard FIE/UIPM bracket generation algorithm:
 * - Tableau size = next power of 2 >= number of competitors
 * - Recursive binary-split seed placement (1 vs N, 2 vs N-1, etc.)
 * - Top seeds receive byes when competitors < tableau size
 * - Winner inherits higher seed's bracket position
 * - Final placements determined by elimination round + original seed
 *
 * UIPM rules override FIE where different:
 * - Seeding comes from ranking round results
 * - Points awarded by final placement (1st=250 ... 18th=196)
 * - Eliminated in initial bout = 0 MP points
 */

import type {
  DEBracketSeed,
  DEMatch,
  DEBracket,
  DEMatchResult,
} from "./types";

// ─── Tableau Size ───────────────────────────────────────────────────────────

/**
 * Returns the next power of 2 that is >= numCompetitors.
 * e.g., 18 → 32, 16 → 16, 9 → 16, 5 → 8, 3 → 4, 2 → 2
 */
export function getTableauSize(numCompetitors: number): number {
  if (numCompetitors <= 1) return 2;
  let size = 2;
  while (size < numCompetitors) {
    size *= 2;
  }
  return size;
}

// ─── Seed Position Generation ───────────────────────────────────────────────

/**
 * Generates the standard bracket seed positions using recursive binary split.
 *
 * For a tableau of 8, returns: [1, 8, 5, 4, 3, 6, 7, 2]
 * This means the matches are:
 *   Match 1: Seed 1 vs Seed 8
 *   Match 2: Seed 5 vs Seed 4
 *   Match 3: Seed 3 vs Seed 6
 *   Match 4: Seed 7 vs Seed 2
 *
 * This ensures:
 *   - Seed 1 and Seed 2 are on opposite halves (can only meet in final)
 *   - Seeds 3-4 are in opposite quarters from 1-2 (can only meet in semis)
 *   - Seeds 5-8 fill remaining eighths, etc.
 */
export function generateSeedPositions(tableauSize: number): number[] {
  if (tableauSize === 2) return [1, 2];

  const halfPositions = generateSeedPositions(tableauSize / 2);
  const result: number[] = [];

  for (const seed of halfPositions) {
    result.push(seed);
    result.push(tableauSize + 1 - seed);
  }

  return result;
}

// ─── Match ID Generation ────────────────────────────────────────────────────

function makeMatchId(roundNumber: number, matchPosition: number): string {
  return `R${roundNumber}-M${matchPosition}`;
}

// ─── Bracket Generation ─────────────────────────────────────────────────────

/**
 * Generates a complete DE bracket structure from a list of seeded athletes.
 *
 * Seeds should be sorted by ranking round results (best first).
 * Byes are automatically assigned and advanced.
 */
export function generateDEBracket(
  eventId: string,
  seeds: DEBracketSeed[]
): DEBracket {
  const numCompetitors = seeds.length;
  const tableauSize = getTableauSize(numCompetitors);
  const totalRounds = Math.log2(tableauSize);
  const seedPositions = generateSeedPositions(tableauSize);

  // Build seed lookup: seed number → athlete info
  const seedMap = new Map<number, DEBracketSeed>();
  for (const entry of seeds) {
    seedMap.set(entry.seed, entry);
  }

  // Create all rounds
  const rounds: DEMatch[][] = [];

  // ── Round 1: Create matches from seed positions ──────────────────────────
  const round1Matches: DEMatch[] = [];
  const firstRoundMatchCount = tableauSize / 2;

  for (let i = 0; i < firstRoundMatchCount; i++) {
    const seed1 = seedPositions[i * 2];
    const seed2 = seedPositions[i * 2 + 1];

    const athlete1 = seedMap.get(seed1) || null;
    const athlete2 = seedMap.get(seed2) || null;

    // A bye occurs when one seed > numCompetitors (no athlete for that seed)
    const isBye = !athlete1 || !athlete2;

    const match: DEMatch = {
      matchId: makeMatchId(1, i),
      roundNumber: 1,
      matchPosition: i,
      bracketPosition: i,
      athlete1Id: athlete1?.athleteId || null,
      athlete2Id: athlete2?.athleteId || null,
      athlete1Seed: athlete1 ? seed1 : null,
      athlete2Seed: athlete2 ? seed2 : null,
      athlete1Name: athlete1?.athleteName || null,
      athlete2Name: athlete2?.athleteName || null,
      winnerId: null,
      winnerSeed: null,
      score1: null,
      score2: null,
      isBye,
      feederMatch1Id: null,
      feederMatch2Id: null,
    };

    // Auto-advance byes
    if (isBye) {
      if (athlete1 && !athlete2) {
        match.winnerId = athlete1.athleteId;
        match.winnerSeed = seed1;
        match.score1 = 0;
        match.score2 = 0;
      } else if (athlete2 && !athlete1) {
        match.winnerId = athlete2.athleteId;
        match.winnerSeed = seed2;
        match.score1 = 0;
        match.score2 = 0;
      }
    }

    round1Matches.push(match);
  }

  rounds.push(round1Matches);

  // ── Subsequent rounds: create empty matches with feeder links ────────────
  for (let round = 2; round <= totalRounds; round++) {
    const prevRound = rounds[round - 2];
    const matchCount = prevRound.length / 2;
    const roundMatches: DEMatch[] = [];

    for (let i = 0; i < matchCount; i++) {
      const feeder1 = prevRound[i * 2];
      const feeder2 = prevRound[i * 2 + 1];

      const match: DEMatch = {
        matchId: makeMatchId(round, i),
        roundNumber: round,
        matchPosition: i,
        bracketPosition: i,
        athlete1Id: feeder1.winnerId, // populated if feeder was a bye
        athlete2Id: feeder2.winnerId,
        athlete1Seed: feeder1.winnerSeed,
        athlete2Seed: feeder2.winnerSeed,
        athlete1Name: feeder1.winnerId
          ? (feeder1.winnerId === feeder1.athlete1Id ? feeder1.athlete1Name : feeder1.athlete2Name)
          : null,
        athlete2Name: feeder2.winnerId
          ? (feeder2.winnerId === feeder2.athlete1Id ? feeder2.athlete1Name : feeder2.athlete2Name)
          : null,
        winnerId: null,
        winnerSeed: null,
        score1: null,
        score2: null,
        isBye: false,
        feederMatch1Id: feeder1.matchId,
        feederMatch2Id: feeder2.matchId,
      };

      // If both feeders are byes with the same winner, that shouldn't happen,
      // but if one feeder's winner is the only competitor, that's a second-round bye
      // (can happen in very small brackets)
      if (match.athlete1Id && !match.athlete2Id && matchCount === 1) {
        // Only auto-advance if we're sure there's no opponent coming
        // Check if the feeder2 has no athletes at all
        if (!feeder2.athlete1Id && !feeder2.athlete2Id) {
          match.winnerId = match.athlete1Id;
          match.winnerSeed = match.athlete1Seed;
          match.isBye = true;
        }
      } else if (!match.athlete1Id && match.athlete2Id && matchCount === 1) {
        if (!feeder1.athlete1Id && !feeder1.athlete2Id) {
          match.winnerId = match.athlete2Id;
          match.winnerSeed = match.athlete2Seed;
          match.isBye = true;
        }
      }

      roundMatches.push(match);
    }

    rounds.push(roundMatches);
  }

  // ── Propagate bye winners forward through subsequent rounds ──────────────
  // After initial bracket creation, propagate any winners from bye matches
  // into subsequent rounds
  propagateWinners(rounds);

  return {
    eventId,
    tableauSize,
    numCompetitors,
    rounds,
    placements: null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Propagate winners forward through the bracket.
 * Called after initial generation and after recording match results.
 */
function propagateWinners(rounds: DEMatch[][]): void {
  for (let r = 1; r < rounds.length; r++) {
    const prevRound = rounds[r - 1];
    const currentRound = rounds[r];

    for (let i = 0; i < currentRound.length; i++) {
      const match = currentRound[i];
      const feeder1 = prevRound[i * 2];
      const feeder2 = prevRound[i * 2 + 1];

      // Update athlete slots from feeder winners
      if (feeder1?.winnerId) {
        match.athlete1Id = feeder1.winnerId;
        match.athlete1Seed = feeder1.winnerSeed;
        match.athlete1Name = feeder1.winnerId === feeder1.athlete1Id
          ? feeder1.athlete1Name
          : feeder1.athlete2Name;
      }
      if (feeder2?.winnerId) {
        match.athlete2Id = feeder2.winnerId;
        match.athlete2Seed = feeder2.winnerSeed;
        match.athlete2Name = feeder2.winnerId === feeder2.athlete1Id
          ? feeder2.athlete1Name
          : feeder2.athlete2Name;
      }
    }
  }
}

// ─── Advance Winner ─────────────────────────────────────────────────────────

/**
 * Records a match result and advances the winner into the next round.
 *
 * If the match already had a result and it's being changed, downstream
 * matches are cleared and re-propagated.
 *
 * Returns a new bracket object (immutable update).
 */
export function advanceWinner(
  bracket: DEBracket,
  result: DEMatchResult
): DEBracket {
  // Deep clone the bracket
  const newBracket: DEBracket = JSON.parse(JSON.stringify(bracket));

  // Find the match
  let targetMatch: DEMatch | null = null;
  let targetRoundIdx = -1;

  for (let r = 0; r < newBracket.rounds.length; r++) {
    for (const match of newBracket.rounds[r]) {
      if (match.matchId === result.matchId) {
        targetMatch = match;
        targetRoundIdx = r;
        break;
      }
    }
    if (targetMatch) break;
  }

  if (!targetMatch) {
    throw new Error(`Match not found: ${result.matchId}`);
  }

  // Check if the result is changing (need to clear downstream)
  const resultChanged = targetMatch.winnerId !== null && targetMatch.winnerId !== result.winnerId;

  // Record the result
  targetMatch.winnerId = result.winnerId;
  targetMatch.score1 = result.score1;
  targetMatch.score2 = result.score2;

  // Determine winner's seed (winner inherits the higher/lower seed based on who they are)
  if (result.winnerId === targetMatch.athlete1Id) {
    targetMatch.winnerSeed = targetMatch.athlete1Seed;
  } else {
    targetMatch.winnerSeed = targetMatch.athlete2Seed;
  }

  // If result changed, clear all downstream matches that were affected
  if (resultChanged) {
    clearDownstream(newBracket.rounds, targetRoundIdx, targetMatch.matchPosition);
  }

  // Re-propagate all winners through the bracket
  propagateWinners(newBracket.rounds);

  // Recalculate placements if bracket is complete
  if (isBracketComplete(newBracket)) {
    newBracket.placements = calculateFinalPlacements(newBracket);
  } else {
    newBracket.placements = null;
  }

  return newBracket;
}

/**
 * Clear downstream matches when a result changes.
 */
function clearDownstream(rounds: DEMatch[][], fromRoundIdx: number, matchPosition: number): void {
  // The match at position `matchPosition` in round `fromRoundIdx`
  // feeds into position `Math.floor(matchPosition / 2)` in round `fromRoundIdx + 1`
  if (fromRoundIdx + 1 >= rounds.length) return;

  const nextMatchPosition = Math.floor(matchPosition / 2);
  const nextRound = rounds[fromRoundIdx + 1];
  const nextMatch = nextRound[nextMatchPosition];

  if (!nextMatch) return;

  // Determine which slot this feeds (even matchPosition → athlete1, odd → athlete2)
  const isTopSlot = matchPosition % 2 === 0;

  if (isTopSlot) {
    nextMatch.athlete1Id = null;
    nextMatch.athlete1Seed = null;
    nextMatch.athlete1Name = null;
  } else {
    nextMatch.athlete2Id = null;
    nextMatch.athlete2Seed = null;
    nextMatch.athlete2Name = null;
  }

  // Clear this match's result if it had one
  if (nextMatch.winnerId) {
    nextMatch.winnerId = null;
    nextMatch.winnerSeed = null;
    nextMatch.score1 = null;
    nextMatch.score2 = null;

    // Recursively clear further downstream
    clearDownstream(rounds, fromRoundIdx + 1, nextMatchPosition);
  }
}

// ─── Bracket Completion Check ───────────────────────────────────────────────

/**
 * Check if all matches in the bracket have been decided.
 */
export function isBracketComplete(bracket: DEBracket): boolean {
  for (const round of bracket.rounds) {
    for (const match of round) {
      // Skip matches with no athletes (empty slots in tiny brackets)
      if (!match.athlete1Id && !match.athlete2Id) continue;
      // A match needs a winner if it has two athletes
      if (match.athlete1Id && match.athlete2Id && !match.winnerId) return false;
      // A match with only one athlete should already be auto-advanced
      if ((match.athlete1Id || match.athlete2Id) && !match.winnerId) {
        // Check if it's waiting for a feeder match
        if (match.feederMatch1Id || match.feederMatch2Id) {
          // It's a later-round match still waiting for feeders — bracket not complete
          return false;
        }
      }
    }
  }

  // The final round must have a winner
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  if (finalRound.length !== 1 || !finalRound[0].winnerId) return false;

  return true;
}

// ─── Final Placement Calculation ────────────────────────────────────────────

/**
 * Calculate final placements from a completed bracket.
 *
 * Placement rules (UIPM):
 * - Winner of final = 1st
 * - Loser of final = 2nd
 * - Losers of semifinals = 3rd-4th (higher seed gets 3rd)
 * - Losers of quarterfinals = 5th-8th (higher seed gets lower number)
 * - Losers of round of 16 = 9th-16th
 * - And so on...
 * - Within a group, athletes are ranked by their original seed (better seed = higher placement)
 *
 * Returns a map of athleteId → placement number.
 */
export function calculateFinalPlacements(
  bracket: DEBracket
): Record<string, number> {
  const placements: Record<string, number> = {};
  const totalRounds = bracket.rounds.length;

  // Final round winner and loser
  const finalMatch = bracket.rounds[totalRounds - 1][0];
  if (finalMatch.winnerId) {
    placements[finalMatch.winnerId] = 1;

    // Loser of final
    const loserId = finalMatch.athlete1Id === finalMatch.winnerId
      ? finalMatch.athlete2Id
      : finalMatch.athlete1Id;
    if (loserId) {
      placements[loserId] = 2;
    }
  }

  // For each round (working backwards from semifinal), collect losers
  // and assign placements based on the round they were eliminated in
  for (let r = totalRounds - 2; r >= 0; r--) {
    const round = bracket.rounds[r];
    const losers: { athleteId: string; seed: number }[] = [];

    for (const match of round) {
      if (match.winnerId && (match.athlete1Id || match.athlete2Id)) {
        const loserId = match.athlete1Id === match.winnerId
          ? match.athlete2Id
          : match.athlete1Id;

        if (loserId && !match.isBye) {
          const loserSeed = loserId === match.athlete1Id
            ? match.athlete1Seed
            : match.athlete2Seed;
          losers.push({ athleteId: loserId, seed: loserSeed ?? 999 });
        }
      }
    }

    // Sort losers by seed (better seed = higher placement within the group)
    losers.sort((a, b) => a.seed - b.seed);

    // Placement range for this round's losers:
    // Losers of round R (0-indexed from first round) end up in positions:
    //   Final (r = totalRounds-1): already handled above
    //   Semifinal (r = totalRounds-2): 3rd-4th
    //   Quarterfinal (r = totalRounds-3): 5th-8th
    //   Round of 16 (r = totalRounds-4): 9th-16th
    // General formula: placement starts at (matchCountInNextRound + 1)
    //   where matchCountInNextRound = 2^(totalRounds - r - 1)
    const startPlacement = Math.pow(2, totalRounds - r - 1) + 1;

    for (let i = 0; i < losers.length; i++) {
      placements[losers[i].athleteId] = startPlacement + i;
    }
  }

  return placements;
}

// ─── Round Name Helper ──────────────────────────────────────────────────────

/**
 * Get a human-readable name for a round number.
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber;

  switch (roundsFromEnd) {
    case 0: return "Final";
    case 1: return "Semifinal";
    case 2: return "Quarterfinal";
    default: {
      const size = Math.pow(2, roundsFromEnd + 1);
      return `Round of ${size}`;
    }
  }
}

// ─── Serialization ──────────────────────────────────────────────────────────

/**
 * Serialize a bracket to JSON string for storage in Event.config.
 */
export function serializeBracket(bracket: DEBracket): string {
  return JSON.stringify(bracket);
}

/**
 * Deserialize a bracket from a JSON string.
 */
export function deserializeBracket(json: string): DEBracket {
  return JSON.parse(json) as DEBracket;
}

// ─── Utility: Get all athletes in the bracket ───────────────────────────────

/**
 * Extract all unique athlete IDs from the bracket.
 */
export function getAllBracketAthletes(bracket: DEBracket): string[] {
  const athletes = new Set<string>();

  for (const round of bracket.rounds) {
    for (const match of round) {
      if (match.athlete1Id) athletes.add(match.athlete1Id);
      if (match.athlete2Id) athletes.add(match.athlete2Id);
    }
  }

  return Array.from(athletes);
}

/**
 * Get stats about the bracket.
 */
export function getBracketStats(bracket: DEBracket): {
  totalMatches: number;
  completedMatches: number;
  byeCount: number;
  currentRound: number;
  isComplete: boolean;
} {
  let totalMatches = 0;
  let completedMatches = 0;
  let byeCount = 0;
  let currentRound = 1;

  for (const round of bracket.rounds) {
    for (const match of round) {
      // Don't count empty matches (no athletes at all)
      if (!match.athlete1Id && !match.athlete2Id) continue;

      if (match.isBye) {
        byeCount++;
        completedMatches++;
        totalMatches++;
      } else if (match.athlete1Id && match.athlete2Id) {
        totalMatches++;
        if (match.winnerId) {
          completedMatches++;
        } else {
          currentRound = Math.max(currentRound, match.roundNumber);
        }
      }
    }
  }

  // Find the lowest round that still has unfinished matches
  for (let r = 0; r < bracket.rounds.length; r++) {
    for (const match of bracket.rounds[r]) {
      if (match.athlete1Id && match.athlete2Id && !match.winnerId && !match.isBye) {
        currentRound = r + 1;
        break;
      }
    }
    // If we found an incomplete match in this round, that's the current round
    const hasIncomplete = bracket.rounds[r].some(
      (m) => m.athlete1Id && m.athlete2Id && !m.winnerId && !m.isBye
    );
    if (hasIncomplete) {
      currentRound = r + 1;
      break;
    }
  }

  return {
    totalMatches,
    completedMatches,
    byeCount,
    currentRound,
    isComplete: isBracketComplete(bracket),
  };
}
