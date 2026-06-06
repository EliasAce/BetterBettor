import { NavLink } from 'react-router-dom'
import './BottomNav.css'

const tabs = [
  { to: '/',        icon: '◈', label: 'Dashboard' },
  { to: '/bet',     icon: '◎', label: 'Place Bet'  },
  { to: '/bets',    icon: '◷', label: 'My Bets'   },
  { to: '/league',  icon: '◉', label: 'League'     },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
