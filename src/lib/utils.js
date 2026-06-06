export function fmtMoney(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtOdds(o) {
  return o > 0 ? '+' + o : '' + o
}

export function calcPayout(wager, odds) {
  if (odds < 0) return wager + (wager * 100 / Math.abs(odds))
  return wager + (wager * odds / 100)
}

export function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase()
}

export function generateInviteCode(name = '') {
  const base = name.replace(/\s/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
  const num = Math.floor(Math.random() * 90 + 10)
  return base + num
}

export function daysLeft(endsAt) {
  const diff = new Date(endsAt) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function leagueProgress(startsAt, endsAt) {
  const total = new Date(endsAt) - new Date(startsAt)
  const elapsed = new Date() - new Date(startsAt)
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

// Avatar colors pool
const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899']
export function pickColor(index) {
  return COLORS[index % COLORS.length]
}
