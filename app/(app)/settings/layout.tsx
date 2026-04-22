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
        <h1 className="text-2xl font-extrabold text-[#181c23] tracking-tight">Definições</h1>
        <p className="text-sm text-[#777680] font-medium mt-0.5">Configura o teu espaço de trabalho</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-52 flex-shrink-0">
          <nav className="glass rounded-[1.5rem] p-3 space-y-1">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  pathname === s.href || pathname.startsWith(s.href + '/')
                    ? 'bg-[#585990] text-white shadow-sm'
                    : 'text-[#46464f] hover:text-[#585990] hover:bg-white/60'
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
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                pathname === s.href
                  ? 'bg-[#585990] text-white border-[#585990]'
                  : 'text-[#46464f] border-[#c8c5d0] hover:border-[#585990]'
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
