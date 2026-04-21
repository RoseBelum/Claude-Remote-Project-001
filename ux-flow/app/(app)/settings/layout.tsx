'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  { href: '/settings/projects', label: 'Projectos' },
  { href: '/settings/bus', label: 'Business Units' },
  { href: '/settings/tags', label: 'Activity Tags' },
  { href: '/settings/kanban', label: 'Kanban' },
  { href: '/settings/team', label: 'Equipa' },
  { href: '/settings/profile', label: 'O meu perfil' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Definições</h1>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === s.href || pathname.startsWith(s.href + '/')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile tab scroll */}
        <div className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-2 w-full">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                pathname === s.href
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
