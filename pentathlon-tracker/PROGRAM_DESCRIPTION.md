# Pentathlon Tracker

## Overview

**Pentathlon Tracker** is a comprehensive web-based management system designed for organizing, scoring, and tracking Modern Pentathlon competitions. It provides tools for administrators, officials, and athletes to manage competitions, enter scores, view results, and track performance across all five pentathlon disciplines.

The application is built with modern web technologies and offers a clean, intuitive interface for seamless competition management.

---

## Purpose & Mission

The Pentathlon Tracker aims to:
- **Streamline competition management** - Simplify the organization of Modern Pentathlon events
- **Automate scoring** - Provide accurate, real-time score calculations based on UIPM rules
- **Enhance accessibility** - Allow athletes to view their performance and results
- **Support officials** - Give competition officials and administrators powerful tools for data entry and management
- **Track performance** - Maintain historical competition data and athlete statistics

---

## Key Features

### 1. **Competition Management**
- Create and manage multiple competitions with configurable parameters
- Set competition dates, locations, and age categories
- Define competition types (individual, relay, team)
- Track competition status (upcoming, active, completed)
- Support for multiple age categories per competition: Masters, Junior, U19, U17, U15, U13, U11, U9

### 2. **Athlete Management**
- Register athletes with personal information (name, country, gender, age category, club)
- Link athletes to user accounts for secure login
- Support for both registered athletes (with accounts) and DOB-based athlete login
- Track athlete participation across competitions
- Manage athlete profiles with comprehensive personal data

### 3. **Discipline Scoring**

The system supports all five Modern Pentathlon disciplines with automatic score calculation:

#### **Fencing Ranking**
- Track victories and total bouts
- Automatic points calculation based on victory percentage
- Dynamic threshold calculations based on athlete count
- Support for both male and female competitors

#### **Fencing Directé Élimination (DE)**
- Track placement in elimination bracket
- Automatic point conversion
- Gender-specific bracket management
- Visual bracket view for easy tracking

#### **Obstacle Course (Equestrian)**
- Record time in seconds
- Penalty point tracking
- Automatic handicap calculation
- Base time scoring with penalty adjustments

#### **Swimming (200m)**
- Time entry in MM:SS.hh format (minutes:seconds.hundredths)
- Separate scoring for youth (U9, U11 - 50m) and senior categories
- Seeding system for organized heat assignments
- Automatic heat generation and management
- Penalty point tracking

#### **Laser Run**
- Combined shooting and running event
- Finish time tracking
- Handicap start delay management
- Shooting station assignments (A, B, P gates)
- Penalty seconds calculation
- Start line configuration (pack start vs. individual start)

#### **Riding (Equestrian)**
- Track penalties: knockdowns, disobediences, time over, other infractions
- Automatic point calculation based on UIPM rules
- Support for all penalty types

### 4. **Score Entry Interface**
- **All Events Grid** - View and edit all disciplines for all athletes in one sheet
- **Discipline-Specific Sheets** - Dedicated entry forms optimized for each discipline
- **Auto-save functionality** - Changes are automatically saved as you work
- **Real-time point calculation** - See calculated points instantly
- **Keyboard navigation** - Navigate between cells with arrow keys and Enter
- **Large, readable data fields** - Optimized column widths for easy visibility
- **Print-friendly layouts** - Export sheets for physical records

### 5. **Results & Leaderboards**
- Real-time results display sorted by points
- Category-specific leaderboards
- Gender-specific filtering
- Live competition feed showing recent scores
- Final results with placement rankings
- Points breakdown by discipline

### 6. **User Authentication & Authorization**
- Role-based access control (Admin, Official, Athlete)
- Admin account with full system access
- Official accounts for designated scorekeepers
- Athlete accounts with secure DOB-based login option
- Session management with secure cookies
- Password-protected access

### 7. **Administrative Tools**
- User management dashboard
- Role assignment and modification
- Settings and configuration management
- Bulk data operations
- Data wipe functionality for resetting competitions and athletes
- Competition status controls (upcoming → active → completed)

### 8. **Public Features**
- Browse all competitions without login
- View athlete directory with filtering
- Access public competition details
- View leaderboards and results
- Search functionality for competitions and athletes

---

## Technical Stack

### Frontend
- **Next.js 16** - React framework with SSR and API routes
- **React 19** - Modern UI component library
- **TypeScript** - Type-safe JavaScript for reliability
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Beautiful, consistent icon set
- **SWR** - Data fetching with caching and revalidation
- **Framer Motion** - Smooth animations and transitions

### Backend & Database
- **Next.js API Routes** - Serverless backend functions
- **Prisma ORM** - Database abstraction and migration tool
- **SQLite** - Lightweight, file-based database
- **bcryptjs** - Secure password hashing
- **NextAuth 5** - Authentication and session management

### Development
- **ESLint** - Code quality and consistency
- **TypeScript** - Static type checking
- **Tailwind CSS Postcss** - CSS processing

---

## User Roles & Permissions

### Admin
- Full system access
- User management (create, modify, delete users)
- Competition creation and editing
- Score entry for all competitions
- Results viewing and modification
- Settings access
- Data wipe capability
- User role assignment

### Official
- Score entry for assigned competitions
- Results viewing
- Competition status management
- Limited to official duties only

### Athlete
- View personal profile
- View personal competition results
- Browse public competitions
- View leaderboards (where allowed)
- Optional: Manual score input for training

### Public (Not Logged In)
- Browse competitions
- View athlete directory
- Access public leaderboards
- Search competitions

---

## Database Schema

The application uses a relational database with the following main entities:

