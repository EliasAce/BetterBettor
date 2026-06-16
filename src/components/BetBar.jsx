import { useState } from 'react'
import { fmtOdds, fmtMoney, calcPayout } from '../lib/utils'
import './BetBar.css'

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

export default function BetBar({ picks, onRemovePick, onClear, onPlace, myBalance }) {
  const [open, setOpen] = useState(false)
  const [wager, setWager] = useState(50)

  if (picks.length === 0) return null

  const isParlay = picks.length > 1
  const parlayOdds = isParlay ? combinedAmericanOdds(picks.map(p => p.odds)) : null
  const displayOdds = isParlay ? parlayOdds : picks[0].odds
  const payout = isParlay
    ? calcParlayPayout(wager, picks.map(p => p.odds))
    : calcPayout(wager, picks[0].odds)

  const label = isParlay
    ? `${picks.length}-Leg Parlay`
    : picks[0].label

  return (
    <>
      {/* Persistent bar */}
      <div className="bet-bar" onClick={() => setOpen(true)}>
        <div className="bet-bar-left">
          <div className="bet-bar-icon">{isParlay ? '🔗' : '🎯'}</div>
          <div className="bet-bar-info">
            <div className="bet-bar-label">{label}</div>
            <div className="bet-bar-odds">{fmtOdds(displayOdds)}</div>
          </div>
        </div>
        <div className="bet-bar-right">
          <div className="bet-bar-count">{picks.length} {picks.length === 1 ? 'pick' : 'picks'}</div>
          <div className="bet-bar-cta">Place Bet ›</div>
        </div>
      </div>

      {/* Bottom sheet */}
      {open && (
        <div className="betbar-overlay" onClick={() => setOpen(false)}>
          <div className="betbar-sheet" onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div className="sheet-handle" />

            {/* Header */}
            <div className="sheet-header">
              <div className="sheet-title">
                {isParlay ? `🔗 ${picks.length}-Leg Parlay` : 'Bet Slip'}
              </div>
              <button className="sheet-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Picks */}
            {picks.map((p, i) => (
              <div key={i} className="sheet-pick">
                <div className="sheet-pick-left">
                  <div className="sheet-pick-matchup">{p.game.away_team} @ {p.game.home_team}</div>
                  <div className="sheet-pick-name">{p.label}</div>
                  <div className="sheet-pick-odds">{fmtOdds(p.odds)}</div>
                </div>
                <button className="sheet-pick-remove" onClick={() => onRemovePick(i)}>✕</button>
              </div>
            ))}

            {/* Combined odds for parlay */}
            {isParlay && (
              <div className="sheet-combined">
                <span className="sheet-combined-label">Combined Odds</span>
                <span className="sheet-combined-val">{fmtOdds(parlayOdds)}</span>
              </div>
            )}

            {/* Wager */}
            <div className="sheet-wager">
              <div className="sheet-wager-label">Wager Amount</div>
              <div className="sheet-wager-input-wrap">
                <span className="sheet-wager-dollar">$</span>
                <input
                  type="number"
                  className="sheet-wager-input"
                  value={wager}
                  min={1}
                  max={myBalance}
                  onChange={e => setWager(Number(e.target.value))}
                />
              </div>
              <div className="sheet-quick-amounts">
                {[25, 50, 100, 200].map(a => (
                  <button key={a} className="sheet-qa-btn" onClick={() => setWager(a)}>${a}</button>
                ))}
              </div>
            </div>

            {/* Payout */}
            <div className="sheet-payout">
              <span className="sheet-payout-label">Potential Payout</span>
              <span className="sheet-payout-val">{fmtMoney(payout)}</span>
            </div>

            {/* Actions */}
            <div className="sheet-actions">
              <button className="sheet-clear" onClick={() => { onClear(); setOpen(false) }}>
                Clear All
              </button>
              <button
                className="sheet-place"
                onClick={() => { onPlace(wager, payout, parlayOdds); setOpen(false) }}
                disabled={wager < 1 || wager > myBalance}
              >
                {isParlay ? `Place ${picks.length}-Leg Parlay` : 'Place Bet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}