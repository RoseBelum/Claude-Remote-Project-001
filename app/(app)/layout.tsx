import { Navbar } from '@/components/navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main" className="pt-14 pb-20 md:pb-0">{children}</main>
    </div>
  )
}
