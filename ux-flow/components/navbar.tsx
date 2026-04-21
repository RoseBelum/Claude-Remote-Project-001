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
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 items-center px-6">
        <div className="flex-shrink-0 font-semibold text-indigo-600 text-lg mr-8">
          UX Flow
        </div>

        <nav className="flex items-center gap-1 flex-1 justify-center">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(tab.href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-600">{profile?.nome ?? ''}</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <span className="font-semibold text-indigo-600">UX Flow</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{profile?.nome ?? ''}</span>
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
              isActive(tab.href) ? 'text-indigo-600' : 'text-gray-500'
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
