import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
  'icehockey_nhl',
  'mma_mixed_martial_arts',
]

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    let totalSettled = 0
    const log: string[] = []

    for (const sportKey of SPORTS) {
      // Fetch scores for completed games in the last 3 days
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
      )

      if (!res.ok) {
        log.push(`Failed to fetch scores for ${sportKey}: ${res.status}`)
        continue
      }

      const scores = await res.json()

      // Only process completed games
      const completedGames = scores.filter((g: any) => g.completed && g.scores)

      for (const completedGame of completedGames) {
        // Find this game in our games table
        const { data: dbGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', completedGame.id)
          .single()

        // Skip if game not in our db or already marked final
        if (!dbGame || dbGame.status === 'final') continue

        // Determine winner from scores
        const homeScore = completedGame.scores?.find(
          (s: any) => s.name === completedGame.home_team
        )
        const awayScore = completedGame.scores?.find(
          (s: any) => s.name === completedGame.away_team
        )

        if (!homeScore || !awayScore) continue

        const homePoints = parseFloat(homeScore.score)
        const awayPoints = parseFloat(awayScore.score)
        const winner = homePoints > awayPoints ? 'home' : 'away'

        log.push(`${completedGame.home_team} vs ${completedGame.away_team}: ${homePoints}-${awayPoints}, winner: ${winner}`)

        // Mark game as final
        await supabase
          .from('games')
          .update({ status: 'final', winner })
          .eq('id', completedGame.id)

        // Find all active bets on this game
        const { data: activeBets } = await supabase
          .from('bets')
          .select('*')
          .eq('game_id', completedGame.id)
          .eq('status', 'active')

        if (!activeBets || activeBets.length === 0) continue

        for (const bet of activeBets) {
          // Determine if bet won based on bet_type and winner
          let betWon = false

          if (bet.bet_type === 'ml_home') {
            betWon = winner === 'home'
          } else if (bet.bet_type === 'ml_away') {
            betWon = winner === 'away'
          } else if (bet.bet_type === 'spread_home') {
            // Home team must win by more than the spread
            const spread = dbGame.spread_home // negative means home favored
            betWon = (homePoints - awayPoints) > Math.abs(spread)
              ? spread < 0  // home favored, need to cover
              : spread > 0  // home underdog, just need to win or lose by less
            // Simpler: home score + spread > away score
            betWon = (homePoints + dbGame.spread_home) > awayPoints
          } else if (bet.bet_type === 'spread_away') {
            betWon = (awayPoints + dbGame.spread_away) > homePoints
          }

          // Update bet status
          await supabase
            .from('bets')
            .update({ status: betWon ? 'won' : 'lost' })
            .eq('id', bet.id)

          // If won, add payout to league_member balance
          if (betWon) {
            const { data: member } = await supabase
              .from('league_members')
              .select('balance')
              .eq('user_id', bet.user_id)
              .eq('league_id', bet.league_id)
              .single()

            if (member) {
              await supabase
                .from('league_members')
                .update({ balance: member.balance + bet.potential_payout })
                .eq('user_id', bet.user_id)
                .eq('league_id', bet.league_id)
            }

            log.push(`✓ Bet won: ${bet.pick_label} — paid out $${bet.potential_payout}`)
          } else {
            log.push(`✗ Bet lost: ${bet.pick_label} — wager $${bet.wager}`)
          }

          totalSettled++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, settled: totalSettled, log }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})