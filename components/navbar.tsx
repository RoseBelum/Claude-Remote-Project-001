'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from './supabase-provider'

const tabs = [
  { href: '/tracker',  label: 'Time Tracker', shortLabel: 'Tracker',  icon: '⏱' },
  { href: '/board',    label: 'Task Board',   shortLabel: 'Board',    icon: '◳' },
  { href: '/timeline', label: 'Timeline',     shortLabel: 'Timeline', icon: '◴' },
  { href: '/settings', label: 'Definições',   shortLabel: 'Config',   icon: '✦' },
]

export function Navbar() {
  const pathname = usePathname()
  const { profile, signOut } = useSupabase()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = profile?.nome
    ? profile.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <>
      {/* Desktop navbar */}
      <header
        role="banner"
        className="hidden md:flex space-bg fixed top-0 left-0 right-0 z-50 h-14 items-center px-6"
      >
        <Link
          href="/tracker"
          aria-label="UX Flow — página inicial"
          className="relative z-10 flex-shrink-0 font-extrabold text-white text-lg mr-8 tracking-tight flex items-center gap-2"
        >
          <span
            aria-hidden
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #FF7D46, #CC3A0E)', boxShadow: '0 0 14px rgba(255,125,70,0.65)' }}
          />
          UX Flow
        </Link>

        <nav role="navigation" aria-label="Navegação principal" className="relative z-10 flex items-center gap-1 flex-1 justify-center">
          {tabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                  active
                    ? 'bg-[color:var(--color-primary)] text-white shadow-[0_6px_18px_rgba(39,54,255,0.45)]'
                    : 'text-[color:var(--color-space-ink-muted)] hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="relative z-10 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-[color:var(--color-space-ink-muted)] font-medium" aria-hidden={!profile?.nome}>
            {profile?.nome ?? ''}
          </span>
          <div
            className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] text-white flex items-center justify-center text-xs font-bold"
            aria-label={profile?.nome ? `Sessão iniciada como ${profile.nome}` : 'Utilizador'}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-[color:var(--color-space-ink-muted)] hover:text-white font-semibold transition-colors px-2 py-1 rounded-lg"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header
        role="banner"
        className="md:hidden space-bg fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4"
      >
        <span className="relative z-10 font-extrabold text-white tracking-tight flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg, #FF7D46, #CC3A0E)', boxShadow: '0 0 10px rgba(255,125,70,0.7)' }}
          />
          UX Flow
        </span>
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-xs text-[color:var(--color-space-ink-muted)] font-medium truncate max-w-[140px]">
            {profile?.nome ?? ''}
          </span>
          <div className="w-7 h-7 rounded-full bg-[color:var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        role="navigation"
        aria-label="Navegação principal"
        className="md:hidden space-bg fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 flex"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 text-xs gap-1 font-semibold transition-colors min-h-[56px] ${
                active ? 'text-white' : 'text-[color:var(--color-space-ink-subtle)]'
              }`}
            >
              <span aria-hidden className="text-base leading-none">{tab.icon}</span>
              <span>{tab.shortLabel}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[color:var(--color-primary)]"
                />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
