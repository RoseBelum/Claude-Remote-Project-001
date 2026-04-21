import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/supabase-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UX Flow',
  description: 'Time tracking and task management for UX teams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className={inter.className}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}
