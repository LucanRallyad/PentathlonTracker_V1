import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColumnMapping {
  firstName?: number;
  lastName?: number;
  fullName?: number;
  country?: number;
  gender?: number;
  ageCategory?: number;
  club?: number;
  fencingVictories?: number;
  fencingBouts?: number;
  fencingRankingPoints?: number;
  fencingDEPlacement?: number;
  fencingDEPoints?: number;
  obstacleTime?: number;
  obstaclePoints?: number;
  swimmingTime?: number;
  swimmingPoints?: number;
  laserRunTime?: number;
  laserRunPoints?: number;
  ridingKnockdowns?: number;
  ridingDisobediences?: number;
  ridingTimeOver?: number;
  ridingPoints?: number;
  totalPoints?: number;
  rank?: number;
}

interface ParsedAthlete {
  rowIndex: number;
  firstName: string;
  lastName: string;
  country: string;
  gender: string;
  ageCategory: string;
  club: string;
  scores: {
    fencingRanking?: { victories?: number; totalBouts?: number; points?: number };
    fencingDE?: { placement?: number; points?: number };
    obstacle?: { timeSeconds?: number; points?: number };
    swimming?: { timeRaw?: string; timeHundredths?: number; points?: number };
    laserRun?: { timeRaw?: string; finishTimeSeconds?: number; points?: number };
    riding?: { knockdowns?: number; disobediences?: number; timeOverSeconds?: number; points?: number };
  };
  totalPoints: number;
  existingAthleteId?: string;
  existingAthleteName?: string;
  warnings: string[];
}

interface ParseResult {
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
  athletes: ParsedAthlete[];
  detectedColumns: Record<string, string>;
  warnings: string[];
  sheetName: string;
  totalRows: number;
}

// ─── Smart Column Detection ─────────────────────────────────────────────────
// NOTE: This uses pattern matching on headers. AI-based parsing (e.g., Claude API)
// could be added later if needed for unstructured or non-standard Excel files.

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  firstName: [/^first\s*name$/i, /^given\s*name$/i, /^pr[eé]nom$/i, /^first$/i],
  lastName: [/^last\s*name$/i, /^sur\s*name$/i, /^family\s*name$/i, /^nom$/i, /^last$/i],
  fullName: [/^name$/i, /^athlete$/i, /^athlete\s*name$/i, /^competitor$/i, /^full\s*name$/i],
  country: [/^country$/i, /^nation$/i, /^nat$/i, /^nationality$/i, /^pays$/i, /^ctry$/i],
  gender: [/^gender$/i, /^sex$/i, /^m\/f$/i, /^gen$/i],
  ageCategory: [/^age\s*cat/i, /^category$/i, /^cat$/i, /^age\s*group$/i, /^class$/i],
  club: [/^club$/i, /^team$/i, /^organization$/i, /^org$/i],
  fencingVictories: [/^fencing\s*vict/i, /^fenc.*win/i, /^victories$/i, /^wins$/i, /^v$/i],
  fencingBouts: [/^fencing\s*bouts$/i, /^bouts$/i, /^total\s*bouts$/i],
  fencingRankingPoints: [/^fencing\s*rank.*point/i, /^fr\s*pts$/i, /^fencing\s*ranking$/i, /^fencing\s*pts$/i, /^fencing$/i],
  fencingDEPlacement: [/^fencing\s*de\s*place/i, /^de\s*place/i, /^bonus\s*round\s*place/i],
  fencingDEPoints: [/^fencing\s*de\s*point/i, /^de\s*pts$/i, /^fencing\s*de$/i, /^bonus\s*round$/i],
  obstacleTime: [/^obstacle\s*time/i, /^ob.*time/i, /^obstacle$/i],
  obstaclePoints: [/^obstacle\s*p/i, /^ob.*pts$/i, /^obstacle\s*score$/i],
  swimmingTime: [/^swim\s*time/i, /^swimming\s*time/i, /^swim$/i, /^swimming$/i],
  swimmingPoints: [/^swim.*point/i, /^swim.*pts$/i, /^swim.*score$/i],
  laserRunTime: [/^laser\s*run\s*time/i, /^lr\s*time/i, /^laser.*run$/i, /^lr$/i],
  laserRunPoints: [/^laser\s*run\s*point/i, /^lr\s*pts$/i, /^laser.*run.*pts/i, /^laser.*run.*score/i],
  ridingKnockdowns: [/^riding\s*knock/i, /^knock/i, /^kd$/i],
  ridingDisobediences: [/^riding\s*disob/i, /^disob/i, /^refusal/i],
  ridingTimeOver: [/^riding\s*time\s*over/i, /^time\s*over$/i],
  ridingPoints: [/^riding\s*p/i, /^riding\s*score$/i, /^riding$/i],
  totalPoints: [/^total\s*point/i, /^total\s*score/i, /^total$/i, /^score$/i, /^points$/i, /^mp\s*total/i],
  rank: [/^rank$/i, /^place$/i, /^position$/i, /^pos$/i, /^#$/i, /^no\.?$/i, /^overall\s*rank/i],
};

