import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fmtMoney, fmtOdds } from '../lib/utils'
import './MyBetsPage.css'

export default function MyBetsPage() {
  const { profile } = useAuth()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('bets')
      .select('*, games(home_team, away_team)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBets(data ?? []); setLoading(false) })
  }, [profile])

  const active = bets.filter(b => b.status === 'active')
  const settled = bets.filter(b => b.status !== 'active')

  const BetCard = ({ b }) => (
    <div className="bet-item">
      <div className="bet-top">
        <div>
          <div className="bet-pick">{b.pick_label}</div>
          <div className="bet-matchup">{b.games?.away_team} @ {b.games?.home_team}</div>
        </div>
        <div className={`badge badge-${b.status}`}>{b.status}</div>
      </div>
      <div className="bet-bottom">
        <span className="bet-detail">{b.bet_type === 'ml_away' || b.bet_type === 'ml_home' ? 'Moneyline' : 'Spread'} · <strong>{fmtOdds(b.odds)}</strong></span>
        <span className="bet-detail">Wagered <strong>{fmtMoney(b.wager)}</strong></span>
        <span className="bet-result" style={{ color: b.status === 'won' ? 'var(--c-green)' : b.status === 'lost' ? 'var(--c-red)' : 'var(--c-muted)' }}>
          {b.status === 'active'
            ? `To win ${fmtMoney(b.potential_payout - b.wager)}`
            : b.status === 'won'
            ? `+${fmtMoney(b.potential_payout - b.wager)}`
            : `-${fmtMoney(b.wager)}`}
        </span>
      </div>
    </div>
  )

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

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
