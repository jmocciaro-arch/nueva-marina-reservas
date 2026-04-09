'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  ShoppingBag,
  Trophy,
  Medal,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-lime-400' },
  { href: '/reservas', label: 'Reservas', icon: CalendarDays, color: 'text-blue-400' },
  { href: '/caja', label: 'Caja', icon: DollarSign, color: 'text-green-400' },
  { href: '/tienda', label: 'NM Shop', icon: ShoppingBag, color: 'text-purple-400' },
  { href: '/torneos', label: 'Torneos', icon: Trophy, color: 'text-yellow-400' },
  { href: '/ranking', label: 'Ranking', icon: Medal, color: 'text-orange-400' },
  { href: '/jugadores', label: 'Jugadores', icon: Users, color: 'text-cyan-400' },
  { href: '/config', label: 'Configuración', icon: Settings, color: 'text-gray-400' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center">
            <span className="text-xl">🎾</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Nueva Marina</h1>
            <p className="text-gray-400 text-xs">Pádel & Sport</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive(item.href)
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            )}
          >
            <item.icon size={20} className={isActive(item.href) ? 'text-lime-400' : item.color} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all duration-200"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-xl text-white border border-gray-700"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-700 flex flex-col z-40 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <NavContent />
      </aside>
    </>
  )
}
