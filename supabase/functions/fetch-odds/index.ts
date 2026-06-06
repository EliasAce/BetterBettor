import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const SPORTS = [
  { key: 'americanfootball_nfl',   label: 'NFL' },
  { key: 'basketball_nba',         label: 'NBA' },
  { key: 'baseball_mlb',           label: 'MLB' },
  { key: 'icehockey_nhl',          label: 'NHL' },
  { key: 'mma_mixed_martial_arts', label: 'UFC' },
]

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
    const games: any[] = []

    for (const sport of SPORTS) {
      const markets = sport.key === 'mma_mixed_martial_arts' ? 'h2h' : 'h2h,spreads'
      const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport.key}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american&dateFormat=iso`
      )

      if (!res.ok) {
        console.error(`Failed to fetch ${sport.label}: ${res.status}`)
        continue
      }

      const data = await res.json()

      let gamesToProcess = data

      if (sport.key === 'mma_mixed_martial_arts') {
        const uniqueDates = [...new Set(data.map((g: any) =>
          new Date(g.commence_time).toDateString()
        ))].slice(0, 2)
        gamesToProcess = data.filter((g: any) =>
          uniqueDates.includes(new Date(g.commence_time).toDateString())
        )
      } else {
        gamesToProcess = data.slice(0, 6)
      }

      for (const game of gamesToProcess) {
        const bookmaker = game.bookmakers?.[0]
        if (!bookmaker) continue

        const h2h     = bookmaker.markets?.find((m: any) => m.key === 'h2h')
        const spreads = bookmaker.markets?.find((m: any) => m.key === 'spreads')

        const homeH2h    = h2h?.outcomes?.find((o: any) => o.name === game.home_team)
        const awayH2h    = h2h?.outcomes?.find((o: any) => o.name === game.away_team)
        const homeSpread = spreads?.outcomes?.find((o: any) => o.name === game.home_team)
        const awaySpread = spreads?.outcomes?.find((o: any) => o.name === game.away_team)

        if (!homeH2h || !awayH2h) continue

        const gameTime = new Date(game.commence_time)
        const now = new Date()
        const isLive = gameTime <= now && gameTime > new Date(now.getTime() - 4 * 60 * 60 * 1000)

        games.push({
          id:           game.id,
          home_team:    game.home_team,
          away_team:    game.away_team,
          home_record:  '',
          away_record:  '',
          league:       sport.label,
          game_time:    gameTime.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
          is_live:      isLive,
          ml_home:      Math.round(homeH2h.price),
          ml_away:      Math.round(awayH2h.price),
          spread_home:  homeSpread?.point ?? 0,
          spread_away:  awaySpread?.point ?? 0,
          status:       isLive ? 'live' : 'upcoming',
        })
      }
    } // <-- this was missing

    if (games.length === 0) {
      return new Response(JSON.stringify({ message: 'No games found' }), { status: 200 })
    }

    const { error } = await supabase
      .from('games')
      .upsert(games, { onConflict: 'id' })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, updated: games.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})