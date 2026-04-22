import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/supabase-provider'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})

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
    <html lang="pt" className={manrope.variable}>
      <body className={`${manrope.className} antialiased`} style={{ backgroundColor: '#f9f9ff' }}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}
