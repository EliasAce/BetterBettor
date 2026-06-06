import { useAuth } from '../hooks/useAuth'
import { getInitials } from '../lib/utils'
import './Header.css'

export default function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="header">
      <div className="logo">Better Bettor<span></span></div>
      <button className="avatar" onClick={signOut} title="Sign out">
        {getInitials(profile?.username ?? '?')}
      </button>
    </header>
  )
}
