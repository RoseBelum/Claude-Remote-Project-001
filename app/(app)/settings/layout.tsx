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
      <div className="mb-7">
        <p className="overline mb-1">Módulo 04 · Config</p>
        <h1 className="display text-3xl md:text-4xl text-[color:var(--color-ink)]">Definições</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)] font-medium mt-1">Configura o teu espaço de trabalho</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-52 flex-shrink-0">
          <nav aria-label="Secções de definições" className="glass rounded-[1.5rem] p-3 space-y-1">
            {sections.map((s) => {
              const active = pathname === s.href || pathname.startsWith(s.href + '/')
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[color:var(--color-primary)] text-white shadow-[0_8px_22px_-10px_rgba(39,54,255,0.6)]'
                      : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-sunken)]'
                  }`}
                >
                  {s.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Mobile tab scroll */}
        <nav aria-label="Secções de definições" className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-2 w-full">
          {sections.map((s) => {
            const active = pathname === s.href || pathname.startsWith(s.href + '/')
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors border ${
                  active
                    ? 'bg-[color:var(--color-primary)] text-white border-[color:var(--color-primary)]'
                    : 'text-[color:var(--color-ink-muted)] border-[color:var(--color-border-strong)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]'
                }`}
              >
                {s.label}
              </Link>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
