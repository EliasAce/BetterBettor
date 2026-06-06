# Chalk — Fantasy Sports Betting MVP

A mobile-first social fantasy sports betting platform where friends compete using virtual bankrolls.

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | React 18 + Vite     |
| Backend  | Supabase (Postgres + Auth + Realtime) |
| Hosting  | Vercel              |

---

## Local Setup (5 steps)

### 1. Clone & install dependencies
```bash
git clone <your-repo-url>
cd chalk
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and open your project
2. Navigate to **SQL Editor**
3. Paste and run the entire contents of `supabase_schema.sql`
   - This creates all tables, RLS policies, and seeds mock games

### 3. Add your environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
Find both values at: **Supabase Dashboard → Settings → API**

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

### 5. Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Add your two env vars in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## Project Structure

```
src/
├── components/
│   ├── Header.jsx       # Top bar with logo + avatar (tap to sign out)
│   ├── BottomNav.jsx    # 4-tab navigation
│   └── Toast.jsx        # Toast notification system
├── hooks/
│   └── useAuth.jsx      # Auth context (session, profile, signIn, signUp, signOut)
├── lib/
│   ├── supabase.js      # Supabase client
│   └── utils.js         # fmtMoney, calcPayout, fmtOdds, etc.
├── pages/
│   ├── AuthPage.jsx     # Login / Signup
│   ├── DashboardPage.jsx  # Bankroll banner + leaderboard + feed
│   ├── BetPage.jsx      # Browse games + bet slip + confirm modal
│   ├── MyBetsPage.jsx   # Active + settled bets
│   └── LeaguePage.jsx   # Create/join leagues + invite code
├── App.jsx              # Router + auth guard
├── main.jsx             # Entry point
└── index.css            # Global styles + design tokens
supabase_schema.sql      # Run once in Supabase SQL Editor
```

---

## Database Tables

| Table            | Purpose                                      |
|------------------|----------------------------------------------|
| `profiles`       | Extends Supabase auth.users with username    |
| `leagues`        | League settings, invite code, duration       |
| `league_members` | Per-user balance within each league          |
| `games`          | Mock/seeded game data with odds              |
| `bets`           | Individual bets placed by users              |

---

## Adding Real Sports Data

Replace the seeded games in `supabase_schema.sql` with a cron job or edge function that pulls from a sports odds API:

- **The Odds API** (free tier: 500 req/month) — `https://the-odds-api.com`
- **SportsDataIO** — more detailed, paid
- **ESPN API** (unofficial) — game scores and schedules

Create a Supabase Edge Function to fetch and upsert games on a schedule.

---

## Settling Bets (Manual for MVP)

For MVP, settle bets manually via the Supabase Dashboard → Table Editor:
1. Update `games.status` to `'final'` and set `games.winner` to `'home'` or `'away'`
2. Update matching `bets.status` to `'won'` or `'lost'`
3. For won bets, update `league_members.balance` to add the payout

To automate this, create a Supabase Database Function triggered when `games.status` changes to `'final'`.

---

## Roadmap (Post-MVP)

- [ ] Parlay bet builder (combine 2+ picks)
- [ ] Push notifications when bets settle
- [ ] Auto-settle bets via edge function + sports API
- [ ] Public leagues / discovery
- [ ] Premium league tiers (longer duration, higher stakes)
- [ ] User stats page (ROI, win streak, etc.)
