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
        className="hidden md:flex glass-subtle fixed top-0 left-0 right-0 z-50 h-14 items-center px-6 gap-8"
      >
        <Link
          href="/tracker"
          aria-label="UX Flow — página inicial"
          className="flex-shrink-0 font-bold text-[color:var(--color-ink)] text-base tracking-tight"
        >
          UX Flow
        </Link>

        <nav role="navigation" aria-label="Navegação principal" className="flex items-center gap-1 flex-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  active
                    ? 'text-[color:var(--color-primary)] bg-[color:var(--color-primary-soft)]'
                    : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-sunken)]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="text-sm text-[color:var(--color-ink-muted)] font-medium"
            aria-hidden={!profile?.nome}
          >
            {profile?.nome ?? ''}
          </span>
          <div
            className="w-8 h-8 rounded-full bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-soft-ink)] flex items-center justify-center text-xs font-bold"
            aria-label={profile?.nome ? `Sessão iniciada como ${profile.nome}` : 'Utilizador'}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-[color:var(--color-surface-sunken)]"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header
        role="banner"
        className="md:hidden glass-subtle fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4"
      >
        <span className="font-bold text-[color:var(--color-ink)] text-sm tracking-tight">
          UX Flow
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[color:var(--color-ink-muted)] font-medium truncate max-w-[140px]">
            {profile?.nome ?? ''}
          </span>
          <div className="w-7 h-7 rounded-full bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-soft-ink)] flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        role="navigation"
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[color:var(--color-border)] flex"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 text-xs gap-1 font-medium transition-colors min-h-[56px] ${
                active
                  ? 'text-[color:var(--color-primary)]'
                  : 'text-[color:var(--color-ink-subtle)]'
              }`}
            >
              <span aria-hidden className="text-base leading-none">{tab.icon}</span>
              <span>{tab.shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
