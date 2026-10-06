# Better Bettor — Fantasy Sports Betting MVP

A mobile-first social fantasy sports betting platform where friends compete using virtual bankrolls.

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | React 18 + Vite     |
| Backend  | Supabase (Postgres + Auth + Realtime) |
| Hosting  | Vercel              |

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


