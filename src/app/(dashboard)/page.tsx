'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { CalendarDays, DollarSign, Users, Trophy, TrendingUp, Clock } from 'lucide-react'
import type { Booking, CashEntry, RankingEntry, Player, Tournament } from '@/lib/types'

interface DashboardStats {
  todayBookings: number
  todayRevenue: number
  totalPlayers: number
  activeTournaments: number
  occupancyRate: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0, todayRevenue: 0, totalPlayers: 0, activeTournaments: 0, occupancyRate: 0,
  })
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [topRanking, setTopRanking] = useState<(RankingEntry & { player?: Player })[]>([])
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [bookingsRes, cashRes, playersRes, tournamentsRes, rankingRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('date', today).neq('status', 'cancelled'),
      supabase.from('cash_register').select('*').eq('date', today),
      supabase.from('players').select('id', { count: 'exact' }),
      supabase.from('tournaments').select('*').in('status', ['upcoming', 'active']),
      supabase.from('ranking').select('*, player:players(*)').order('points', { ascending: false }).limit(3),
    ])

    const bookings = bookingsRes.data || []
    const cash = cashRes.data || []
    const totalRevenue = cash.reduce((sum: number, e: CashEntry) => sum + e.amount, 0)
    const totalSlots = 4 * 16 // 4 pistas * 16 horas
    const occupancy = totalSlots > 0 ? (bookings.length / totalSlots) * 100 : 0

    setStats({
      todayBookings: bookings.length,
      todayRevenue: totalRevenue,
      totalPlayers: playersRes.count || 0,
      activeTournaments: (tournamentsRes.data || []).length,
      occupancyRate: Math.round(occupancy),
    })
    setTodayBookings(bookings)
    setTopRanking(rankingRes.data || [])
    setUpcomingTournaments(tournamentsRes.data || [])
  }

  const statCards = [
    { label: 'Reservas Hoy', value: stats.todayBookings, icon: CalendarDays, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-400/20' },
    { label: 'Caja del Día', value: formatCurrency(stats.todayRevenue), icon: DollarSign, color: 'from-green-500 to-green-600', iconBg: 'bg-green-400/20' },
    { label: 'Jugadores', value: stats.totalPlayers, icon: Users, color: 'from-purple-500 to-purple-600', iconBg: 'bg-purple-400/20' },
    { label: 'Torneos Activos', value: stats.activeTournaments, icon: Trophy, color: 'from-yellow-500 to-yellow-600', iconBg: 'bg-yellow-400/20' },
    { label: 'Ocupación', value: `${stats.occupancyRate}%`, icon: TrendingUp, color: 'from-lime-500 to-lime-600', iconBg: 'bg-lime-400/20' },
  ]

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Panel de control — Nueva Marina Pádel & Sport</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{card.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`${card.iconBg} p-3 rounded-xl`}>
                <card.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bookings */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Clock size={20} className="text-blue-400" />
            Reservas de Hoy
          </h2>
          {todayBookings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay reservas para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayBookings.slice(0, 6).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{booking.customer_name}</p>
                    <p className="text-gray-400 text-sm">Pista {booking.court_id} — {booking.start_time?.substring(0, 5)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Ranking */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-yellow-400" />
            Top 3 Ranking
          </h2>
          {topRanking.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sin datos de ranking aún</p>
          ) : (
            <div className="space-y-3">
              {topRanking.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-4 bg-gray-700/50 rounded-xl px-4 py-3">
                  <span className="text-2xl">{medals[i]}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{entry.player?.name || 'Jugador'}</p>
                    <p className="text-gray-400 text-sm">
                      PJ: {entry.matches_played} | PG: {entry.matches_won} | Win: {
                        entry.matches_played > 0
                          ? Math.round((entry.matches_won / entry.matches_played) * 100)
                          : 0
                      }%
                    </p>
                  </div>
                  <span className="text-lime-400 font-bold text-lg">+{entry.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tournaments */}
      {upcomingTournaments.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-orange-400" />
            Próximos Torneos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTournaments.map((t) => (
              <div key={t.id} className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl p-4 border border-orange-500/20">
                <h3 className="text-white font-bold">{t.name}</h3>
                <p className="text-gray-300 text-sm mt-1">
                  {new Date(t.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                  t.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {t.status === 'active' ? 'En curso' : 'Próximamente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
