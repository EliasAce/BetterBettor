import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fmtMoney, fmtOdds } from '../lib/utils'
import './MyBetsPage.css'

export default function MyBetsPage() {
  const { profile } = useAuth()
  const [bets, setBets] = useState([])
  const [parlayLegs, setParlayLegs] = useState({}) // bet_id -> legs[]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadBets()
  }, [profile])

  async function loadBets() {
    const { data: betsData } = await supabase
      .from('bets')
      .select('*, games(home_team, away_team)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (!betsData) { setLoading(false); return }
    setBets(betsData)

    // Fetch parlay legs for any parlay bets
    const parlayBetIds = betsData
      .filter(b => b.bet_type === 'parlay')
      .map(b => b.id)

    if (parlayBetIds.length > 0) {
      const { data: legs } = await supabase
        .from('parlay_picks')
        .select('*, games(home_team, away_team)')
        .in('bet_id', parlayBetIds)

      if (legs) {
        const grouped = {}
        legs.forEach(leg => {
          if (!grouped[leg.bet_id]) grouped[leg.bet_id] = []
          grouped[leg.bet_id].push(leg)
        })
        setParlayLegs(grouped)
      }
    }

    setLoading(false)
  }

  const active = bets.filter(b => b.status === 'active')
  const settled = bets.filter(b => b.status !== 'active')

  const BetCard = ({ b }) => {
    const isParlay = b.bet_type === 'parlay'
    const legs = parlayLegs[b.id] ?? []

    return (
      <div className="bet-item">
        <div className="bet-top">
          <div>
            <div className="bet-pick">{b.pick_label}</div>
            {/* For straight bets show matchup */}
            {!isParlay && (
              <div className="bet-matchup">{b.games?.away_team} @ {b.games?.home_team}</div>
            )}
            {/* For parlays show each leg */}
            {isParlay && legs.length > 0 && (
              <div className="parlay-legs">
                {legs.map((leg, i) => (
                  <div key={i} className="parlay-leg">
                    <span className="parlay-leg-pick">{leg.pick_label}</span>
                    <span className="parlay-leg-odds">{fmtOdds(leg.odds)}</span>
                    {leg.result && (
                      <span className={`parlay-leg-result ${leg.result}`}>
                        {leg.result === 'won' ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`badge badge-${b.status}`}>{b.status}</div>
        </div>
        <div className="bet-bottom">
          <span className="bet-detail">
            {isParlay ? 'Parlay' : (b.bet_type === 'ml_away' || b.bet_type === 'ml_home' ? 'Moneyline' : 'Spread')}
            {' · '}<strong>{fmtOdds(b.odds)}</strong>
          </span>
          <span className="bet-detail">Wagered <strong>{fmtMoney(b.wager)}</strong></span>
          <span className="bet-result" style={{
            color: b.status === 'won' ? 'var(--c-green)' : b.status === 'lost' ? 'var(--c-red)' : 'var(--c-muted)'
          }}>
            {b.status === 'active'
              ? `To win ${fmtMoney(b.potential_payout - b.wager)}`
              : b.status === 'won'
              ? `+${fmtMoney(b.potential_payout - b.wager)}`
              : `-${fmtMoney(b.wager)}`}
          </span>
        </div>
      </div>
    )
  }

if (loading) return <div className="screen-content"><div className="spinner-wrap"><div className="spinner" /></div></div>


  return (
    <div className="screen-content">
      <div className="section-hd">Active Bets</div>
      {active.length
        ? active.map(b => <BetCard key={b.id} b={b} />)
        : <div className="empty-state">No active bets.<br />Head to Place Bet to get started!</div>}

      <div className="section-hd" style={{ marginTop: 8 }}>Settled Bets</div>
      {settled.length
        ? settled.map(b => <BetCard key={b.id} b={b} />)
        : <div className="empty-state">No settled bets yet.</div>}
    </div>
  )
}