### **Users**
- Authentication and role management
- Admin, Official, and Athlete accounts
- Secure password storage with hashing

### **Athletes**
- Personal information (name, country, gender, age category, club)
- Optional link to user account
- Participation tracking across competitions

### **Competitions**
- Event details (name, date, location, status)
- Age category configuration
- Competition type (individual/relay/team)
- Associated events and athletes

### **Events**
- Discipline-specific events within competitions
- Status tracking (pending, in_progress, completed)
- Scheduled times and configuration

### **Scores**
- Discipline-specific score tables:
  - FencingRankingScore
  - FencingDEScore
  - ObstacleScore
  - SwimmingScore
  - LaserRunScore
  - RidingScore
- Raw data and calculated points
- Timestamps for audit trail

### **Training Entries**
- Manual athlete score tracking
- Optional training data input
- Flexible discipline-specific fields

---

## Core Functionality Workflows

### Creating a Competition
1. Admin navigates to competitions
2. Creates new competition with details (name, dates, location, age categories)
3. System automatically generates event slots for each discipline
4. Adds athletes to competition
5. Optionally assigns seeding and handicaps

### Entering Scores
1. Official navigates to Score Entry
2. Selects competition
3. Filters by gender and age category
4. Chooses specific discipline or views all events
5. Enters raw scores (times, placements, penalties)
6. System automatically calculates points
7. Changes auto-save; can manually save all at once

### Viewing Results
1. User navigates to competition results
2. Filters by category and gender
3. Views leaderboard with point totals
4. Can see point breakdown by discipline
5. Export or print results as needed

---

## Age Categories Supported

The system recognizes the following age categories (displayed in priority order):
- **Masters** - Older athletes
- **Junior** - Young adults
- **U19** - Under 19
- **U17** - Under 17
- **U15** - Under 15
- **U13** - Under 13
- **U11** - Under 11
- **U9** - Under 9

Each category can have different scoring parameters, especially for swimming and laser run.

---

## Scoring System

### Automatic Point Calculation
The application automatically calculates points based on UIPM (Union Internationale de Pentathlon Moderne) rules:
- Each discipline has a base standard (e.g., 1:10.00 = 250 points in swimming)
- Points increase or decrease based on deviation from the standard
- Penalty points are deducted for infractions
- Final competition score is sum of all discipline points

### Swimming Times
- **Format**: MM:SS.hh (e.g., 1:23.45)
- **Youth (U9, U11)**: 50m base time 0:45.00 = 250 pts
- **Senior categories**: 100m base time 1:10.00 = 250 pts
- **Scoring**: 0.50s per point for youth, 0.20s per point for seniors

### Fencing
- **Ranking**: Points based on victory percentage
- **DE**: Points based on placement in elimination bracket

---

## User Interface Features

### Navigation
- **Sidebar** - Quick access to main sections (Home, Competitions, Athletes)
- **Admin Panel** - Dedicated admin navigation for management tasks
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Mobile Drawer** - Collapsible navigation on smaller screens

### Data Display
- **Search & Filter** - Find competitions and athletes quickly
- **Status Badges** - Visual indicators for competition status
- **Category Tags** - Quick view of age categories and competition types
- **Icon Integration** - Lucide icons for intuitive navigation

### Data Entry
- **Spreadsheet-style Interface** - Familiar grid layout for score entry
- **Real-time Validation** - Immediate feedback on data entry
- **Keyboard Navigation** - Tab, Enter, and arrow keys for efficiency
- **Auto-save** - Never lose data with automatic saving
- **Print Functionality** - Export sheets for backup or physical records

---

## Security Features

- **Password Hashing** - bcryptjs for secure password storage
- **Session Management** - Secure cookie-based sessions
- **Role-Based Access Control** - Different features for different user types
- **Authentication Checks** - API endpoints verify user authorization
- **Data Isolation** - Users see only authorized data

---

## Getting Started for Users

### For Administrators
1. Log in with admin credentials
2. Navigate to Admin → Users to manage staff
3. Create competitions in Admin → Competitions
4. Add athletes to competitions
5. Use Score Entry to input results
6. View final results in Results section

### For Officials/Scorekeepers
1. Log in with official credentials
2. Go to Score Entry
3. Select the competition to score
4. Enter scores for each discipline
5. Use the various sheets (All Events, Fencing Ranking, Swimming, etc.)
6. Auto-save handles data persistence

### For Athletes
1. Log in with athlete credentials or use DOB-based login
2. View My Profile to see personal information
3. Browse Competitions to find events
4. View results to see personal performance
5. Check leaderboards to see standings

---

## Data Management

### Backup & Recovery
- Database stored locally in SQLite
- Regular backups recommended
- Manual export of results available

### Resetting Data
- Admin can wipe all competitions and athletes
- Confirmation required to prevent accidents
- Instant cleanup of all related data

---

## Future Enhancement Possibilities

- Real-time live feed improvements
- Mobile app version
- Advanced analytics and statistics
- Team competition support
- International competition standards
- API for external integrations
- Advanced reporting tools
- Bulk import/export functionality

---

## Support & Documentation

For issues or questions:
- Check competition status indicators
- Review role permissions
- Verify data entry format matches requirements
- Use search functionality to find competitions or athletes
- Contact administrator for access issues

---

## Version Information

- **Application**: Pentathlon Tracker v0.1.0
- **Framework**: Next.js 16
- **Database**: Prisma ORM with SQLite
- **UI Framework**: React 19 with Tailwind CSS 4

---

**Pentathlon Tracker** - Simplifying Modern Pentathlon Competition Management
