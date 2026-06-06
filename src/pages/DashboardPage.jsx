import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fmtMoney, pickColor, getInitials, daysLeft } from '../lib/utils'
import './DashboardPage.css'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [leagues, setLeagues] = useState([])
  const [activeLeague, setActiveLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [feed, setFeed] = useState([])
  const [myMember, setMyMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadLeagues()
  }, [profile])

  useEffect(() => {
    if (!activeLeague) return
    loadLeagueData(activeLeague)

    const channel = supabase
      .channel('leaderboard-' + activeLeague.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'league_members' }, () => loadLeagueData(activeLeague))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, loadFeed)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeLeague])

  async function loadLeagues() {
    setLoading(true)
    const { data } = await supabase
      .from('league_members')
      .select('*, leagues(*)')
      .eq('user_id', profile.id)

    if (data && data.length > 0) {
      const leagueList = data.map(m => ({ ...m.leagues, myBalance: m.balance }))
      setLeagues(leagueList)
      setActiveLeague(leagueList[0])
    } else {
      setLeagues([])
      setActiveLeague(null)
      setLoading(false)
    }
  }

  async function loadLeagueData(league) {
    await Promise.all([loadMembers(league), loadFeed()])
    setLoading(false)
  }

  async function loadMembers(league) {
    const { data } = await supabase
      .from('league_members')
      .select('*, profiles(username)')
      .eq('league_id', league.id)
      .order('balance', { ascending: false })

    if (data) {
      setMembers(data)
      const me = data.find(m => m.user_id === profile.id)
      setMyMember(me ?? null)
    }
  }

  async function loadFeed() {
    const { data } = await supabase
      .from('bets')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(15)
    if (data) setFeed(data)
  }

  // ── Empty state ───────────────────────────────
  if (!loading && leagues.length === 0) {
    return (
      <div className="screen-content">
        <div className="empty-league-wrap">
          <div className="empty-league-icon">🏆</div>
          <div className="empty-league-title">No leagues yet</div>
          <div className="empty-league-sub">
            Create a private league or join one with an invite code to start competing with friends.
          </div>
          <button className="btn-primary" style={{ marginBottom: 12 }} onClick={() => navigate('/league')}>
            Start a League
          </button>
          <button className="btn-secondary" onClick={() => navigate('/league')}>
            Join with Invite Code
          </button>
        </div>
      </div>
    )
  }

  const myRank = members.findIndex(m => m.user_id === profile?.id) + 1
  const pnl = myMember ? myMember.balance - (activeLeague?.starting_balance ?? 1000) : 0

  return (
    <div className="screen-content">

      {/* League selector — show if in multiple leagues */}
      {leagues.length > 1 && (
        <div className="league-tabs">
          {leagues.map(l => (
            <button
              key={l.id}
              className={`league-tab${activeLeague?.id === l.id ? ' active' : ''}`}
              onClick={() => setActiveLeague(l)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* Bankroll banner */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          <div className="bankroll-banner">
            {myRank > 0 && (
              <div className="bb-rank">#{myRank} of {members.length}</div>
            )}
            <div className="bb-label">{activeLeague?.name}</div>
            <div className="bb-amount">
              <span className="bb-dollar">$</span>
              {myMember
                ? myMember.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '—'}
            </div>
            <div className="bb-meta">
              <div className="bb-stat">
                <div className="bb-stat-label">P&amp;L</div>
                <div className={`bb-stat-val ${pnl >= 0 ? 'pos' : 'neg'}`}>
                  {pnl >= 0 ? '+' : '-'}{fmtMoney(Math.abs(pnl))}
                </div>
              </div>
              <div className="bb-stat">
                <div className="bb-stat-label">Days Left</div>
                <div className="bb-stat-val">{daysLeft(activeLeague?.ends_at)}</div>
              </div>
              <div className="bb-stat">
                <div className="bb-stat-label">Players</div>
                <div className="bb-stat-val">{members.length}</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="section-hd">Leaderboard</div>
          {members.map((m, i) => {
            const change = m.balance - (activeLeague?.starting_balance ?? 1000)
            const isMe = m.user_id === profile?.id
            const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1
            return (
              <div key={m.id} className={`lb-row${isMe ? ' me' : ''}`}>
                <div className={`lb-rank ${i < 3 ? ['gold','silver','bronze'][i] : ''}`}>{rankIcon}</div>
                <div className="lb-av" style={{ background: pickColor(i) }}>
                  {getInitials(m.profiles?.username ?? '?')}
                </div>
                <div className="lb-name">
                  <div className="lb-name-main">{m.profiles?.username}{isMe ? ' · you' : ''}</div>
                  <div className="lb-name-sub">{change >= 0 ? '↑' : '↓'} {fmtMoney(Math.abs(change))} this week</div>
                </div>
                <div className="lb-balance">
                  <div className="lb-bal-main">{fmtMoney(m.balance)}</div>
                  <div className="lb-bal-sub" style={{ color: change >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {change >= 0 ? '+' : '-'}{fmtMoney(Math.abs(change))}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Activity feed */}
          <div className="section-hd" style={{ marginTop: 8 }}>Activity Feed</div>
          {feed.length === 0 ? (
            <div className="empty-state">No activity yet. Place a bet!</div>
          ) : (
            feed.map(b => (
              <div key={b.id} className="feed-item">
                <div className={`feed-dot ${b.status === 'won' ? 'win' : b.status === 'lost' ? 'loss' : ''}`} />
                <div>
                  <div className="feed-text">
                    <strong>{b.profiles?.username}</strong>
                    {b.status === 'active'
                      ? ` placed ${fmtMoney(b.wager)} on ${b.pick_label}`
                      : b.status === 'won'
                      ? ` won ${fmtMoney(b.potential_payout - b.wager)} on ${b.pick_label}`
                      : ` lost ${fmtMoney(b.wager)} on ${b.pick_label}`}
                  </div>
                  <div className="feed-time">
                    {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Join another league CTA */}
          <div style={{ margin: '16px', marginTop: '24px' }}>
            <button className="btn-secondary" onClick={() => navigate('/league')}>
              + Join Another League
            </button>
          </div>
        </>
      )}
    </div>
  )
}