import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider, useToast } from './components/Toast'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import BetBar from './components/BetBar'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BetPage from './pages/BetPage'
import MyBetsPage from './pages/MyBetsPage'
import LeaguePage from './pages/LeaguePage'
import { supabase } from './lib/supabase'

function AppShell() {
  const { session, loading, profile } = useAuth()
  const toast = useToast()
  const [picks, setPicks] = useState([])
  const [myBalance, setMyBalance] = useState(1000)
  const [myLeagueId, setMyLeagueId] = useState(null)

  if (loading) {
    return (
      <div className="app-shell">
        <div className="spinner-wrap" style={{ height: '100dvh' }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!session) return <AuthPage />

  function toDecimal(american) {
    if (american > 0) return (american / 100) + 1
    return (100 / Math.abs(american)) + 1
  }

  function combinedAmericanOdds(oddsArray) {
    const combined = oddsArray.reduce((acc, odds) => acc * toDecimal(odds), 1)
    if (combined >= 2) return Math.round((combined - 1) * 100)
    return Math.round(-100 / (combined - 1))
  }

  async function handlePlace(wager, payout, parlayOdds) {
    if (!profile) return
    const isParlay = picks.length > 1

    let leagueId = myLeagueId
    let balance = myBalance

    if (!leagueId) {
      const { data } = await supabase
        .from('league_members')
        .select('league_id, balance')
        .eq('user_id', profile.id)
        .limit(1)
        .single()
      if (!data) { toast('Join a league first!', 'error'); return }
      leagueId = data.league_id
      balance = data.balance
      setMyLeagueId(leagueId)
      setMyBalance(balance)
    }

    if (wager > balance) { toast('Insufficient bankroll!', 'error'); return }

    const betData = {
      user_id: profile.id,
      league_id: leagueId,
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

    if (error) { toast(error.message, 'error'); return }

    if (isParlay) {
      const legs = picks.map(p => ({
        bet_id: newBet.id,
        game_id: p.game.id,
        pick_label: p.label,
        bet_type: p.betType,
        odds: p.odds,
      }))
      await supabase.from('parlay_picks').insert(legs)
    }

    await supabase
      .from('league_members')
      .update({ balance: balance - wager })
      .eq('user_id', profile.id)
      .eq('league_id', leagueId)

    setMyBalance(b => b - wager)
    toast(isParlay
      ? `${picks.length}-leg parlay placed!`
      : `Bet placed on ${picks[0].label}!`
    )
    setPicks([])
  }

  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/bet" element={
          <BetPage
            picks={picks}
            onPicksChange={setPicks}
          />}
        />
        <Route path="/bets" element={<MyBetsPage />} />
        <Route path="/league" element={<LeaguePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BetBar
        picks={picks}
        onRemovePick={(i) => setPicks(picks.filter((_, idx) => idx !== i))}
        onClear={() => setPicks([])}
        onPlace={handlePlace}
        myBalance={myBalance}
      />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}