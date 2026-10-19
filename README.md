# Customer Support Ticket System

A modern customer support desk application built with **Next.js 14 (App Router)**, **TypeScript**, and **Supabase (PostgreSQL)**, featuring SLA compliance tracking, multi-tier priorities, and internal staff collaboration.

---

## Features

- **Ticket Lifecycle Management**: Status transitions (`open` → `in_progress` → `resolved` → `closed`) with validation enforcing workflow rules.
- **Priority-Based SLA Tracking**: Automated due date calculations and live breach alerts tailored to severity levels:
  - `Urgent`: 2 hours SLA
  - `High`: 8 hours SLA
  - `Medium`: 24 hours SLA
  - `Low`: 48 hours SLA
- **Dual-Channel Comment Threads**: Public customer responses alongside staff-only internal notes.
- **Supabase PostgreSQL Schema & RLS**: Complete SQL migration scripts (`supabase/migrations/`) featuring Row-Level Security policies restricting customer data access while empowering support staff.
- **Stand-In In-Memory Engine**: Enables local development, CI testing, and automated test runs out of the box without requiring remote Supabase credentials.

---

## Project Structure

```text
customer-support-tickets/
├── src/
│   ├── app/
│   │   ├── globals.css           # Styling with responsive design tokens
│   │   ├── layout.tsx            # Root layout and metadata
│   │   └── page.tsx              # Interactive ticket desk & dashboard
│   ├── lib/
│   │   ├── sampleData.ts         # Synthetic support users and demo tickets
│   │   ├── supabase.ts           # Supabase client connector
│   │   └── ticketService.ts      # Core business logic, SLA, and workflow engine
│   └── types/
│       └── ticket.ts             # Strict TypeScript definitions
├── supabase/
│   └── migrations/
│       └── 20261019_init_support_system.sql  # Production PostgreSQL DDL & RLS
├── tests/
│   └── ticketService.test.ts     # Automated unit tests using native Node.js test runner
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm 9+

### 2. Installation

```bash
cd customer-support-tickets
npm install
```

### 3. Environment Configuration

Copy the sample environment file:
```bash
cp .env.example .env.local
```

For production, supply your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
```
*Note: If left unconfigured, the application gracefully operates using the built-in local store with sample data.*

### 4. Database Setup (Supabase)

If deploying to Supabase:
1. Navigate to the SQL Editor in your Supabase dashboard.
2. Run the migration script located at `supabase/migrations/20261019_init_support_system.sql`.
3. The tables (`profiles`, `tickets`, `ticket_comments`, `ticket_audit_logs`) and RLS policies will be created automatically.

### 5. Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the support dashboard.

---

## Automated Tests

Run the unit test suite:

```bash
npm test
```

Tests cover:
- Ticket listing and multi-criteria filtering
- Title and description validation
- Priority-based SLA calculation and breach detection
- State transitions (resolving, reopening restrictions)
- Public vs internal thread comment segregation

---

## Security Considerations

1. **Row Level Security (RLS)**: Crucial for multi-tenant customer separation. The schema ensures customers can only query and mutate their own tickets.
2. **Internal Note Privacy**: Comments flagged with `is_internal = true` are strictly filtered by RLS policies so customers cannot view confidential internal discussions.
3. **Environment Secrets**: Never commit `.env.local` containing secret keys or service role tokens.

---

## Known Limitations

- **Email Ingestion**: Currently operates via UI submissions; inbound email parsing (e.g. SendGrid / Postmark inbound webhooks) requires external webhook configuration.
- **File Attachments**: Ticket attachments currently link to URLs; S3/Supabase Storage bucket upload integration is prepared in schema but disabled by default in demo mode.
