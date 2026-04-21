import { Navbar } from '@/components/navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-14 pb-16 md:pb-0">{children}</main>
    </div>
  )
}
