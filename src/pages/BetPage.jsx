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

const MAX_LEGS = 5

function toDecimal(american) {
  if (american > 0) return (american / 100) + 1
  return (100 / Math.abs(american)) + 1
}

function calcParlayPayout(wager, oddsArray) {
  const combined = oddsArray.reduce((acc, odds) => acc * toDecimal(odds), 1)
  return wager * combined
}

function combinedAmericanOdds(oddsArray) {
  const combined = oddsArray.reduce((acc, odds) => acc * toDecimal(odds), 1)
  if (combined >= 2) return Math.round((combined - 1) * 100)
  return Math.round(-100 / (combined - 1))
}

export default function BetPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState([])
  const [activeSport, setActiveSport] = useState('ALL')
  const [picks, setPicks] = useState([])
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

  const isParlay = picks.length > 1
  const payout = isParlay
    ? calcParlayPayout(wager, picks.map(p => p.odds))
    : picks.length === 1
    ? calcPayout(wager, picks[0].odds)
    : 0

  const parlayOdds = isParlay ? combinedAmericanOdds(picks.map(p => p.odds)) : null

  function togglePick(game, betType, label, odds) {
    const existing = picks.findIndex(p => p.game.id === game.id && p.betType === betType)
    if (existing >= 0) {
      setPicks(picks.filter((_, i) => i !== existing))
      return
    }
    const sameGame = picks.findIndex(p => p.game.id === game.id)
    if (sameGame >= 0) {
      const updated = [...picks]
      updated[sameGame] = { game, betType, label, odds }
      setPicks(updated)
      return
    }
    if (picks.length >= MAX_LEGS) {
      toast(`Max ${MAX_LEGS} legs per parlay`, 'error')
      return
    }
    setPicks([...picks, { game, betType, label, odds }])
  }

  function isSelected(gameId, betType) {
    return picks.some(p => p.game.id === gameId && p.betType === betType)
  }

  function removePick(index) {
    setPicks(picks.filter((_, i) => i !== index))
  }

  async function placeBet() {
    if (picks.length === 0) return
    if (wager < 1) { toast('Enter a valid wager', 'error'); return }
    if (wager > myBalance) { toast('Insufficient bankroll!', 'error'); return }
    if (!myLeagueId) { toast('Join a league first!', 'error'); return }
    setPlacing(true)

    const betData = {
      user_id: profile.id,
      league_id: myLeagueId,
      game_id: picks[0].game.id,
      pick_label: isParlay ? `${picks.length}-leg parlay` : picks[0].label,
      bet_type: isParlay ? 'parlay' : picks[0].betType,
      odds: isParlay ? parlayOdds : picks[0].odds,
      wager,
      potential_payout: payout,
      status: 'active',
    }

    const { data: newBet, error } = await supabase
      .from('bets')
      .insert(betData)
      .select()
      .single()

    if (error) { toast(error.message, 'error'); setPlacing(false); return }

    if (isParlay) {
      const parlayLegs = picks.map(p => ({
        bet_id: newBet.id,
        game_id: p.game.id,
        pick_label: p.label,
        bet_type: p.betType,
        odds: p.odds,
      }))
      await supabase.from('parlay_picks').insert(parlayLegs)
    }

    await supabase
      .from('league_members')
      .update({ balance: myBalance - wager })
      .eq('user_id', profile.id)
      .eq('league_id', myLeagueId)

    setMyBalance(b => b - wager)
    toast(isParlay
      ? `${picks.length}-leg parlay placed! Potential: ${fmtMoney(payout)}`
      : `Bet placed! ${fmtMoney(wager)} on ${picks[0].label}`
    )
    setPicks([])
    setConfirming(false)
    setPlacing(false)
  }

  return (
    <div className="screen-content">
      <div className="sport-nav">
        {SPORTS.map(s => (
          <button
            key={s.key}
            className={`sport-btn${activeSport === s.key ? ' active' : ''}`}
            onClick={() => setActiveSport(s.key)}
          >
            <span className="sport-icon">{s.icon}</span>
            <span className="sport-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="section-hd">
        {filteredGames.length} {activeSport === 'ALL' ? 'Games' : activeSport + ' Games'} Available
      </div>

      {filteredGames.length === 0 ? (
        <div className="empty-state">No games available right now.</div>
      ) : (
        filteredGames.map(g => (
          <div key={g.id} className={`game-card${picks.some(p => p.game.id === g.id) ? ' selected' : ''}`}>
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
                  className={`odd-btn${isSelected(g.id, 'ml_away') ? ' sel' : ''}`}
                  onClick={() => togglePick(g, 'ml_away', `${g.away_team} ML`, g.ml_away)}
                >
                  <div className="odd-type">Moneyline</div>
                  <div className="odd-val">{fmtOdds(g.ml_away)}</div>
                  <div className="odd-team">{g.away_team.split(' ').pop()}</div>
                </button>
                <button
                  className={`odd-btn${isSelected(g.id, 'spread_away') ? ' sel' : ''}`}
                  onClick={() => togglePick(g, 'spread_away', `${g.away_team} ${g.spread_away > 0 ? '+' : ''}${g.spread_away}`, -108)}
                >
                  <div className="odd-type">Spread</div>
                  <div className="odd-val">{g.spread_away > 0 ? '+' : ''}{g.spread_away}</div>
                  <div className="odd-team">{g.away_team.split(' ').pop()}</div>
                </button>
                <button
                  className={`odd-btn${isSelected(g.id, 'ml_home') ? ' sel' : ''}`}
                  onClick={() => togglePick(g, 'ml_home', `${g.home_team} ML`, g.ml_home)}
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

      {picks.length > 0 && (
        <div className="bet-slip">
          <div className="slip-header">
            <span className="slip-title">
              {isParlay ? `🔗 Parlay — ${picks.length} Legs` : 'Bet Slip'}
            </span>
            <button className="slip-clear" onClick={() => setPicks([])}>Clear</button>
          </div>

          {picks.map((p, i) => (
            <div key={i} className="slip-pick">
              <div className="slip-pick-left">
                <div className="slip-matchup">{p.game.away_team} @ {p.game.home_team}</div>
                <div className="slip-pick-name">{p.label}</div>
                <div className="slip-odds">{fmtOdds(p.odds)}</div>
              </div>
              <button className="slip-remove" onClick={() => removePick(i)}>✕</button>
            </div>
          ))}

          {isParlay && (
            <div className="parlay-odds-row">
              <span className="parlay-odds-label">Combined Odds</span>
              <span className="parlay-odds-val">{fmtOdds(parlayOdds)}</span>
            </div>
          )}

          {picks.length < MAX_LEGS && (
            <div className="parlay-hint">
              {isParlay
                ? `Add up to ${MAX_LEGS - picks.length} more leg${MAX_LEGS - picks.length !== 1 ? 's' : ''}`
                : 'Select another game to build a parlay'}
            </div>
          )}

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
            <button className="btn-primary" onClick={() => setConfirming(true)}>
              {isParlay ? `Place ${picks.length}-Leg Parlay` : 'Place Bet'}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {isParlay ? `Confirm ${picks.length}-Leg Parlay` : 'Confirm Your Bet'}
            </div>
            <div className="modal-sub">
              {isParlay ? (
                <>
                  {picks.map((p, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>• {p.label} ({fmtOdds(p.odds)})</div>
                  ))}
                  <div style={{ marginTop: 10 }}>
                    Wager: <strong>{fmtMoney(wager)}</strong> · Potential: <strong>{fmtMoney(payout)}</strong>
                  </div>
                </>
              ) : (
                <>Place {fmtMoney(wager)} on <strong>{picks[0]?.label}</strong> ({fmtOdds(picks[0]?.odds)}). Potential payout: <strong>{fmtMoney(payout)}</strong></>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="modal-confirm" onClick={placeBet} disabled={placing}>
                {placing ? 'Placing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}