# 🎯 Mission Board

A real-time party/team game web app where players are each secretly assigned a mission, and everyone tries to guess each other's missions. Admins manage assignments and evaluate guesses through a separate portal.

## ✨ Features

- **Player flow** — join with your real name & nickname, view your mission, guess other players' missions
- **Real-time updates** — Supabase Realtime keeps scores and guess results in sync across all devices
- **Dashboard** — live leaderboard with points for correct/half-correct guesses and speed bonuses
- **Admin portal** — separate password-protected routes at `/#/portal` to manage missions and evaluate guesses. Default password is `12345678`. 

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 (hash router) |
| Backend / DB | [Supabase](https://supabase.com) (Postgres + Realtime) |
| Auth | Custom localStorage-based session (no Supabase Auth) |
| Icons | Lucide React |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier works fine)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/mission-board.git
cd mission-board
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Find these in your Supabase dashboard under **Project Settings → API**.

### 4. Set up the Supabase database

Run the following SQL in your Supabase project's **SQL Editor** to create the three required tables:

```sql
-- Profiles (players)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  real_name text not null,
  nickname text not null unique,
  password_hash text,
  created_at timestamptz default now()
);

-- Tasks (missions assigned to each player)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_text text not null,
  is_completed boolean default false,
  completed_at timestamptz
);

-- Guesses (one guess per player per target)
create table guesses (
  id uuid primary key default gen_random_uuid(),
  guesser_id uuid references profiles(id) on delete cascade,
  guessed_user_id uuid references profiles(id) on delete cascade,
  guessed_task_text text not null,
  is_correct boolean,
  is_half_correct boolean,
  created_at timestamptz default now(),
  unique(guesser_id, guessed_user_id)
);
```

Then run the RLS + Realtime setup from [`supabase_rls_setup.sql`](./supabase_rls_setup.sql):

```sql
-- Disable RLS (app uses localStorage identity, not Supabase Auth)
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles disable row level security;
alter table tasks disable row level security;
alter table guesses disable row level security;

-- Enable Realtime
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table guesses;
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── Navbar.tsx               # Player bottom/top nav
│   ├── ProtectedRoute.tsx       # Player auth guard
│   └── AdminProtectedRoute.tsx  # Portal auth guard (shows 404 if locked)
├── contexts/
│   ├── PlayerContext.tsx        # Player session (localStorage)
│   └── AdminContext.tsx         # Admin unlock state + password helpers
├── pages/
│   ├── Login.tsx                # Player join screen
│   ├── Dashboard.tsx            # Leaderboard
│   ├── Profile.tsx              # My mission
│   ├── Guess.tsx                # Guess other players' missions
│   └── portal/
│       ├── PortalLayout.tsx     # Admin portal navbar wrapper
│       ├── PortalSettings.tsx   # Login gate + Change Password + Danger Zone
│       ├── MissionAssignment.tsx # Edit & complete missions
│       └── GuessEvaluation.tsx  # Evaluate player guesses
└── lib/
    └── supabase.ts              # Supabase client + shared types
```

---

## 🔐 Admin Portal

The admin portal lives at `/#/portal` and is completely separate from the player app.

| Route | Description |
|---|---|
| `/#/portal` | Login gate → Settings (Change Password, Danger Zone) |
| `/#/portal/mission_assignment` | Assign / edit / complete missions |
| `/#/portal/guess_evaluation` | Evaluate player guesses (correct / half / incorrect) |

> **Default admin password:** `12345678`
> Change it any time from the **Settings** page inside the portal. The password is stored in your browser's `localStorage` — it persists across sessions but is per-device.

The sub-routes (`/mission_assignment`, `/guess_evaluation`) return a **404** to anyone who hasn't logged in.

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## 🎮 Scoring

| Event | Points |
|---|---|
| Correct guess | +2 |
| Half-correct guess | +1 |
| complete mission | +5 |
| 1st to complete mission | +3 (speed bonus) |
| 2nd to complete mission | +2 (speed bonus) |
| 3rd to complete mission | +1 (speed bonus) |


---

## 📝 Notes

- **No Supabase Auth** — players are identified by a UUID stored in `localStorage`. This is intentional for a simple party-game flow with no email/password signup.
- **Admin password** is client-side only (stored in `localStorage`). This is suitable for a casual internal tool; do not use this pattern for sensitive production apps.
- The app uses a **hash router** (`/#/...`) so it can be deployed to any static host without server-side routing configuration.
