import { useAuth } from '../hooks/useAuth'
import { getInitials } from '../lib/utils'
import './Header.css'

export default function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="header">
      <img src="/logo.png" alt="BetterBettor" className="header-logo" />
      <button className="avatar" onClick={signOut} title="Sign out">
        {getInitials(profile?.username ?? '?')}
      </button>
    </header>
  )
}
