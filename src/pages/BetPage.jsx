import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fmtOdds, fmtMoney, calcPayout } from '../lib/utils'
import { useToast } from '../components/Toast'
import './BetPage.css'

const SPORTS = [
  { key: 'ALL',  label: 'All',  icon: '🏆' },
  { key: 'NFL',  label: 'NFL',  icon: '🏈' },
  { key: 'NBA',  label: 'NBA',  icon: '🏀' },
  { key: 'MLB',  label: 'MLB',  icon: '⚾' },
  { key: 'NHL',  label: 'NHL',  icon: '🏒' },
  { key: 'UFC',  label: 'UFC',  icon: '🥊' },
]

export default function BetPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState([])
  const [activeSport, setActiveSport] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [wager, setWager] = useState(50)
  const [confirming, setConfirming] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [myLeagueId, setMyLeagueId] = useState(null)
  const [myBalance, setMyBalance] = useState(1000)

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .neq('status', 'final')
      .order('is_live', { ascending: false })
      .then(({ data }) => setGames(data ?? []))

    if (profile) loadMembership()
  }, [profile])

  async function loadMembership() {
    const { data } = await supabase
      .from('league_members')
      .select('league_id, balance')
      .eq('user_id', profile.id)
      .limit(1)
      .single()
    if (data) { setMyLeagueId(data.league_id); setMyBalance(data.balance) }
  }

  const filteredGames = activeSport === 'ALL'
    ? games
    : games.filter(g => g.league === activeSport)

  const payout = calcPayout(wager, selected?.odds ?? -110)

  function selectPick(game, betType, label, odds) {
    if (selected?.game.id === game.id && selected?.betType === betType) {
      setSelected(null)
    } else {
      setSelected({ game, betType, label, odds })
    }
  }

  async function placeBet() {
    if (!selected) return
    if (wager < 1) { toast('Enter a valid wager', 'error'); return }
    if (wager > myBalance) { toast('Insufficient bankroll!', 'error'); return }
    if (!myLeagueId) { toast('Join a league first!', 'error'); return }
    setPlacing(true)

    const { error } = await supabase.from('bets').insert({
      user_id: profile.id,
      league_id: myLeagueId,
      game_id: selected.game.id,
      pick_label: selected.label,
      bet_type: selected.betType,
      odds: selected.odds,
      wager,
      potential_payout: payout,
      status: 'active',
    })

    if (error) { toast(error.message, 'error'); setPlacing(false); return }

    await supabase
      .from('league_members')
      .update({ balance: myBalance - wager })
      .eq('user_id', profile.id)
      .eq('league_id', myLeagueId)

    setMyBalance(b => b - wager)
    toast(`Bet placed! ${fmtMoney(wager)} on ${selected.label}`)
    setSelected(null)
    setConfirming(false)
    setPlacing(false)
  }

  return (
    <div className="screen-content">

      {/* Sport filter nav */}
      <div className="sport-nav">
        {SPORTS.map(s => (
          <button
            key={s.key}
            className={`sport-btn${activeSport === s.key ? ' active' : ''}`}
            onClick={() => { setActiveSport(s.key); setSelected(null) }}
          >
            <span className="sport-icon">{s.icon}</span>
            <span className="sport-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Games count */}
      <div className="section-hd">
        {filteredGames.length} {activeSport === 'ALL' ? 'Games' : activeSport + ' Games'} Available
      </div>

      {filteredGames.length === 0 ? (
        <div className="empty-state">
          No {activeSport === 'ALL' ? '' : activeSport + ' '}games available right now.<br />
          Check back soon or try another sport.
        </div>
      ) : (
        filteredGames.map(g => (
          <div key={g.id} className={`game-card${selected?.game.id === g.id ? ' selected' : ''}`}>
            <div className="game-header">
              <span className="game-league">{g.league}</span>
              {g.is_live
                ? <span className="game-live"><span className="live-dot" />LIVE</span>
                : <span>{g.game_time}</span>}
            </div>
            <div className="game-body">
              <div className="matchup">
                <div className="team">
                  <div className="team-name">{g.away_team}</div>
                  {g.away_record && <div className="team-record">{g.away_record}</div>}
                </div>
                <div className="vs">@</div>
                <div className="team right">
                  <div className="team-name">{g.home_team}</div>
                  {g.home_record && <div className="team-record">{g.home_record}</div>}
                </div>
              </div>
              <div className="game-odds">
                <button
                  className={`odd-btn${selected?.game.id === g.id && selected.betType === 'ml_away' ? ' sel' : ''}`}
                  onClick={() => selectPick(g, 'ml_away', `${g.away_team} ML`, g.ml_away)}
                >
                  <div className="odd-type">Moneyline</div>
                  <div className="odd-val">{fmtOdds(g.ml_away)}</div>
                  <div className="odd-team">{g.away_team.split(' ').pop()}</div>
                </button>
                <button
                  className={`odd-btn${selected?.game.id === g.id && selected.betType === 'spread_away' ? ' sel' : ''}`}
                  onClick={() => selectPick(g, 'spread_away', `${g.away_team} ${g.spread_away > 0 ? '+' : ''}${g.spread_away}`, -108)}
                >
                  <div className="odd-type">Spread</div>
                  <div className="odd-val">{g.spread_away > 0 ? '+' : ''}{g.spread_away}</div>
                  <div className="odd-team">{g.away_team.split(' ').pop()}</div>
                </button>
                <button
                  className={`odd-btn${selected?.game.id === g.id && selected.betType === 'ml_home' ? ' sel' : ''}`}
                  onClick={() => selectPick(g, 'ml_home', `${g.home_team} ML`, g.ml_home)}
                >
                  <div className="odd-type">Moneyline</div>
                  <div className="odd-val">{fmtOdds(g.ml_home)}</div>
                  <div className="odd-team">{g.home_team.split(' ').pop()}</div>
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Bet slip */}
      {selected && (
        <div className="bet-slip">
          <div className="slip-header">
            <span className="slip-title">Bet Slip</span>
            <button className="slip-clear" onClick={() => setSelected(null)}>Clear</button>
          </div>
          <div className="slip-pick">
            <div className="slip-matchup">{selected.game.away_team} @ {selected.game.home_team}</div>
            <div className="slip-pick-name">{selected.label}</div>
            <div className="slip-odds">{fmtOdds(selected.odds)}</div>
          </div>
          <div className="wager-section">
            <div className="wager-label">Wager Amount</div>
            <div className="wager-input-wrap">
              <span className="wager-dollar">$</span>
              <input
                type="number"
                className="wager-input"
                value={wager}
                min={1}
                max={myBalance}
                onChange={e => setWager(Number(e.target.value))}
              />
            </div>
            <div className="quick-amounts">
              {[25, 50, 100, 200].map(a => (
                <button key={a} className="qa-btn" onClick={() => setWager(a)}>${a}</button>
              ))}
            </div>
          </div>
          <div className="payout-row">
            <span className="payout-label">Potential Payout</span>
            <span className="payout-val">{fmtMoney(payout)}</span>
          </div>
          <div className="slip-footer">
            <button className="btn-primary" onClick={() => setConfirming(true)}>Place Bet</button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Confirm Your Bet</div>
            <div className="modal-sub">
              Place {fmtMoney(wager)} on <strong>{selected?.label}</strong> ({fmtOdds(selected?.odds)}).
              Potential payout: <strong>{fmtMoney(payout)}</strong>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="modal-confirm" onClick={placeBet} disabled={placing}>
                {placing ? 'Placing…' : 'Confirm Bet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}