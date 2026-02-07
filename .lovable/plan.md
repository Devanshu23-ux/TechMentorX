

# ScholarGuard AI - Implementation Plan

## Overview
A centralized AI-powered educational monitoring platform that transforms fragmented student data into real-time learning intelligence. The system will help educators identify at-risk students early, understand qualitative learning behaviors through AI sentiment analysis, and generate personalized intervention plans.

---

## 🎨 Design System
- **Style**: Modern SaaS with Glassmorphism effects
- **Primary Color**: Navy (#1E3A8A)
- **Accent**: Electric Blue (#3B82F6)
- **Status Colors**: Emerald (success), Amber (warning), Red (alerts)
- **Components**: Shadcn/UI with glass-effect cards and subtle animations

---

## 👥 User Roles & Permissions

### Admin
- Full access to all dashboards and data
- Manage teachers and students
- View system-wide analytics and alerts
- Configure AI settings

### Teacher
- View their assigned students' data
- Access AI Auditor for their classes
- Generate intervention plans
- View class-level analytics

### Student
- View personal progress dashboard
- See their own scores, attendance, and well-being trends
- Access personalized AI feedback
- No access to other students' data

---

## 📱 Core Pages

### 1. Authentication Page (/auth)
- Clean login/signup forms with role-based redirection
- Email/password authentication via Supabase Auth
- Automatic routing based on user role after login

### 2. Executive Dashboard (/ - Admin/Teacher view)
**KPI Cards Row:**
- Total Students (count with trend indicator)
- Average Sentiment Score (AI-calculated from comments)
- High-Risk Alerts (red glow effect, count of flagged students)
- Overall Engagement Rate (attendance-based %)

**Visualizations:**
- **Performance vs. Well-being Scatter Plot** - X-axis: Total Score, Y-axis: Stress Level, color-coded by sentiment
- **Engagement Heatmap** - Grid showing departmental/class attendance trends over time

**Quick Actions:**
- View flagged students
- Generate class report
- Navigate to AI Auditor

### 3. AI Qualitative Auditor (/auditor - Admin/Teacher view)
**Layout:**
- **Sidebar**: List of flagged students with severity badges
- **Main Area**: Audit Card for selected student

**Audit Card Features:**
- Student profile with key metrics
- Latest comment displayed in stylized blockquote
- AI Sentiment Badge (Frustrated/Neutral/Motivated)
- Identified learning gaps (topics where AI detected confusion)
- "Generate Intervention" button → Shows loading skeleton → Reveals personalized support plan

**AI-Generated Support Plan:**
- Mental health recommendations
- Academic focus areas
- Suggested resources
- Communication tips for teachers

### 4. Student Insights Explorer (/students - Admin/Teacher view)
**Data Table Features:**
- Searchable/filterable student list
- Columns: Name, Department, GPA, Attendance %, Sentiment Badge, Last Comment Preview
- Sortable by any column
- Bulk actions (export, flag, assign)

**Student Detail Modal (on row click):**
- Full profile information
- **Skill Development Radar Chart** - Visual of competency across subjects/skills
- Historical performance trends
- AI-generated summary of learning patterns

### 5. Student Portal (/my-progress - Student view)
- Personal performance trends (line chart)
- Current GPA and attendance stats
- Recent AI feedback on their submissions
- Well-being check-in prompt (optional self-reporting)

---

## 🗄️ Database Schema (Supabase)

**Tables:**
1. **profiles** - User profiles linked to auth
2. **user_roles** - Role assignments (admin/teacher/student)
3. **departments** - Academic departments
4. **students** - Student records with academic data
5. **student_scores** - Individual test/assignment scores
6. **student_attendance** - Attendance records with dates
7. **student_wellbeing** - Stress, sleep, and well-being metrics
8. **student_comments** - Written feedback/journal entries
9. **ai_analyses** - Cached sentiment analyses and intervention plans
10. **teacher_assignments** - Links teachers to their students/classes

**Security:**
- Row-Level Security on all tables
- Secure helper functions for role checking
- Teachers can only access their assigned students
- Students can only view their own data

---

## 🤖 AI Features (Lovable AI / Gemini)

### Sentiment Analysis Edge Function
- Processes student comments
- Returns: sentiment score (0-100), mood classification, detected keywords, topic gaps
- Automatic flagging based on negative sentiment or concern keywords

### Intervention Generator Edge Function
- Takes student profile + recent data + sentiment analysis
- Returns: Personalized support plan with mental health tips, academic focus areas, and suggested actions

### Early Gap Detection
- Automatically flags students whose comments contain: "struggle," "confused," "fail," "lost," "overwhelmed," etc.
- Flags regardless of current grades (catches "silent strugglers")

---

## 🔄 Data Flow

1. **Student data entry** → Manual or bulk import via admin
2. **Comment submission** → Triggers AI sentiment analysis
3. **Automatic flagging** → Based on sentiment + keyword detection
4. **Teacher review** → Via AI Auditor page
5. **Intervention generation** → On-demand AI support plan
6. **Progress tracking** → Historical data visualized in charts

---

## 📊 Key Visualizations (Recharts)

1. **Scatter Plot** - Performance vs. Well-being correlation
2. **Heatmap** - Engagement/attendance patterns
3. **Radar Chart** - Individual skill development
4. **Line Charts** - Trend analysis over time
5. **Bar Charts** - Comparative performance metrics

---

## 🚀 Implementation Phases

**Phase 1: Foundation**
- Design system setup (colors, glassmorphism effects)
- Database schema and RLS policies
- Authentication with role-based routing

**Phase 2: Core Dashboard**
- Executive Dashboard with all KPIs
- Performance vs. Well-being Scatter Plot
- Engagement Heatmap

**Phase 3: AI Integration**
- Sentiment analysis edge function
- Intervention generator edge function
- Integration with Lovable AI

**Phase 4: Feature Pages**
- AI Qualitative Auditor
- Student Insights Explorer with detail modals
- Student Portal

**Phase 5: Polish**
- Animations and transitions
- Responsive design optimization
- Error handling and loading states

