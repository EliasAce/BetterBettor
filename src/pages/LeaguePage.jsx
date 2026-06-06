import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { generateInviteCode, daysLeft, leagueProgress } from '../lib/utils'
import { useToast } from '../components/Toast'
import './LeaguePage.css'

export default function LeaguePage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [duration, setDuration] = useState('7')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadLeague()
  }, [profile])

  async function loadLeague() {
    const { data } = await supabase
      .from('league_members')
      .select('leagues(*)')
      .eq('user_id', profile.id)
      .limit(1)
      .single()
    setLeague(data?.leagues ?? null)
    setLoading(false)
  }

  async function createLeague() {
    if (!newName.trim()) { toast('Enter a league name', 'error'); return }
    setCreating(true)
    const code = generateInviteCode(newName)
    const startsAt = new Date()
    const endsAt = new Date(Date.now() + Number(duration) * 86400000)

    const { data, error } = await supabase
      .from('leagues')
      .insert({ name: newName.trim(), invite_code: code, created_by: profile.id, duration_days: Number(duration), starts_at: startsAt, ends_at: endsAt })
      .select()
      .single()

    if (error) { toast(error.message, 'error'); setCreating(false); return }

    await supabase.from('league_members').insert({
      league_id: data.id, user_id: profile.id, balance: data.starting_balance
    })

    setLeague(data)
    setNewName('')
    toast(`League "${data.name}" created!`)
    setCreating(false)
  }

  async function joinLeague() {
    const code = joinCode.trim().toUpperCase()
    if (!code) { toast('Enter an invite code', 'error'); return }
    setJoining(true)

    const { data: found, error: findErr } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', code)
      .single()

    if (findErr || !found) { toast('League not found', 'error'); setJoining(false); return }

    const { error } = await supabase.from('league_members').insert({
      league_id: found.id, user_id: profile.id, balance: found.starting_balance
    })

    if (error) { toast(error.code === '23505' ? 'Already in this league!' : error.message, 'error'); setJoining(false); return }

    setLeague(found)
    setJoinCode('')
    toast(`Joined "${found.name}"!`)
    setJoining(false)
  }

  function copyCode() {
    if (!league) return
    navigator.clipboard?.writeText(league.invite_code).catch(() => {})
    toast(`Copied "${league.invite_code}"!`)
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

  return (
    <div className="screen-content">
      {league && (
        <>
          <div className="league-banner">
            <div className="league-name">{league.name}</div>
            <div className="league-meta">
              <div className="lm-item"><div className="lm-label">Ends</div><div className="lm-val">{new Date(league.ends_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>
              <div className="lm-item"><div className="lm-label">Days left</div><div className="lm-val">{daysLeft(league.ends_at)}</div></div>
              <div className="lm-item"><div className="lm-label">Bankroll</div><div className="lm-val">${league.starting_balance}</div></div>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="pb-header">
              <span>League Progress</span>
              <span>{daysLeft(league.ends_at)} days left</span>
            </div>
            <div className="pb-track">
              <div className="pb-fill" style={{ width: leagueProgress(league.starts_at, league.ends_at) + '%' }} />
            </div>
          </div>

          <div className="invite-box card">
            <div className="invite-label">Invite Friends</div>
            <div className="invite-code-row">
              <div className="invite-code">{league.invite_code}</div>
              <button className="copy-btn" onClick={copyCode}>Copy</button>
            </div>
          </div>
        </>
      )}

      <div className="section-hd">Create a League</div>
      <div className="card">
        <input placeholder="League name" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 10 }} />
        <select value={duration} onChange={e => setDuration(e.target.value)} style={{ marginBottom: 12, cursor: 'pointer' }}>
          <option value="7">1 Week</option>
          <option value="14">2 Weeks</option>
          <option value="30">1 Month</option>
        </select>
        <button className="btn-secondary" onClick={createLeague} disabled={creating}>
          {creating ? 'Creating…' : 'Create League ↗'}
        </button>
      </div>

      <div className="section-hd">Join a League</div>
      <div className="card">
        <input
          placeholder="Enter invite code"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          style={{ marginBottom: 12, letterSpacing: 2 }}
        />
        <button className="btn-purple" onClick={joinLeague} disabled={joining}>
          {joining ? 'Joining…' : 'Join League ↗'}
        </button>
      </div>
    </div>
  )
}
