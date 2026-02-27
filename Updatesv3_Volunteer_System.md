# Updates v3 — Volunteer Role & Real-Time Data Entry System

## Overview

Introduce a **Volunteer** role to the Pentathlon Tracker that enables event-day helpers to perform real-time score and time entry through purpose-built mobile dashboards — without needing to create an account. Volunteers join via a secure link shared by an admin, are assigned to specific events and athletes, and submit data that flows through a three-stage verification pipeline before becoming official.

This update touches **every layer** of the application: database schema, authentication, API routes, admin UI, volunteer-facing dashboards, public-facing score display, and real-time data flow.

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Volunteer Access & Authentication](#2-volunteer-access--authentication)
3. [Admin Management Interface](#3-admin-management-interface)
4. [Volunteer Dashboards by Discipline](#4-volunteer-dashboards-by-discipline)
   - 4.1 [Swimming — Timer Dashboard](#41-swimming--timer-dashboard)
   - 4.2 [Fencing Ranking — Referee Dashboard](#42-fencing-ranking--referee-dashboard)
   - 4.3 [Fencing DE — Referee Dashboard](#43-fencing-de--referee-dashboard)
   - 4.4 [Obstacle — Timer/Penalty Dashboard](#44-obstacle--timerpenalty-dashboard)
   - 4.5 [Laser Run — Volunteer & Target Assignment System](#45-laser-run--volunteer--target-assignment-system)
5. [Data Verification Pipeline](#5-data-verification-pipeline)
6. [Preliminary Score Display](#6-preliminary-score-display)
7. [Notification System](#7-notification-system)
8. [API Routes](#8-api-routes)
9. [Security Considerations](#9-security-considerations)
10. [Mobile UX Requirements](#10-mobile-ux-requirements)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Database Schema Changes

### New Models

#### `Volunteer`
Represents a volunteer session (not a permanent user account).

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Volunteer's display name |
| `email` | String? | Optional — used for sending the access link |
| `phone` | String? | Optional — used for sending the access link via SMS |
| `accessToken` | String (unique) | Secure random token embedded in the access link |
| `competitionId` | String (FK) | The competition this volunteer belongs to |
| `status` | String | `active`, `revoked` |
| `createdAt` | DateTime | When the volunteer was added |
| `expiresAt` | DateTime | When access expires (set to competition end date/time) |
| `lastActiveAt` | DateTime? | Last time the volunteer interacted with the system |
| `createdBy` | String | Admin user ID who created this volunteer |

#### `VolunteerAssignment`
Links a volunteer to a specific event and optionally to specific athletes.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `volunteerId` | String (FK) | The volunteer |
| `eventId` | String (FK) | The event they're assigned to |
| `role` | String | `timer`, `referee`, `judge`, `recorder`, `flagger` |
| `athleteIds` | String? | JSON array of athlete IDs (null = entire event/pool) |
| `metadata` | String? | JSON — discipline-specific config (e.g. `{"lane": 4}` for swimming, `{"pool": "A"}` for fencing) |
| `assignedAt` | DateTime | When the assignment was made |
| `assignedBy` | String | Admin user ID who made the assignment |

#### `PreliminaryScore`
Holds volunteer-submitted scores before official verification.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `eventId` | String (FK) | The event |
| `athleteId` | String (FK) | The athlete |
| `volunteerId` | String (FK) | Who submitted it |
| `discipline` | String | `swimming`, `fencing_ranking`, `fencing_de`, `obstacle`, `laser_run` |
| `data` | String | JSON — discipline-specific raw data (times, scores, penalties) |
| `status` | String | `preliminary`, `verified`, `rejected`, `corrected` |
| `submittedAt` | DateTime | When the volunteer submitted |
| `verifiedAt` | DateTime? | When an official verified |
| `verifiedBy` | String? | Official user ID who verified |
| `rejectionReason` | String? | If rejected, why |
| `officialScoreId` | String? | FK to the final score record once promoted |

### Modified Models

#### `Competition` — add fields:
| Field | Type | Description |
|---|---|---|
| `showPreliminaryScores` | Boolean (default: false) | Admin toggle: whether unverified scores are visible to the public |
| `volunteerAccessEnabled` | Boolean (default: false) | Master switch to enable/disable volunteer access for this competition |

### Relationships

```
Competition 1──* Volunteer
Competition 1──* Event
Volunteer   1──* VolunteerAssignment
Event       1──* VolunteerAssignment
Volunteer   1──* PreliminaryScore
Event       1──* PreliminaryScore
Athlete     1──* PreliminaryScore
```

---

## 2. Volunteer Access & Authentication

### Access Link Flow

1. **Admin creates a volunteer** in the competition management UI — enters name and email/phone.
2. System generates a cryptographically secure `accessToken` (32-byte random, base64url-encoded).
3. System constructs a link: `https://{domain}/volunteer/{accessToken}`
4. Admin sends the link via the system (email) or copies it to share manually (text/WhatsApp).
5. Volunteer opens the link on their phone — no login, no account creation.

### Session Management

- The `accessToken` is stored in an HTTP-only cookie upon first visit.
- All subsequent requests from that browser session are authenticated via the cookie.
- **Expiry**: Access tokens expire when the competition ends (`competition.endDate`). After expiry, the volunteer sees a "Competition has ended" message.
- **Revocation**: Admins can revoke a volunteer's access at any time, immediately invalidating their token.
- **Scope**: A volunteer can only access data related to their assigned event(s). They cannot see other events, other volunteers' data, or admin functions.

### Reassignment

- Admins can reassign a volunteer to a different event or different athletes at any time.
- When reassigned, the volunteer's dashboard updates in real-time (via polling or SSE) to reflect their new assignment.
- Previous assignment data is preserved for audit purposes.

---

## 3. Admin Management Interface

### Competition Setup — Volunteer Tab

A new **"Volunteers"** tab in the competition management view (`/admin/competitions/[id]/volunteers`).

#### Volunteer List View
- Table showing all volunteers for this competition: Name, Email/Phone, Status, Current Assignment, Last Active.
- **Add Volunteer** button opens a modal:
  - Name (required)
  - Email or Phone (at least one required)
  - Send link automatically (checkbox) — if checked, sends email/SMS on creation
- **Bulk Add** — paste a list of names/emails to create multiple volunteers at once.
- Each volunteer row has actions: **Assign**, **Reassign**, **Revoke Access**, **Copy Link**, **Resend Link**.

#### Auto-Assignment System

Instead of manually assigning each volunteer one-by-one, the system uses **auto-random-assignment** with admin review:

1. **Admin selects an event** (e.g. Swimming) from the volunteer management tab.
2. **System auto-assigns** — volunteers are randomly distributed across the available positions for that event:
   - **Swimming**: Randomly assigns volunteers to lanes (one per lane).
   - **Fencing Ranking**: Randomly assigns volunteers to pools (one ref per pool).
   - **Fencing DE**: Randomly assigns volunteers to bracket sections.
   - **Obstacle**: Randomly assigns 2 volunteers as lane timers (Lane 1, Lane 2) and recommends remaining unassigned volunteers as flaggers.
   - **Laser Run**: Randomly assigns volunteers to athletes (one per athlete).
   - **Riding**: Randomly assigns volunteers to athletes (one judge per athlete, or one for all).
3. **Admin reviews** — the assignments are displayed in a **drag-and-drop list** (touch-friendly; works on both desktop and mobile via long-press-to-drag) where the admin can:
   - Drag volunteers between positions to swap assignments.
   - Remove a volunteer from a position (returns them to the unassigned pool).
   - Pull an unassigned volunteer into an empty position.
4. **Launch** — once satisfied, the admin clicks **Launch Assignments**. This finalizes all assignments, sends access links (if not already sent), and pushes assignment details to each volunteer's dashboard.

The auto-assign can be re-run at any time (e.g. if new volunteers are added mid-event), and the admin always has the final say via drag-and-drop before launching.

#### Quick-Reassign During Event
- A streamlined "Quick Reassign" panel accessible from the score-entry page.
- Shows current assignments with drag-and-drop reordering.
- One-click swap between two volunteers' positions.
- Unassigned volunteer pool visible on the side for quick additions.

#### Master Controls
- **Enable Volunteer Access** toggle — master switch for the entire competition.
- **Show Preliminary Scores** toggle — controls whether the public sees unverified data.
- **Revoke All** button — emergency kill switch to revoke all volunteer access instantly.

---

## 4. Volunteer Dashboards by Discipline

All dashboards share these common elements:
- **Header**: Competition name, event name, volunteer name, assigned athlete/lane/pool.
- **Connection indicator**: Green dot when connected, yellow when reconnecting, red when offline (with local queue).
- **Offline resilience**: If connection drops, submissions are queued locally and auto-synced when connection returns.
- **Confirmation step**: Every submission requires a confirmation tap before uploading.
- **Large touch targets**: All interactive elements minimum 48x48px for gloved/outdoor use.
- **Audio feedback**: The phone plays a distinct sound on key button presses so the volunteer gets immediate auditory confirmation without needing to look at the screen:
  - **START** — short high-pitched beep (like a starting gun tone).
  - **STOP** — double beep (confirms the timer has stopped).
  - **LAP / RUN LAP / SHOOT LAP** — quick click/tick sound (confirms the split was captured).
  - **STOP SHOOT** — double beep (confirms the shoot sub-timer stopped).
  - **CONFIRM** — success chime (confirms data was submitted).
  - Sounds are played via the Web Audio API for instant playback with no network latency. They work even when the device is in silent mode (using the media audio channel, not the ringer channel).
- **Mobile-first layouts**: All dashboards are designed for portrait orientation on phones (320px–430px width). Layouts use a single-column stacked design with no horizontal scrolling. Timer displays, buttons, and input areas are sized to fill the viewport width with generous padding.

### 4.1 Swimming — Timer Dashboard

**Role**: Timer (one volunteer per lane)

**Layout** (mobile-first, portrait orientation):

```
┌─────────────────────────────┐
│  Lane 4 — Emma Richardson   │  ← Assignment header
│  200m Freestyle             │
├─────────────────────────────┤
│                             │
│       00:00.00              │  ← Large digital timer display
│                             │
├─────────────────────────────┤
│                             │
│    ┌─────────────────┐      │
│    │     START        │      │  ← Large green button (toggles to STOP)
│    └─────────────────┘      │
│                             │
│    ┌─────────────────┐      │
│    │      LAP         │      │  ← Captures split time
│    └─────────────────┘      │
│                             │
├─────────────────────────────┤
│  Splits:                    │
│  Lap 1: 00:32.45           │  ← Running list of split times
│  Lap 2: 01:06.12           │
│  Lap 3: 01:41.88           │
├─────────────────────────────┤
│  ┌───────────┐ ┌──────────┐│
│  │  CANCEL   │ │ CONFIRM  ││  ← Appears after STOP
│  └───────────┘ └──────────┘│
└─────────────────────────────┘
```

**Behavior**:
- Timer starts on **START** tap. Button changes to red **STOP**.
- **LAP** button captures the current time as a split without stopping the timer.
- When **STOP** is tapped, timer freezes and the confirmation panel slides up.
- Confirmation shows: final time, all splits, athlete name, lane number.
- **CONFIRM** uploads the time as a `PreliminaryScore`. **CANCEL** resets the timer.
- After confirmation, the dashboard resets for the next heat (if applicable) or shows a "Waiting for next assignment" state.

**Data submitted** (JSON in `PreliminaryScore.data`):
```json
{
  "finalTimeHundredths": 12345,
  "splits": [3245, 6612, 10188, 12345],
  "lane": 4
}
```

### 4.2 Fencing Ranking — Referee Dashboard

**Role**: Referee (one volunteer per pool of athletes)

**Layout** (mobile-first, portrait; pool matrix scrolls horizontally if needed on narrow screens):

```
┌─────────────────────────────┐
│  Pool A — Fencing Ranking   │
│  6 Athletes · 15 Bouts      │
├─────────────────────────────┤
│  Bout Order (suggested):    │
│  ┌─────────────────────────┐│
│  │ 1. Richardson v Tremblay││  ← Tap to score
│  │ 2. Chen v Mueller       ││
│  │ 3. Tanaka v Garcia      ││
│  │ ...                     ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  Full Pool Matrix:          │
│  ┌──┬──┬──┬──┬──┬──┬───┐   │
│  │  │ER│ST│OC│SM│YT│ V │   │  ← Tap any cell to score
│  │ER│──│  │  │  │  │   │   │
│  │ST│  │──│  │  │  │   │   │
│  │OC│  │  │──│  │  │   │   │
│  │SM│  │  │  │──│  │   │   │
│  │YT│  │  │  │  │──│   │   │
│  └──┴──┴──┴──┴──┴──┴───┘   │
├─────────────────────────────┤
│  Progress: 8/15 bouts       │
│  ████████░░░░░░░ 53%        │
└─────────────────────────────┘
```

**Scoring a bout** (modal on tap):
```
┌─────────────────────────────┐
│  Richardson  vs  Tremblay   │
│                             │
│  ┌────────┐    ┌────────┐   │
│  │   V    │    │        │   │  ← Tap winner. "V" = Victory, "D" = Defeat
│  │  (Win) │    │   D    │   │
│  └────────┘    └────────┘   │
│                             │
│  Score: 5 - 3              │  ← Optional: enter touch count
│                             │
│  ┌──────────────────────┐   │
│  │      CONFIRM          │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

**Behavior**:
- Bouts listed in official round-robin order for guidance, but any bout can be scored by tapping the matrix cell.
- Completed bouts show V/D in the matrix and are checked off in the bout order list.
- Each scored bout is uploaded as a `PreliminaryScore` in real time.
- **Print View** button generates a PDF/printable page matching the standard paper fencing score sheet format.
- Progress bar shows completion percentage.

**Data submitted** (one per bout):
```json
{
  "bout": {
    "athlete1Id": "...",
    "athlete2Id": "...",
    "winnerId": "...",
    "score": "5-3"
  },
  "boutNumber": 1,
  "poolId": "A"
}
```

### 4.3 Fencing DE — Referee Dashboard

**Role**: Referee (assigned to a bracket section)

**Layout** (mobile-first; bracket scrolls horizontally on narrow screens): Similar to the existing `FencingDEBracket` component but interactive.

**Behavior**:
- Shows the DE bracket with the volunteer's assigned section highlighted.
- Tap a matchup to enter the result (winner selection + score).
- Results upload in real time and the bracket updates live.
- Officials can release bracket results to the public view.

**Data submitted**:
```json
{
  "matchup": {
    "athlete1Id": "...",
    "athlete2Id": "...",
    "winnerId": "...",
    "score": "15-12",
    "round": "quarterfinal"
  }
}
```

### 4.4 Obstacle — Two-Lane System

The obstacle course has **2 lanes**, requiring **2 timer volunteers** (one per lane) and a pool of **flaggers** who monitor athletes for rule violations.

#### 4.4.1 Volunteer Roles

| Role | Count | Assignment |
|---|---|---|
| **Timer** | 2 (one per lane) | Assigned to Lane 1 or Lane 2 |
| **Flagger** | Recommended by system from volunteer pool | Assigned to the course; tracks the current running athlete |

When the admin triggers auto-assignment for the Obstacle event:
1. The system **randomly assigns** 2 volunteers as lane timers (Lane 1, Lane 2) from the available pool.
2. From the remaining unassigned volunteers, the system **randomly recommends** a few as flaggers.
3. All assignments appear in a **drag-and-drop list** where the admin can swap, remove, or reassign volunteers before launching.
4. On **Launch**, flagger volunteers receive their access link and are assigned the `flagger` role.

#### 4.4.2 Timer Dashboard (Lane Timer)

**Role**: Timer (one per lane)

**Layout** (mobile-first, portrait orientation):

```
┌─────────────────────────────┐
│  Obstacle — Lane 1          │
│  Current: Emma Richardson   │  ← Auto-populated from run order
├─────────────────────────────┤
│                             │
│       00:00.00              │  ← Timer display
│                             │
│    ┌─────────────────┐      │
│    │     START        │      │
│    └─────────────────┘      │
│                             │
│    ┌─────────────────┐      │
│    │      STOP        │      │  ← Appears after START
│    └─────────────────┘      │
│                             │
├─────────────────────────────┤
│  Time: 18.52s               │
│  ┌───────────┐ ┌──────────┐│
│  │  CANCEL   │ │ CONFIRM  ││  ← Appears after STOP
│  └───────────┘ └──────────┘│
├─────────────────────────────┤
│  Next up: Sophie Tremblay   │  ← Preview of next athlete
└─────────────────────────────┘
```

**Behavior**:
- Timer starts on **START** tap. Button changes to red **STOP**.
- On stop, confirmation shows the time and athlete name.
- **CONFIRM** uploads the time as a `PreliminaryScore`. **CANCEL** resets.
- After confirmation, the dashboard auto-advances to the next athlete in the run order.
- The current athlete name is auto-populated from the competition run order; the timer volunteer does not need to select athletes manually.

#### 4.4.3 Flagger Dashboard

**Role**: Flagger (monitors athletes for rule violations)

**Layout** (mobile-first, portrait orientation):

```
┌─────────────────────────────┐
│  Obstacle — Flagger         │
│  Current: Emma Richardson   │  ← Synced with the active runner
├─────────────────────────────┤
│                             │
│  Confirm athlete:           │
│  ┌──────────────────────┐   │
│  │  ✓ Emma Richardson    │   │  ← Tap to confirm correct athlete
│  └──────────────────────┘   │
│                             │
├─────────────────────────────┤
│  Flags Issued:              │
│                             │
│  ┌────────┐  ┌────────┐    │
│  │ YELLOW │  │  RED   │    │
│  │  (0)   │  │  (0)   │    │  ← Large tap targets
│  │  [ + ] │  │  [ + ] │    │
│  └────────┘  └────────┘    │
│                             │
│  Flag Log:                  │
│  (no flags issued)          │  ← Running log of flags for this athlete
│                             │
├─────────────────────────────┤
│  ┌──────────────────────┐   │
│  │   SUBMIT & NEXT       │   │  ← Submits flags (even if 0) and advances
│  └──────────────────────┘   │
└─────────────────────────────┘
```

**Behavior**:
- The current athlete name is synced in real time with whoever is actively running (controlled by the admin or auto-advanced when a timer confirms a time).
- The flagger first **confirms** they are watching the correct athlete (tap the name).
- **Yellow Flag** and **Red Flag** buttons are large, color-coded tap targets. Each tap increments the count and adds an entry to the flag log with a timestamp.
- Flags can be decremented by tapping the count number (in case of accidental tap).
- **SUBMIT & NEXT** uploads the flag data and advances to the next athlete. If no flags were issued, it submits a clean record.
- Flag data is attached to the athlete's `PreliminaryScore` for that run.

**Data submitted (timer)**:
```json
{
  "timeSeconds": 18.5,
  "lane": 1
}
```

**Data submitted (flagger)**:
```json
{
  "athleteConfirmed": true,
  "yellowFlags": 1,
  "redFlags": 0,
  "flagLog": [
    { "type": "yellow", "timestamp": "2026-02-08T14:23:15.000Z" }
  ]
}
```

### 4.5 Laser Run — Volunteer & Target Assignment System

The Laser Run is the most complex volunteer setup because it combines shooting range target assignments, alternating run/shoot phases, and one of two start modes — **staggered** or **mass** — which fundamentally changes how timing works. Each volunteer follows **one athlete** through the entire event using a timer dashboard with a main clock, run laps, and shoot laps (with a dedicated 50-second shoot timer). All derived metrics — total shoot time, total run time, per-lap splits — are **computed automatically** from the raw timer data. This lets coaches and athletes analyze shoot vs. run performance independently without burdening the volunteer with complex data entry.

#### 4.5.1 Admin — Target Assignment View

A new **"Target Assignment"** button is added to the Laser Run tab in the admin score-entry page. This button navigates to a dedicated view (`/admin/competitions/[id]/laser-run-targets`).

**How it works**:

1. The admin enters the **number of targets at the range** (e.g. 4, 6, 8).
2. The system pulls the **current overall rankings** for each category (Men, Women, age groups) calculated from all prior events (Fencing Ranking, Fencing DE, Obstacle, Swimming). This ranking system is already implemented in the handicap calculation — the target assignment hooks into the same data.
3. Athletes are **auto-assigned to target positions** based on rank:
   - Rank 1 → Target 1
   - Rank 2 → Target 2
   - ...and so on, wrapping around if there are more athletes than targets (e.g. with 4 targets: Rank 5 → Target 1 again for the next wave).
4. The admin sees a table (responsive — stacks to card layout on mobile, full table on desktop/tablet):

```
┌─────────────────────────────────────────────────┐
│  Target Assignment — Laser Run                  │
│  Targets at range: [ 4 ]  ← Input field        │
├────────┬──────────────────┬─────────┬───────────┤
│ Target │ Athlete          │ Rank    │ Handicap  │
├────────┼──────────────────┼─────────┼───────────┤
│   1    │ Emma Richardson  │  1st    │ 0:00      │
│   2    │ Liu Wei          │  2nd    │ 0:07      │
│   3    │ Anna Kovacs      │  3rd    │ 0:12      │
│   4    │ Sophie Tremblay  │  4th    │ 0:18      │
├────────┼──────────────────┼─────────┼───────────┤
│  Wave 2                                         │
│   1    │ Olivia Chen      │  5th    │ 0:25      │
│   2    │ Sarah Mueller    │  6th    │ 0:31      │
│   ...  │ ...              │  ...    │ ...       │
└────────┴──────────────────┴─────────┴───────────┘
```

5. The admin can **manually drag-and-drop** to reorder athletes or reassign target positions.
6. **Print** button generates a printable sheet of the target assignments for posting at the range.
7. **Release** button — before publishing, the system prompts the admin with a **Start Mode Selection** modal:

```
┌─────────────────────────────────┐
│  Select Start Mode              │
│                                 │
│  ┌───────────────────────────┐  │
│  │    STAGGERED START         │  │  ← Default for most competitions
│  │  Athletes start at their   │  │
│  │  handicap time. First to   │  │
│  │  cross the line wins.      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │      MASS START            │  │  ← Used when staggered isn't practical
│  │  All athletes start at     │  │
│  │  the same time. Handicap   │  │
│  │  applied after to scores.  │  │
│  └───────────────────────────┘  │
│                                 │
│  Total Laps: [ 4 ]  ← Input    │  ← Number of run/shoot laps
│                                 │
│  ┌───────────────────────────┐  │
│  │    RELEASE ASSIGNMENTS     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

The admin must select one of the two modes and enter the **total number of laps** before releasing. This choice is locked once released (cannot be changed without revoking and re-releasing).

#### 4.5.1.1 Start Mode Differences

| Aspect | Staggered Start | Mass Start |
|---|---|---|
| **How it works in real life** | Athletes start at different times based on their handicap (calculated from prior events). The 1st-ranked athlete starts first, 2nd-ranked starts X seconds later, etc. The first athlete to physically cross the finish line wins. | All athletes start at the same time (gun goes off once). Raw times are recorded. Handicap is applied mathematically after the race to determine final standings. |
| **Volunteer dashboard** | Shows the athlete's **handicap start time** (e.g. "+15s") so the volunteer knows when their athlete goes. The main timer starts when the athlete actually starts (at their handicap time). | No handicap display needed. The main timer starts when the gun goes off (same for all athletes). |
| **Timer start trigger** | Volunteer taps START when their specific athlete begins (at the athlete's handicap time). Each volunteer starts their timer independently. | All volunteers tap START at the same moment (when the gun fires). The system could optionally broadcast a "GO" signal to sync all dashboards. |
| **Winner determination** | First to cross the finish line = winner. The recorded overall time is the athlete's actual elapsed time from their start to finish. | Raw overall times are recorded. The system subtracts each athlete's handicap from their raw time (or adds it, depending on convention) to produce an **adjusted time**. Lowest adjusted time = winner. |
| **What the volunteer sees** | Handicap time displayed in header. Athlete order in "Next up" follows handicap start order. | No handicap in header. "Next up" is not applicable (all athletes run simultaneously). |
| **Server-side scoring** | `overallTimeSeconds` is the final time as-is. No adjustment needed. `isPackStart = false`. | `overallTimeSeconds` is the raw time. Server computes `adjustedTimeSeconds = overallTimeSeconds - handicapStartDelay`. `isPackStart = true`. |

#### 4.5.1.2 System Adjustments by Start Mode

**When Staggered Start is selected:**
- Volunteer dashboards display the athlete's handicap start time prominently in the header.
- The "Next up" preview at the bottom of the dashboard shows the next athlete in handicap start order.
- The `isPackStart` field is set to `false` on all submitted data.
- Scoring uses `overallTimeSeconds` directly — no post-race adjustment.
- The admin score-entry page shows athletes ordered by finish position (first to cross = rank 1).

**When Mass Start is selected:**
- Volunteer dashboards hide the handicap start time (it's not relevant during the race).
- The "Next up" preview is hidden (all athletes are running simultaneously; the volunteer only tracks their assigned athlete).
- The `isPackStart` field is set to `true` on all submitted data.
- Scoring computes `adjustedTimeSeconds` server-side: the existing handicap system provides each athlete's delay, and the server subtracts it from the raw `overallTimeSeconds` to produce the adjusted time.
- The admin score-entry page shows both **Raw Time** and **Adjusted Time** columns, with athletes ranked by adjusted time.
- The public leaderboard shows adjusted times with a note: "Times adjusted for handicap (mass start)."

**Data model** — stored in the `Event.config` JSON field for the laser_run event:
```json
{
  "targetCount": 4,
  "startMode": "staggered",
  "totalLaps": 4,
  "assignments": [
    { "targetPosition": 1, "athleteId": "...", "wave": 1 },
    { "targetPosition": 2, "athleteId": "...", "wave": 1 },
    { "targetPosition": 3, "athleteId": "...", "wave": 1 },
    { "targetPosition": 4, "athleteId": "...", "wave": 1 },
    { "targetPosition": 1, "athleteId": "...", "wave": 2 },
    ...
  ],
  "released": true
}
```

- `startMode`: `"staggered"` or `"mass"` — determines dashboard behavior and scoring logic.
- `totalLaps`: integer — the number of run/shoot laps the athlete will complete. Pushed to volunteer dashboards so the lap counter shows "Lap X of Y".

#### 4.5.2 Volunteer Dashboard — Laser Run Timer

**Role**: Timer (one volunteer per athlete)

Each volunteer follows **one athlete** through the entire laser run. The dashboard has a **main timer** that runs the full duration of the event, plus three action buttons — **START/STOP**, **RUN LAP**, and **SHOOT LAP** — and a secondary **shoot timer** that appears when the athlete enters the range.

**Event flow** (typical 4-lap laser run):
1. Volunteer taps **START** — main timer begins from 0:00.
2. Athlete runs to the range → volunteer taps **SHOOT LAP** — this marks a run lap on the main timer AND starts the **shoot timer** (a separate 50-second countdown/count-up timer).
3. Athlete clears their targets and exits the range → volunteer taps the shoot timer's **STOP** button — the shoot time is recorded and stored (not displayed prominently to reduce clutter). The shoot timer disappears.
4. Athlete runs 600m → volunteer taps **SHOOT LAP** again when the athlete re-enters the range. Repeat.
5. On the final lap, the athlete runs to the finish line → volunteer taps **RUN LAP** to mark the final run split, then taps **STOP** on the main timer to end.

The **RUN LAP** button records a split on the main timer (same as a normal lap). The **SHOOT LAP** button also records a split on the main timer AND spawns the shoot sub-timer. This means every lap boundary is captured on the main clock, and the shoot times are captured independently on the sub-timer.

**Layout** (mobile-first, portrait orientation):

```
┌─────────────────────────────┐
│  Laser Run                  │
│  Emma Richardson            │
│  Handicap: +15s · Target 1  │  ← Hidden in mass start mode
│  Wave 1 · Gate A            │
├─────────────────────────────┤
│                             │
│        12:03.52             │  ← Main timer (large, always visible)
│                             │
│     Lap 3 of 4              │  ← Lap counter (updates on each lap)
│                             │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │    START / STOP      │    │  ← Green when stopped, red when running
│  └─────────────────────┘    │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │ RUN LAP  │ │SHOOT LAP │ │  ← Side by side; RUN LAP = blue,
│  └──────────┘ └──────────┘ │    SHOOT LAP = orange
│                             │
├─────────────────────────────┤
│  Lap Splits:                │
│  L1: 2:45.3 (run)          │
│  L2: 3:01.1 (shoot+run)    │
│  L3: 2:58.7 (shoot+run)    │
├─────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ │
│  │  CANCEL  │ │ CONFIRM  │ │  ← Appears after STOP
│  └──────────┘ └──────────┘ │
├─────────────────────────────┤
│  Next: Sophie Tremblay(+22s)│  ← Hidden in mass start mode
└─────────────────────────────┘
```

**When SHOOT LAP is tapped**, the shoot sub-timer appears inline, pushing the other content down:

```
├─────────────────────────────┤
│  SHOOT TIMER     00:12.3    │  ← Counts up from 0, orange text
│  (max 50s)                  │  ← Red flash/auto-stop at 50s
│                             │
│  ┌─────────────────────┐    │
│  │   STOP SHOOT         │    │  ← Stops the shoot timer, records time
│  └─────────────────────┘    │
├─────────────────────────────┤
```

The shoot timer is intentionally minimal — it appears only while the athlete is in the range and disappears once stopped. The recorded shoot time is stored in the background and **not displayed** in the main lap splits list to keep the interface clean. The full breakdown (per-shoot times, total shoot time, total run time) is computed server-side and visible in the admin score-entry page and athlete dashboard after submission.

**Button behavior**:

| Button | What it does | Audio |
|---|---|---|
| **START** | Begins the main timer from 0:00. Button label changes to **STOP**. | Start beep |
| **STOP** | Stops the main timer. Confirmation panel appears. | Double beep |
| **RUN LAP** | Records a split on the main timer. Lap counter increments. Used for pure running laps (e.g. the final lap to the finish line). | Click |
| **SHOOT LAP** | Records a split on the main timer. Lap counter increments. Also spawns the shoot sub-timer (starts at 0:00, counts up to 50s max). | Click |
| **STOP SHOOT** | Stops the shoot sub-timer. The shoot time for this visit is stored internally. The sub-timer disappears. | Double beep |
| **CONFIRM** | Uploads all data (main timer, lap splits, shoot times). | Success chime |
| **CANCEL** | Resets everything. | — |

**Button states** — only contextually relevant buttons are enabled:

| State | Enabled | Disabled/Hidden |
|---|---|---|
| Not started | **START** | RUN LAP, SHOOT LAP, STOP |
| Running (main timer active, no shoot timer) | **RUN LAP**, **SHOOT LAP**, **STOP** | START |
| Shooting (shoot sub-timer active) | **STOP SHOOT** | START, RUN LAP, SHOOT LAP, STOP |
| Stopped (main timer stopped) | **CONFIRM**, **CANCEL** | All timer buttons |

**Lap counter**:
- Displays "Lap X of Y" where Y = `totalLaps` from the event config (set by admin during release).
- Increments each time RUN LAP or SHOOT LAP is tapped.
- When the counter reaches the total, the volunteer knows the athlete is on their final stretch.

**Shoot sub-timer details**:
- Counts up from 0:00.0 to a maximum of 50 seconds.
- At 50 seconds the timer auto-stops (the athlete can no longer shoot and must go run). The shoot time is recorded as 50.0s.
- The timer turns red and flashes at 45 seconds as a visual warning that the 50s limit is approaching.
- The recorded shoot time is stored per-visit but **not shown** in the main lap splits list — this keeps the volunteer's screen uncluttered. The shoot times are only visible after submission in the admin/athlete views.

**Staggered vs. Mass Start differences on this dashboard**:
- **Staggered**: Header shows "Handicap: +15s · Target 1 · Wave 1 · Gate A". "Next up" preview shows the next athlete in handicap order.
- **Mass**: Header shows only "Target 1 · Wave 1 · Gate A" (handicap hidden). "Next up" preview is hidden since all athletes run simultaneously.

**Data submitted**:
```json
{
  "overallTimeSeconds": 723.52,
  "startMode": "staggered",
  "handicapStartDelay": 15,
  "isPackStart": false,
  "targetPosition": 1,
  "wave": 1,
  "gateAssignment": "A",
  "totalLaps": 4,
  "laps": [
    { "lap": 1, "splitTimestamp": 165.3, "type": "shoot" },
    { "lap": 2, "splitTimestamp": 346.4, "type": "shoot" },
    { "lap": 3, "splitTimestamp": 525.1, "type": "shoot" },
    { "lap": 4, "splitTimestamp": 723.52, "type": "run" }
  ],
  "shootTimes": [
    { "visit": 1, "shootTimeSeconds": 18.2, "timedOut": false },
    { "visit": 2, "shootTimeSeconds": 10.2, "timedOut": false },
    { "visit": 3, "shootTimeSeconds": 12.8, "timedOut": false }
  ]
}
```

- `laps[].splitTimestamp` — the main timer reading when the lap button was tapped (seconds from start).
- `laps[].type` — `"shoot"` if SHOOT LAP was tapped (athlete entered the range), `"run"` if RUN LAP was tapped (pure running lap, typically the final one).
- `shootTimes[]` — one entry per SHOOT LAP, recording the shoot sub-timer duration. `timedOut: true` means the 50s limit was reached.
- The number of `shootTimes` entries matches the number of `"shoot"` type laps.

#### 4.5.3 Aggregated Laser Run Record (Server-Side)

After the volunteer submits the timer data for an athlete, the system **automatically computes** the full timing breakdown and stores it on the `LaserRunScore` record. The volunteer does not need to calculate anything — all derived metrics come from the raw main timer splits + shoot sub-timer durations.

| Metric | Calculation |
|---|---|
| **Overall Time** (`overallTimeSeconds`) | Main timer START → STOP elapsed time |
| **Adjusted Time** (`adjustedTimeSeconds`) | Mass start only: `overallTimeSeconds` − `handicapStartDelay` |
| **Total Shoot Time** (`totalShootTimeSeconds`) | Sum of all `shootTimeSeconds` from the shoot sub-timer |
| **Total Run Time** (`totalRunTimeSeconds`) | `overallTimeSeconds` − `totalShootTimeSeconds` |
| **Per-Lap Splits** | Derived from the `laps[].splitTimestamp` differences |
| **Per-Shoot Times** | Individual `shootTimes[].shootTimeSeconds` values |
| **Per-Leg Run Times** | Each lap's split time minus the corresponding shoot time (if it was a shoot lap) |

**Aggregated record** (stored as JSON in `LaserRunScore.shootingDetail`):
```json
{
  "overallTimeSeconds": 723.52,
  "adjustedTimeSeconds": null,
  "totalShootTimeSeconds": 41.2,
  "totalRunTimeSeconds": 682.32,
  "penaltySeconds": 0,
  "startMode": "staggered",
  "totalLaps": 4,
  "laps": [
    {
      "lap": 1,
      "splitTimestamp": 165.3,
      "lapTimeSeconds": 165.3,
      "type": "shoot",
      "shootTimeSeconds": 18.2,
      "runTimeSeconds": 147.1
    },
    {
      "lap": 2,
      "splitTimestamp": 346.4,
      "lapTimeSeconds": 181.1,
      "type": "shoot",
      "shootTimeSeconds": 10.2,
      "runTimeSeconds": 170.9
    },
    {
      "lap": 3,
      "splitTimestamp": 525.1,
      "lapTimeSeconds": 178.7,
      "type": "shoot",
      "shootTimeSeconds": 12.8,
      "runTimeSeconds": 165.9
    },
    {
      "lap": 4,
      "splitTimestamp": 723.52,
      "lapTimeSeconds": 198.42,
      "type": "run",
      "shootTimeSeconds": null,
      "runTimeSeconds": 198.42
    }
  ],
  "handicapStartDelay": 15,
  "isPackStart": false,
  "gateAssignment": "A",
  "targetPosition": 1,
  "wave": 1
}
```

**How the server computes the per-lap breakdown**:
- `lapTimeSeconds` = difference between this lap's `splitTimestamp` and the previous lap's (or 0 for lap 1).
- For `"shoot"` type laps: `runTimeSeconds` = `lapTimeSeconds` − `shootTimeSeconds`. This is the time the athlete spent running during that lap (excludes the time in the range).
- For `"run"` type laps: `shootTimeSeconds` is `null` and `runTimeSeconds` = `lapTimeSeconds` (the entire lap was running).
- `adjustedTimeSeconds` is only populated for mass start events: `overallTimeSeconds` − `handicapStartDelay`.

This gives coaches a complete per-lap breakdown showing exactly how much time was spent running vs. shooting in each lap, making it easy to identify where an athlete is gaining or losing time.

#### 4.5.4 Database Schema Changes for Laser Run

The `LaserRunScore` model gains new columns to store the shoot/run breakdown alongside the existing fields:

| Field | Type | Description |
|---|---|---|
| `totalShootTimeSeconds` | Float? | Sum of all shoot sub-timer durations (null until volunteer timer data is submitted) |
| `totalRunTimeSeconds` | Float? | `overallTimeSeconds` − `totalShootTimeSeconds` (computed server-side) |
| `adjustedTimeSeconds` | Float? | Mass start only: `overallTimeSeconds` − `handicapStartDelay` (null for staggered start) |
| `shootingDetail` | String? | JSON — full per-lap breakdown including shoot/run splits (see §4.5.3) |

These are **nullable** so that the existing scoring flow (admin enters only an overall time) continues to work. The new fields are populated automatically when volunteer timer data is available, or can be entered manually by an admin.

The `LaserRunInput` type adds optional fields:
```typescript
export interface LaserRunInput {
  overallTimeSeconds: number;         // RENAMED from finishTimeSeconds
  penaltySeconds?: number;
  ageCategory?: AgeCategory;
  isRelay?: boolean;
  totalShootTimeSeconds?: number;     // NEW — auto-computed from shoot sub-timer
  totalRunTimeSeconds?: number;       // NEW — auto-computed (overall − shoot)
  adjustedTimeSeconds?: number;       // NEW — mass start only (overall − handicap)
}
```

The `laserRunEntry` validation schema adds:
```typescript
export const laserRunEntry = baseScoreEntry.extend({
  overallTimeSeconds: z.number().min(0).max(3600),                   // RENAMED
  handicapStartDelay: z.number().int().min(0).optional().default(0),
  isPackStart: z.boolean().optional().default(false),
  startMode: z.enum(['staggered', 'mass']).optional().default('staggered'),  // NEW
  gateAssignment: z.enum(['A', 'B', 'P']).optional().default('A'),
  penaltySeconds: z.number().int().min(0).max(600).optional().default(0),
  totalShootTimeSeconds: z.number().min(0).max(3600).optional(),     // NEW — auto-computed
  totalRunTimeSeconds: z.number().min(0).max(3600).optional(),       // NEW — auto-computed
  adjustedTimeSeconds: z.number().min(0).max(3600).optional(),       // NEW — mass start only
  shootingDetail: z.string().optional(),                              // NEW — JSON (per-lap breakdown)
});
```

#### 4.5.5 Athlete Dashboard — Laser Run Detail Updates

The athlete dashboard's Laser Run section (personal best card, competition history table, and `DisciplineDetailModal`) must be updated to surface the new granular timing data.

##### Personal Best Card

Currently shows only finish time and points. Updated to include shoot/run split:

```
┌──────────────────────────────────────────┐
│  Laser Run                    PB: 548 pts│
│  Overall:  12:03.5                       │
│  Shoot: 1:31.2  ·  Run: 10:32.3         │
└──────────────────────────────────────────┘
```

- **Overall** = `overallTimeSeconds` formatted as MM:SS.s
- **Shoot** = `totalShootTimeSeconds` formatted as M:SS.s
- **Run** = `totalRunTimeSeconds` formatted as MM:SS.s
- If shoot/run data is not available (older records or manual entry without breakdown), only Total Time is shown.

##### DisciplineDetailModal — Expanded View

When an athlete clicks into their Laser Run detail, the modal expands to show:

1. **Summary Bar** at the top:

```
┌──────────────────────────────────────────────────────┐
│  Overall Time   Shoot Time     Run Time      Points  │
│   12:03.5        1:31.2        10:32.3        548    │
└──────────────────────────────────────────────────────┘
```

2. **Per-Lap Breakdown** — a collapsible section showing each lap's split, shoot time, and run time:

| Lap | Type | Lap Time | Shoot | Run |
|---|---|---|---|---|
| 1 | Shoot | 2:45.3 | 18.2s | 2:27.1 |
| 2 | Shoot | 3:01.1 | 10.2s | 2:50.9 |
| 3 | Shoot | 2:58.7 | 12.8s | 2:45.9 |
| 4 | Run | 3:18.4 | — | 3:18.4 |

   - "Shoot" column shows the shoot sub-timer duration for that lap. "—" for pure run laps.
   - "Run" column = Lap Time − Shoot Time (or the full lap time for run-only laps).
   - Collapsed by default; expands on tap/click.

3. **Trend Chart** — the existing time-over-time chart gains a **toggle** with three views:
   - **Overall Time** (default — existing behavior, plots `overallTimeSeconds`)
   - **Shoot Time** — plots `totalShootTimeSeconds` across competitions
   - **Run Time** — plots `totalRunTimeSeconds` across competitions

   This lets athletes and coaches see whether improvements are coming from faster shooting, faster running, or both.

4. **History Table** — each row in the competition history adds two new columns:

| Date | Competition | Overall Time | Shoot Time | Run Time | Points | Source |
|---|---|---|---|---|---|---|
| Feb 9, 2026 | Winter Open | 12:03.5 | 1:31.2 | 10:32.3 | 548 | Competition |
| Jan 15, 2026 | Training | 12:30.0 | 1:05.2 | 11:24.8 | 530 | Training |

   - Shoot Time and Run Time columns show "—" if the breakdown is not available for that entry.

##### Score Entry (Admin) — LaserRunEntry Component Updates

The `LaserRunEntry` component in the admin score-entry page (`/admin/competitions/[id]/score-entry`) adds:

- **Shoot Time** and **Run Time** columns in the score grid (read-only when auto-computed from volunteer timer data, editable for manual entry).
- For **mass start** events: an additional **Adjusted Time** column showing `overallTimeSeconds` − `handicapStartDelay`, with athletes ranked by adjusted time.
- An **expandable row** per athlete (click to expand) that shows the per-lap breakdown (lap time, shoot time, run time per lap) when volunteer timer data is available.
- **Manual override fields** for `totalShootTimeSeconds` and `totalRunTimeSeconds` — used when data was captured on paper or the volunteer system wasn't used.
- Auto-calculation: when an admin enters both overall time and total shoot time, the run time auto-fills as the difference.

##### Training Entry — New Laser Run Fields

Athletes logging laser run training via the `DisciplineDetailModal` training form gain new optional fields:

| Field | Type | Description |
|---|---|---|
| Overall Time | Text (existing, renamed) | Total time in MM:SS format |
| Total Shoot Time | Text (new) | Aggregate shoot time in M:SS.s format |
| Total Run Time | Text (new, auto-calculated) | Auto-fills as Overall Time − Shoot Time; editable for manual override |

Per-lap breakdown is **not** captured for training entries (too cumbersome for self-reporting). Only the aggregate shoot/run split is tracked.

#### 4.5.6 New API Routes for Target Assignment & Start Mode

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitions/[id]/laser-run-targets` | Get current target assignments + start mode config |
| `POST` | `/api/competitions/[id]/laser-run-targets` | Create/update target assignments (admin) |
| `POST` | `/api/competitions/[id]/laser-run-targets/release` | Release assignments with start mode + total laps to public + volunteers |

#### 4.5.7 New API Routes for Laser Run Timer Data

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/volunteer/laser-run/timer` | Submit complete timer data for an athlete (overall time + lap splits + shoot times) |
| `GET` | `/api/competitions/[id]/laser-run/[athleteId]/detail` | Get aggregated laser run detail for an athlete (per-lap breakdown) |
| `POST` | `/api/competitions/[id]/laser-run/aggregate` | Trigger server-side aggregation of shoot/run breakdown for all athletes in the event |

#### 4.5.8 New Admin Page

| Route | Description |
|---|---|
| `/admin/competitions/[id]/laser-run-targets` | Target assignment management view |

## 5. Data Verification Pipeline

### Three-Stage Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PRELIMINARY  │ ──> │   REVIEWED   │ ──> │   OFFICIAL   │
│  (Volunteer)  │     │  (Official)  │     │  (Confirmed) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
  Submitted by         Official compares      Score promoted
  volunteer via        digital vs paper       to official
  dashboard            records                score tables
```

### Admin Verification Interface

New section in the score-entry page: **"Pending Verification"** panel.

- Lists all `PreliminaryScore` records with status `preliminary` for the current event.
- Each entry shows: athlete name, volunteer name, submitted time/score, timestamp.
- Actions per entry:
  - **Verify** — promotes the preliminary score to the official score table (creates/updates the corresponding `SwimmingScore`, `FencingRankingScore`, etc.) and marks the `PreliminaryScore` as `verified`.
  - **Reject** — marks as `rejected` with a reason. The volunteer sees a notification that their entry was rejected and can resubmit.
  - **Correct & Verify** — allows the official to edit the value before promoting it. The `PreliminaryScore` is marked as `corrected` with both the original and corrected values preserved.
- **Bulk Verify** — select multiple entries and verify them all at once (useful after comparing against a paper sheet).
- **Print Comparison View** — side-by-side display of digital submissions vs. what the official has on paper, formatted to match standard paper forms.

### Audit Trail

Every verification action is logged in the `AuditLog`:
- Who verified/rejected/corrected
- Original value vs. corrected value
- Timestamp
- IP address

---

## 6. Preliminary Score Display

### Admin-Controlled Toggle

Each competition has a `showPreliminaryScores` boolean (default: `false`).

- **When enabled**: Public-facing pages (competition view, leaderboard, event results) show preliminary scores with a visual indicator.
- **When disabled**: Only verified/official scores appear publicly. Preliminary data is only visible to admins and the submitting volunteer.

### Visual Indicators

When preliminary scores are displayed publicly:

- A **banner** at the top of the page: "Scores shown are preliminary and subject to official verification."
- Individual preliminary scores have a subtle **dashed border** or **"P" badge** to distinguish them from verified scores.
- Once verified, the indicator disappears and the score appears as normal.
- The leaderboard/rankings show a note: "Rankings may change pending score verification."

---

## 7. Notification System

### In-App Notifications for Volunteers

Volunteers receive real-time notifications on their dashboard:

| Trigger | Message |
|---|---|
| Assignment created | "You've been assigned to Swimming — Lane 4 (Emma Richardson)" |
| Reassignment | "You've been reassigned to Swimming — Lane 6 (Sophie Tremblay)" |
| Event starting soon | "Swimming starts in 5 minutes" |
| Score verified | "Your time for Emma Richardson (1:23.45) has been verified" |
| Score rejected | "Your time for Emma Richardson was rejected: [reason]. Please resubmit." |
| Event completed | "Swimming event is now complete. Thank you!" |
| Target assignment released | "Target assignments released — Emma Richardson: Target 1, Wave 1" |
| Flagger assignment | "You've been assigned as a Flagger for Obstacle" |

### Implementation

- Use **Server-Sent Events (SSE)** or **polling** (every 5 seconds) from the volunteer dashboard.
- Notifications appear as a toast/banner at the top of the dashboard.
- A notification bell icon shows unread count.

### Admin Notifications

Admins receive notifications for:
- New volunteer connected (first visit to their link)
- Volunteer submitted a score (for real-time monitoring)
- Volunteer went offline (connection lost for >30 seconds)

---

## 8. API Routes

### Volunteer Management (Admin)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitions/[id]/volunteers` | List all volunteers for a competition |
| `POST` | `/api/competitions/[id]/volunteers` | Create a new volunteer |
| `PATCH` | `/api/competitions/[id]/volunteers/[vid]` | Update volunteer (name, status) |
| `DELETE` | `/api/competitions/[id]/volunteers/[vid]` | Revoke and delete volunteer |
| `POST` | `/api/competitions/[id]/volunteers/[vid]/assign` | Create/update a single assignment |
| `POST` | `/api/competitions/[id]/volunteers/auto-assign` | Auto-randomly assign all unassigned volunteers to open positions for a given event |
| `PATCH` | `/api/competitions/[id]/volunteers/assignments` | Batch update assignments (drag-and-drop reorder result) |
| `POST` | `/api/competitions/[id]/volunteers/launch` | Finalize and launch all current assignments (sends links, pushes to dashboards) |
| `POST` | `/api/competitions/[id]/volunteers/bulk` | Bulk create volunteers |
| `POST` | `/api/competitions/[id]/volunteers/revoke-all` | Revoke all volunteer access |

### Volunteer Dashboard (Volunteer-facing)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/volunteer/me` | Get current volunteer info + assignment (auth via token cookie) |
| `GET` | `/api/volunteer/assignment` | Get current assignment details (event, athletes, config) |
| `POST` | `/api/volunteer/scores` | Submit a preliminary score |
| `GET` | `/api/volunteer/notifications` | SSE endpoint for real-time notifications |

### Laser Run Target Assignment & Config (Admin)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitions/[id]/laser-run-targets` | Get current target assignments + start mode + total laps config |
| `POST` | `/api/competitions/[id]/laser-run-targets` | Create/update target assignments (input: target count, auto-ranks athletes) |
| `PATCH` | `/api/competitions/[id]/laser-run-targets` | Manually adjust assignments (drag-and-drop reorder) |
| `POST` | `/api/competitions/[id]/laser-run-targets/release` | Release assignments with start mode (staggered/mass) and total laps to public + volunteer dashboards |

### Laser Run Timer Data

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/volunteer/laser-run/timer` | Submit complete timer data for an athlete (overall time + lap splits + shoot times) |
| `GET` | `/api/competitions/[id]/laser-run/[athleteId]/detail` | Get aggregated laser run detail for an athlete (per-lap breakdown) |
| `POST` | `/api/competitions/[id]/laser-run/aggregate` | Trigger server-side aggregation of shoot/run breakdown for all athletes in the event |

### Obstacle Volunteer Recommendations (Admin)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitions/[id]/obstacle/recommend-flaggers` | Get recommended volunteers for flagger role (unassigned volunteers) |
| `POST` | `/api/competitions/[id]/obstacle/assign-flaggers` | Assign selected volunteers as flaggers and send access links |

### Score Verification (Admin/Official)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitions/[id]/preliminary-scores` | List preliminary scores (filterable by event, status) |
| `PATCH` | `/api/preliminary-scores/[id]/verify` | Verify a preliminary score |
| `PATCH` | `/api/preliminary-scores/[id]/reject` | Reject a preliminary score |
| `PATCH` | `/api/preliminary-scores/[id]/correct` | Correct and verify a preliminary score |
| `POST` | `/api/competitions/[id]/preliminary-scores/bulk-verify` | Bulk verify scores |

### Volunteer Page Routes

| Route | Description |
|---|---|
| `/volunteer/[accessToken]` | Volunteer entry point — sets cookie, redirects to dashboard |
| `/volunteer/dashboard` | Main volunteer dashboard (requires token cookie) |

### New Admin Page Routes

| Route | Description |
|---|---|
| `/admin/competitions/[id]/volunteers` | Volunteer management tab |
| `/admin/competitions/[id]/laser-run-targets` | Laser Run target assignment view (input target count, auto-assign, manual adjust, print, release) |

---

## 9. Security Considerations

### Access Control

- Volunteer tokens are 32-byte cryptographically random values (256 bits of entropy).
- Tokens are hashed (SHA-256) before storage in the database; the raw token only exists in the URL.
- Volunteers can **only** access: their own assignment, the athletes in their assignment, and the score submission endpoint.
- All volunteer API routes validate the token and check that the competition hasn't ended and the volunteer hasn't been revoked.

### Rate Limiting

- Score submissions: max 1 per second per volunteer (prevents accidental double-taps).
- API requests: max 60 per minute per volunteer token.

### Data Integrity

- Each `PreliminaryScore` records the `volunteerId` for accountability.
- Scores cannot be edited by volunteers after submission — they must be rejected by an official and resubmitted.
- All verification actions are logged in the audit trail.

### Link Security

- Access links should be sent over secure channels (HTTPS email, encrypted messaging).
- Links are single-use in the sense that the token is bound to one volunteer — sharing the link doesn't create additional volunteers.
- Admin can see "Last Active" timestamp to detect if a link is being used by someone unexpected.

---

## 10. Mobile UX Requirements

### General

- All volunteer dashboards are **mobile-first** and designed for **portrait orientation** on phones (320px–430px viewport width).
- Single-column stacked layouts only — no side-by-side panels or horizontal scrolling on any dashboard.
- Minimum touch target size: **48x48px** (accounts for outdoor use, gloves, wet fingers).
- High-contrast colors for outdoor visibility (bright sun conditions).
- Large timer font: minimum **48px** for the main time display.
- Haptic feedback on button taps (where supported by the device).

### Audio Feedback

All dashboards with timing or action buttons play a **distinct sound** on key presses so the volunteer gets immediate auditory confirmation without needing to look at the screen:

| Button | Sound | Description |
|---|---|---|
| **START** | Short high-pitched beep | Mimics a starting gun tone; confirms timer has begun |
| **STOP** | Double beep | Two quick tones confirm the main timer has stopped |
| **RUN LAP** | Quick click/tick | Confirms the run lap split was captured |
| **SHOOT LAP** | Quick click/tick | Confirms the shoot lap split was captured and shoot sub-timer started |
| **STOP SHOOT** | Double beep | Confirms the shoot sub-timer stopped and shoot time was recorded |
| **LAP** (other dashboards) | Quick click/tick | Confirms the split was captured |
| **CONFIRM** | Success chime | Ascending two-tone chime confirms data was submitted |
| **Yellow/Red Flag** | Low thud | Confirms flag was registered without being alarming |

**Implementation**:
- Sounds are played via the **Web Audio API** using pre-generated short audio buffers (no network requests at play time).
- Audio is routed through the **media audio channel** (not the ringer channel), so sounds play even when the device is in silent/vibrate mode.
- Sounds are loaded once when the dashboard page mounts and cached in memory.
- A **mute toggle** is available in the dashboard header for volunteers who prefer silent operation.

### Offline Resilience

- If the device loses connection, the dashboard continues to function locally.
- Timer keeps running (client-side).
- Submissions are queued in `localStorage` and auto-synced when connection returns.
- A visible "Offline — data will sync when connected" banner appears.
- Queued submissions show a "Pending upload" indicator.

### Performance

- Volunteer dashboard pages should be lightweight — no unnecessary JavaScript bundles.
- Target: < 100KB initial page load for the dashboard.
- Timer precision: use `performance.now()` for sub-millisecond accuracy on the client, but display and submit in hundredths of a second.

---

## 11. Implementation Phases

### Phase 1 — Foundation (Priority: High)
- [ ] Database schema: `Volunteer`, `VolunteerAssignment`, `PreliminaryScore` models
- [ ] Competition model updates: `showPreliminaryScores`, `volunteerAccessEnabled`
- [ ] Volunteer access link generation and token-based authentication
- [ ] Admin UI: Volunteer management tab (create, list, revoke)
- [ ] Admin UI: Auto-random-assignment system (random assign + drag-and-drop reorder + launch)
- [ ] Volunteer entry page (`/volunteer/[accessToken]`)

### Phase 2 — Swimming & Fencing Dashboards (Priority: High)
- [ ] Swimming timer dashboard (start/stop/lap/confirm flow)
- [ ] Fencing ranking referee dashboard (pool matrix, bout scoring)
- [ ] `PreliminaryScore` submission API
- [ ] Admin verification interface (verify/reject/correct)
- [ ] Score promotion pipeline (preliminary → official score tables)

### Phase 3 — Obstacle System (Priority: Medium)
- [ ] Obstacle 2-lane timer dashboard (Lane 1, Lane 2)
- [ ] Obstacle flagger dashboard (athlete confirmation, yellow/red flag tracking)
- [ ] Admin: flagger recommendation engine (suggest unassigned volunteers)
- [ ] Admin: one-click flagger assignment with auto-link delivery

### Phase 4 — Laser Run System (Priority: Medium)
- [ ] Database: Add `totalShootTimeSeconds`, `totalRunTimeSeconds`, `adjustedTimeSeconds`, `shootingDetail` columns to `LaserRunScore`
- [ ] Update `LaserRunInput` type and `laserRunEntry` validation schema (rename `finishTimeSeconds` → `overallTimeSeconds`, add `startMode`, `adjustedTimeSeconds`, and other new fields)
- [ ] Admin: Target Assignment view (`/admin/competitions/[id]/laser-run-targets`)
- [ ] Target count input + auto-assignment by rank (hooks into existing handicap system)
- [ ] Manual drag-and-drop reorder of target assignments
- [ ] Print view for target assignment sheet
- [ ] Release flow: start mode selection prompt (Staggered Start / Mass Start) + total laps input before releasing
- [ ] System adjustments for staggered vs. mass start (dashboard display, scoring logic, leaderboard)
- [ ] Laser Run volunteer timer dashboard (main timer + START/STOP, RUN LAP, SHOOT LAP buttons)
- [ ] Shoot sub-timer (50s max, auto-stop, appears inline on SHOOT LAP, disappears on STOP SHOOT)
- [ ] Lap counter (Lap X of Y, updates on each RUN LAP / SHOOT LAP)
- [ ] Timer submission API (`POST /api/volunteer/laser-run/timer`)
- [ ] Server-side aggregation: compute per-lap breakdown (lap time, shoot time, run time per lap), totals, and adjusted time (mass start)
- [ ] Admin score-entry: add Shoot Time / Run Time columns (+ Adjusted Time for mass start) to `LaserRunEntry` grid
- [ ] Admin score-entry: expandable per-athlete row showing per-lap breakdown
- [ ] Admin score-entry: manual override fields for shoot/run times (paper fallback)
- [ ] Athlete dashboard: update PB card to show shoot/run split alongside overall time
- [ ] Athlete dashboard: update `DisciplineDetailModal` with summary bar, per-lap breakdown, and trend chart toggle (Overall / Shoot / Run)
- [ ] Athlete dashboard: update history table with Shoot Time and Run Time columns
- [ ] Training entry: add optional Total Shoot Time and auto-calculated Total Run Time fields

### Phase 5 — Remaining Disciplines (Priority: Medium)
- [ ] Fencing DE referee dashboard
- [ ] Riding judge dashboard (course timer, fault counters, live score calculation)

### Phase 6 — Real-Time & Polish (Priority: Medium)
- [ ] In-app notification system (SSE or polling)
- [ ] Preliminary score public display with admin toggle
- [ ] Offline resilience (localStorage queue, auto-sync)
- [ ] Print comparison view for verification
- [ ] Quick-reassign panel for event-day admin use (drag-and-drop swap)
- [ ] Bulk volunteer creation
- [ ] Audio feedback system (Web Audio API: distinct sounds for START, STOP, RUN LAP, SHOOT LAP, STOP SHOOT, LAP, CONFIRM, flags)
- [ ] Mute toggle in dashboard header

### Phase 7 — Hardening (Priority: Lower)
- [ ] Rate limiting on volunteer endpoints
- [ ] Token hashing (SHA-256) for stored tokens
- [ ] Comprehensive audit logging for all volunteer actions
- [ ] Performance optimization for dashboard page weight
- [ ] Cross-device testing (iOS Safari, Android Chrome, various screen sizes)

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Access link expiry | When competition ends | Simplest model; no need for volunteers to access data after the event |
| Volunteer assignment | Auto-random-assign + admin drag-and-drop reorder before launch | Saves admin time vs. manual one-by-one assignment; admin retains full control via drag-and-drop before launching |
| Multi-athlete assignment | Depends on discipline | Fencing refs need a pool; swim timers need one lane |
| Preliminary score visibility | Admin-controlled per competition | Different competitions have different tolerance for showing unverified data |
| Notification delivery | In-app (SSE/polling) | No need for push notifications; volunteers are actively using the app |
| Offline handling | localStorage queue with auto-sync | Competitions may be in areas with spotty connectivity |
| Obstacle lane count | Fixed at 2 lanes | Matches real-world obstacle course setup |
| Obstacle flaggers | System randomly recommends from unassigned volunteer pool | Reduces admin workload on event day; flaggers don't need to be pre-planned |
| Laser Run target assignment | Auto-assign by rank, admin can manually adjust | Follows UIPM convention (top-ranked athlete gets target 1); manual override for edge cases |
| Laser Run handicap display | Pull from existing handicap system; hidden in mass start mode | No duplication of logic; single source of truth for start times |
| Laser Run start mode | Admin selects staggered or mass start at release time; locked once released | Staggered = real-world handicap starts, first to finish wins. Mass = all start together, handicap applied mathematically after. Both are common in pentathlon. |
| Laser Run timer design | Main timer + RUN LAP / SHOOT LAP buttons; SHOOT LAP spawns a 50s sub-timer | One volunteer per athlete captures everything with minimal buttons. Shoot times stored in background (not displayed) to reduce clutter. All derived stats computed server-side. |
| Laser Run shoot sub-timer | 50s max, auto-stops at limit | Matches the real-world 50-second shooting window rule; prevents invalid data |
| Laser Run lap counter | Shows "Lap X of Y" from admin-configured total laps | Volunteers need to know how many laps remain; total set by admin at release time |
| Audio feedback on actions | Web Audio API with distinct sounds per action type | Gives volunteers immediate auditory confirmation without needing to look at screen; critical for outdoor/timing scenarios |
| All layouts | Mobile-first, single-column portrait (320px–430px) | Volunteers will be using phones at the venue; no desktop layout needed for volunteer dashboards |
