'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from './supabase-provider'

const tabs = [
  { href: '/tracker', label: 'Time Tracker', shortLabel: 'Tracker', icon: '⏱' },
  { href: '/board', label: 'Task Board', shortLabel: 'Board', icon: '📋' },
  { href: '/timeline', label: 'Timeline', shortLabel: 'Timeline', icon: '📊' },
  { href: '/settings', label: 'Definições', shortLabel: 'Config', icon: '⚙️' },
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
      <header className="glass-subtle hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center px-6 shadow-sm shadow-[#585990]/5">
        <div className="flex-shrink-0 font-extrabold text-[#585990] text-lg mr-8 tracking-tight">
          UX Flow
        </div>

        <nav className="flex items-center gap-1 flex-1 justify-center">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                isActive(tab.href)
                  ? 'bg-[#585990] text-white shadow-md shadow-[#585990]/30'
                  : 'text-[#46464f] hover:text-[#585990] hover:bg-white/60'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-[#46464f] font-medium">{profile?.nome ?? ''}</span>
          <div className="w-8 h-8 rounded-full bg-[#e1e0ff] text-[#585990] flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
            {initials}
          </div>
          <button
            onClick={signOut}
            className="text-sm text-[#777680] hover:text-[#181c23] font-medium transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header className="glass-subtle md:hidden fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4">
        <span className="font-extrabold text-[#585990] tracking-tight">UX Flow</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#46464f] font-medium">{profile?.nome ?? ''}</span>
          <div className="w-7 h-7 rounded-full bg-[#e1e0ff] text-[#585990] flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-subtle border-t border-white/60 flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 font-semibold transition-colors ${
              isActive(tab.href) ? 'text-[#585990]' : 'text-[#777680]'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
