import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fmtOdds } from '../lib/utils'
import { useToast } from '../components/Toast'
import './BetPage.css'

const SPORTS = [
  { key: 'ALL', label: 'All', icon: '🏆' },
  { key: 'NFL', label: 'NFL', icon: '🏈' },
  { key: 'NBA', label: 'NBA', icon: '🏀' },
  { key: 'MLB', label: 'MLB', icon: '⚾' },
  { key: 'NHL', label: 'NHL', icon: '🏒' },
  { key: 'UFC', label: 'UFC', icon: '🥊' },
]

const MAX_LEGS = 5

export default function BetPage({ picks, onPicksChange }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState([])
  const [activeSport, setActiveSport] = useState('ALL')

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .neq('status', 'final')
      .order('is_live', { ascending: false })
      .then(({ data }) => setGames(data ?? []))
  }, [])

  const filteredGames = activeSport === 'ALL'
    ? games
    : games.filter(g => g.league === activeSport)

  function togglePick(game, betType, label, odds) {
    const existing = picks.findIndex(p => p.game.id === game.id && p.betType === betType)
    if (existing >= 0) {
      onPicksChange(picks.filter((_, i) => i !== existing))
      return
    }
    const sameGame = picks.findIndex(p => p.game.id === game.id)
    if (sameGame >= 0) {
      const updated = [...picks]
      updated[sameGame] = { game, betType, label, odds }
      onPicksChange(updated)
      return
    }
    if (picks.length >= MAX_LEGS) {
      toast(`Max ${MAX_LEGS} legs per parlay`, 'error')
      return
    }
    onPicksChange([...picks, { game, betType, label, odds }])
  }

  function isSelected(gameId, betType) {
    return picks.some(p => p.game.id === gameId && p.betType === betType)
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
    </div>
  )
}