function detectColumns(headers: string[]): { mapping: ColumnMapping; detected: Record<string, string> } {
  const mapping: ColumnMapping = {};
  const detected: Record<string, string> = {};

  for (let col = 0; col < headers.length; col++) {
    const header = (headers[col] || "").toString().trim();
    if (!header) continue;

    for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (mapping[key as keyof ColumnMapping] !== undefined) continue;
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          (mapping as Record<string, number>)[key] = col;
          detected[key] = header;
          break;
        }
      }
    }
  }

  return { mapping, detected };
}

// ─── Time Parsing ───────────────────────────────────────────────────────────

function parseTimeToSeconds(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;

  // If it's already a number (Excel might give us fractional days or seconds)
  if (typeof raw === "number") {
    // If < 1, likely a fractional day from Excel time format
    if (raw < 1 && raw > 0) {
      return raw * 86400; // Convert fractional day to seconds
    }
    // If it looks like a reasonable time in seconds (< 3600 = 1 hour)
    if (raw > 0 && raw < 3600) {
      return raw;
    }
    return raw;
  }

  const str = String(raw).trim();
  if (!str) return undefined;

  // Format: H:MM:SS or H:MM:SS.ss
  const hms = str.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const s = parseInt(hms[3], 10);
    const frac = hms[4] ? parseInt(hms[4].padEnd(2, "0"), 10) / 100 : 0;
    return h * 3600 + m * 60 + s + frac;
  }

  // Format: M:SS.ss or M:SS
  const msec = str.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (msec) {
    const m = parseInt(msec[1], 10);
    const s = parseInt(msec[2], 10);
    const frac = msec[3] ? parseInt(msec[3].padEnd(2, "0"), 10) / 100 : 0;
    return m * 60 + s + frac;
  }

  // Format: SS.ss or SS
  const secMatch = str.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (secMatch) {
    const s = parseInt(secMatch[1], 10);
    const frac = secMatch[2] ? parseInt(secMatch[2].padEnd(2, "0"), 10) / 100 : 0;
    return s + frac;
  }

  return undefined;
}

function parseTimeToHundredths(raw: unknown): number | undefined {
  const seconds = parseTimeToSeconds(raw);
  if (seconds === undefined) return undefined;
  return Math.round(seconds * 100);
}

function parseNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  if (typeof raw === "number") return raw;
  const n = parseFloat(String(raw).trim());
  return isNaN(n) ? undefined : n;
}

function parseInteger(raw: unknown): number | undefined {
  const n = parseNumber(raw);
  return n !== undefined ? Math.round(n) : undefined;
}

// ─── Parse Excel ────────────────────────────────────────────────────────────

async function parseExcelFile(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (data.length < 2) {
    throw new Error("Excel file must have at least a header row and one data row");
  }

  // Find header row (first row with at least 3 non-empty cells)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const nonEmpty = (data[i] || []).filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (nonEmpty >= 3) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (data[headerRowIndex] || []).map((h) => String(h || "").trim());
  const { mapping, detected } = detectColumns(headers);

  const warnings: string[] = [];

  // Check for minimum required columns
  const hasName = mapping.fullName !== undefined || (mapping.firstName !== undefined && mapping.lastName !== undefined);
  if (!hasName) {
    warnings.push("Could not detect athlete name columns. Looking for: Name, First Name, Last Name, Athlete");
  }

  // Try to detect competition info from cells above the header
  let competitionName = "";
  let competitionDate = "";
  let competitionLocation = "";

  for (let i = 0; i < headerRowIndex; i++) {
    const row = data[i] || [];
    for (const cell of row) {
      const val = String(cell || "").trim();
      if (!val) continue;

      // Try to detect date patterns
      if (!competitionDate) {
        const dateMatch = val.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (dateMatch) {
          const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
          competitionDate = `${year}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
        }
      }

      // First long-ish text is likely competition name
      if (!competitionName && val.length > 5 && !val.match(/^\d/)) {
        competitionName = val;
      }
    }
  }

  // Parse athletes from data rows
  const athletes: ParsedAthlete[] = [];
  const dataRows = data.slice(headerRowIndex + 1);

  for (let ri = 0; ri < dataRows.length; ri++) {
    const row = dataRows[ri];
    if (!row || row.length === 0) continue;

    // Skip empty rows
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (nonEmpty < 2) continue;

    const athleteWarnings: string[] = [];

    // Parse name
    let firstName = "";
    let lastName = "";

    if (mapping.firstName !== undefined && mapping.lastName !== undefined) {
      firstName = String(row[mapping.firstName] || "").trim();
      lastName = String(row[mapping.lastName] || "").trim();
    } else if (mapping.fullName !== undefined) {
      const fullName = String(row[mapping.fullName] || "").trim();
      if (!fullName) continue; // Skip rows with no name
      const parts = fullName.split(/\s+/);
      if (parts.length >= 2) {
        // Check if name is "LAST, First" format
        if (parts[0].endsWith(",")) {
          lastName = parts[0].replace(",", "");
          firstName = parts.slice(1).join(" ");
        } else {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      } else {
        firstName = fullName;
        athleteWarnings.push("Could not split full name into first/last");
      }
    } else {
      continue; // Skip row if no name columns
    }

    if (!firstName && !lastName) continue;

    const country = mapping.country !== undefined ? String(row[mapping.country] || "").trim() : "";
    const gender = mapping.gender !== undefined ? normalizeGender(String(row[mapping.gender] || "").trim()) : "";
    const ageCategory = mapping.ageCategory !== undefined ? normalizeAgeCategory(String(row[mapping.ageCategory] || "").trim()) : "Senior";
    const club = mapping.club !== undefined ? String(row[mapping.club] || "").trim() : "";

    // Parse scores
    const scores: ParsedAthlete["scores"] = {};

    // Fencing Ranking
    if (mapping.fencingRankingPoints !== undefined || mapping.fencingVictories !== undefined) {
      scores.fencingRanking = {
        victories: mapping.fencingVictories !== undefined ? parseInteger(row[mapping.fencingVictories]) : undefined,
        totalBouts: mapping.fencingBouts !== undefined ? parseInteger(row[mapping.fencingBouts]) : undefined,
        points: mapping.fencingRankingPoints !== undefined ? parseNumber(row[mapping.fencingRankingPoints]) : undefined,
      };
    }

    // Fencing DE
    if (mapping.fencingDEPoints !== undefined || mapping.fencingDEPlacement !== undefined) {
      scores.fencingDE = {
        placement: mapping.fencingDEPlacement !== undefined ? parseInteger(row[mapping.fencingDEPlacement]) : undefined,
        points: mapping.fencingDEPoints !== undefined ? parseNumber(row[mapping.fencingDEPoints]) : undefined,
      };
    }

    // Obstacle
    if (mapping.obstaclePoints !== undefined || mapping.obstacleTime !== undefined) {
      const obstacleTimeSec = mapping.obstacleTime !== undefined ? parseTimeToSeconds(row[mapping.obstacleTime]) : undefined;
      scores.obstacle = {
        timeSeconds: obstacleTimeSec,
        points: mapping.obstaclePoints !== undefined ? parseNumber(row[mapping.obstaclePoints]) : undefined,
      };
    }

    // Swimming
    if (mapping.swimmingPoints !== undefined || mapping.swimmingTime !== undefined) {
      const swimTimeRaw = mapping.swimmingTime !== undefined ? String(row[mapping.swimmingTime] || "") : "";
      const swimTimeHundredths = mapping.swimmingTime !== undefined ? parseTimeToHundredths(row[mapping.swimmingTime]) : undefined;
      scores.swimming = {
        timeRaw: swimTimeRaw,
        timeHundredths: swimTimeHundredths,
        points: mapping.swimmingPoints !== undefined ? parseNumber(row[mapping.swimmingPoints]) : undefined,
      };
    }

    // Laser Run
    if (mapping.laserRunPoints !== undefined || mapping.laserRunTime !== undefined) {
      const lrTimeRaw = mapping.laserRunTime !== undefined ? String(row[mapping.laserRunTime] || "") : "";
      const lrTimeSec = mapping.laserRunTime !== undefined ? parseTimeToSeconds(row[mapping.laserRunTime]) : undefined;
      scores.laserRun = {
        timeRaw: lrTimeRaw,
        finishTimeSeconds: lrTimeSec,
        points: mapping.laserRunPoints !== undefined ? parseNumber(row[mapping.laserRunPoints]) : undefined,
      };
    }

    // Riding
    if (mapping.ridingPoints !== undefined || mapping.ridingKnockdowns !== undefined) {
      scores.riding = {
        knockdowns: mapping.ridingKnockdowns !== undefined ? parseInteger(row[mapping.ridingKnockdowns]) : undefined,
        disobediences: mapping.ridingDisobediences !== undefined ? parseInteger(row[mapping.ridingDisobediences]) : undefined,
        timeOverSeconds: mapping.ridingTimeOver !== undefined ? parseInteger(row[mapping.ridingTimeOver]) : undefined,
        points: mapping.ridingPoints !== undefined ? parseNumber(row[mapping.ridingPoints]) : undefined,
      };
    }

    const totalPoints = mapping.totalPoints !== undefined ? (parseNumber(row[mapping.totalPoints]) || 0) : 0;

    if (!country) athleteWarnings.push("Missing country");
    if (!gender) athleteWarnings.push("Missing or unrecognized gender");

    athletes.push({
      rowIndex: headerRowIndex + 1 + ri + 1, // 1-based for display
      firstName,
      lastName,
      country,
      gender,
      ageCategory,
      club,
      scores,
      totalPoints,
      warnings: athleteWarnings,
    });
  }

  // Try to match athletes to existing database records
  if (athletes.length > 0) {
    const existingAthletes = await prisma.athlete.findMany({
      select: { id: true, firstName: true, lastName: true, country: true },
    });

    for (const parsed of athletes) {
      const match = existingAthletes.find(
        (a) =>
          a.firstName.toLowerCase() === parsed.firstName.toLowerCase() &&
          a.lastName.toLowerCase() === parsed.lastName.toLowerCase()
      );
      if (match) {
        parsed.existingAthleteId = match.id;
        parsed.existingAthleteName = `${match.firstName} ${match.lastName} (${match.country})`;
      }
    }
  }

  if (athletes.length === 0) {
    warnings.push("No athlete data found in the file. Check that columns match expected headers.");
  }

  return {
    competitionName,
    competitionDate,
    competitionLocation,
    athletes,
    detectedColumns: detected,
    warnings,
    sheetName,
    totalRows: dataRows.length,
  };
}

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeGender(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === "m" || lower === "male" || lower === "boy" || lower === "men") return "M";
  if (lower === "f" || lower === "female" || lower === "girl" || lower === "women" || lower === "w") return "F";
  return raw.toUpperCase().charAt(0) || "";
}

function normalizeAgeCategory(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, "");
  const categories: Record<string, string> = {
    u9: "U9", u11: "U11", u13: "U13", u15: "U15", u17: "U17", u19: "U19",
    junior: "Junior", senior: "Senior", masters: "Masters", master: "Masters",
    "under9": "U9", "under11": "U11", "under13": "U13", "under15": "U15",
    "under17": "U17", "under19": "U19",
  };
  return categories[lower] || raw || "Senior";
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (isErrorResponse(admin)) return admin;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ── Confirm Import ──
  if (action === "confirm") {
    return handleConfirmImport(req);
  }

  // ── Parse / Preview ──
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const ext = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      return NextResponse.json({ error: "Invalid file type. Please upload .xlsx or .xls files." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await parseExcelFile(buffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse Excel file" },
      { status: 500 }
    );
  }
}

// ─── Confirm Import Handler ─────────────────────────────────────────────────

async function handleConfirmImport(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      competitionName,
      competitionDate,
      competitionLocation,
      ageCategory = "Senior",
      athletes,
    } = body as {
      competitionName: string;
      competitionDate: string;
      competitionLocation: string;
      ageCategory: string;
      athletes: ParsedAthlete[];
    };

    if (!competitionName || !competitionDate) {
      return NextResponse.json({ error: "Competition name and date are required" }, { status: 400 });
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ error: "No athletes to import" }, { status: 400 });
    }

    const results = {
      competitionId: "",
      competitionName: "",
      athletesCreated: 0,
      athletesMatched: 0,
      eventsCreated: 0,
      scoresCreated: 0,
      errors: [] as string[],
    };

    // Create competition
    const competition = await prisma.competition.create({
      data: {
        name: competitionName,
        date: competitionDate,
        endDate: competitionDate,
        location: competitionLocation || "Unknown",
        status: "completed",
        competitionType: "individual",
        ageCategory,
      },
    });

    results.competitionId = competition.id;
    results.competitionName = competition.name;

    // Detect which disciplines have data
    const disciplines = new Set<string>();
    for (const athlete of athletes) {
      if (athlete.scores.fencingRanking) disciplines.add("fencing_ranking");
      if (athlete.scores.fencingDE) disciplines.add("fencing_de");
      if (athlete.scores.obstacle) disciplines.add("obstacle");
      if (athlete.scores.swimming) disciplines.add("swimming");
      if (athlete.scores.laserRun) disciplines.add("laser_run");
      if (athlete.scores.riding) disciplines.add("riding");
    }

    // Create events for each discipline
    const eventMap: Record<string, string> = {};
    let sortOrder = 0;
    for (const discipline of disciplines) {
      const event = await prisma.event.create({
        data: {
          competitionId: competition.id,
          discipline,
          status: "completed",
          sortOrder: sortOrder++,
        },
      });
      eventMap[discipline] = event.id;
      results.eventsCreated++;
    }

    // Process each athlete
    for (const parsed of athletes) {
      try {
        let athleteId: string;

        if (parsed.existingAthleteId) {
          athleteId = parsed.existingAthleteId;
          results.athletesMatched++;
        } else {
          // Create new athlete
          const newAthlete = await prisma.athlete.create({
            data: {
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              country: parsed.country || "Unknown",
              gender: parsed.gender || "M",
              ageCategory: parsed.ageCategory || "Senior",
              club: parsed.club || undefined,
            },
          });
          athleteId = newAthlete.id;
          results.athletesCreated++;
        }

        // Register athlete in competition
        await prisma.competitionAthlete.upsert({
          where: {
            competitionId_athleteId: {
              competitionId: competition.id,
              athleteId,
            },
          },
          update: {},
          create: {
            competitionId: competition.id,
            athleteId,
            ageCategory: parsed.ageCategory || ageCategory,
            status: "registered",
          },
        });

        // Insert scores for each discipline
        const s = parsed.scores;

        if (s.fencingRanking && eventMap.fencing_ranking) {
          await prisma.fencingRankingScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.fencing_ranking, athleteId } },
            update: {
              victories: s.fencingRanking.victories || 0,
              totalBouts: s.fencingRanking.totalBouts || 0,
              calculatedPoints: s.fencingRanking.points || 0,
            },
            create: {
              eventId: eventMap.fencing_ranking,
              athleteId,
              victories: s.fencingRanking.victories || 0,
              totalBouts: s.fencingRanking.totalBouts || 0,
              calculatedPoints: s.fencingRanking.points || 0,
            },
          });
          results.scoresCreated++;
        }

        if (s.fencingDE && eventMap.fencing_de) {
          await prisma.fencingDEScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.fencing_de, athleteId } },
            update: {
              placement: s.fencingDE.placement || 0,
              calculatedPoints: s.fencingDE.points || 0,
            },
            create: {
              eventId: eventMap.fencing_de,
              athleteId,
              placement: s.fencingDE.placement || 0,
              calculatedPoints: s.fencingDE.points || 0,
            },
          });
          results.scoresCreated++;
        }

        if (s.obstacle && eventMap.obstacle) {
          await prisma.obstacleScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.obstacle, athleteId } },
            update: {
              timeSeconds: s.obstacle.timeSeconds || 0,
              penaltyPoints: 0,
              calculatedPoints: s.obstacle.points || 0,
            },
            create: {
              eventId: eventMap.obstacle,
              athleteId,
              timeSeconds: s.obstacle.timeSeconds || 0,
              penaltyPoints: 0,
              calculatedPoints: s.obstacle.points || 0,
            },
          });
          results.scoresCreated++;
        }

        if (s.swimming && eventMap.swimming) {
          await prisma.swimmingScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.swimming, athleteId } },
            update: {
              timeHundredths: s.swimming.timeHundredths || 0,
              penaltyPoints: 0,
              calculatedPoints: s.swimming.points || 0,
            },
            create: {
              eventId: eventMap.swimming,
              athleteId,
              timeHundredths: s.swimming.timeHundredths || 0,
              penaltyPoints: 0,
              calculatedPoints: s.swimming.points || 0,
            },
          });
          results.scoresCreated++;
        }

        if (s.laserRun && eventMap.laser_run) {
          await prisma.laserRunScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.laser_run, athleteId } },
            update: {
              finishTimeSeconds: s.laserRun.finishTimeSeconds || 0,
              calculatedPoints: s.laserRun.points || 0,
            },
            create: {
              eventId: eventMap.laser_run,
              athleteId,
              finishTimeSeconds: s.laserRun.finishTimeSeconds || 0,
              calculatedPoints: s.laserRun.points || 0,
            },
          });
          results.scoresCreated++;
        }

        if (s.riding && eventMap.riding) {
          await prisma.ridingScore.upsert({
            where: { eventId_athleteId: { eventId: eventMap.riding, athleteId } },
            update: {
              knockdowns: s.riding.knockdowns || 0,
              disobediences: s.riding.disobediences || 0,
              timeOverSeconds: s.riding.timeOverSeconds || 0,
              calculatedPoints: s.riding.points || 0,
            },
            create: {
              eventId: eventMap.riding,
              athleteId,
              knockdowns: s.riding.knockdowns || 0,
              disobediences: s.riding.disobediences || 0,
              timeOverSeconds: s.riding.timeOverSeconds || 0,
              calculatedPoints: s.riding.points || 0,
            },
          });
          results.scoresCreated++;
        }
      } catch (err) {
        results.errors.push(
          `Row ${parsed.rowIndex}: ${parsed.firstName} ${parsed.lastName} - ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Import confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import data" },
      { status: 500 }
    );
  }
}
