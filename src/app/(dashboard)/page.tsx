'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts'
import { CalendarDays, DollarSign, Users, Trophy, TrendingUp, Clock, Download, BarChart3, Target, Award, UserCheck } from 'lucide-react'
import { exportToExcel } from '@/lib/export-excel'

type Period = 'day' | 'month' | 'quarter' | 'year'

const COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [bookings, setBookings] = useState<any[]>([])
  const [cashEntries, setCashEntries] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [bRes, cRes, pRes] = await Promise.all([
      supabase.from('bookings').select('*').order('date', { ascending: false }),
      supabase.from('cash_register').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setBookings(bRes.data || [])
    setCashEntries(cRes.data || [])
    setProfiles(pRes.data || [])
    setLoading(false)
  }

  // === STATS ===
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.substring(0, 7)
  const todayBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled')
  const monthBookings = bookings.filter(b => b.date?.startsWith(thisMonth) && b.status !== 'cancelled')
  const totalRevenue = cashEntries.filter(e => e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
  const monthRevenue = cashEntries.filter(e => e.date?.startsWith(thisMonth) && e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
  const activeBookings = bookings.filter(b => b.status !== 'cancelled')

  // === BOOKINGS BY PERIOD ===
  function getBookingsByPeriod() {
    const grouped: Record<string, { label: string; reservas: number; ingresos: number }> = {}
    activeBookings.forEach(b => {
      let key = ''
      let label = ''
      const d = new Date(b.date + 'T12:00:00')
      if (period === 'day') {
        key = b.date
        label = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      } else if (period === 'month') {
        key = b.date?.substring(0, 7)
        label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      } else if (period === 'quarter') {
        const q = Math.ceil((d.getMonth() + 1) / 3)
        key = `${d.getFullYear()}-Q${q}`
        label = `Q${q} ${d.getFullYear()}`
      } else {
        key = `${d.getFullYear()}`
        label = `${d.getFullYear()}`
      }
      if (!grouped[key]) grouped[key] = { label, reservas: 0, ingresos: 0 }
      grouped[key].reservas++
      grouped[key].ingresos += Number(b.price) || 0
    })
    return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label)).slice(-12)
  }

  // === BY COURT ===
  function getBookingsByCourt() {
    const counts: Record<string, number> = {}
    activeBookings.forEach(b => {
      const name = `Pista ${b.court_id}`
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }

  // === BY HOUR ===
  function getBookingsByHour() {
    const hours: Record<string, number> = {}
    activeBookings.forEach(b => {
      const h = b.start_time?.substring(0, 2) + ':00'
      if (h) hours[h] = (hours[h] || 0) + 1
    })
    return Object.entries(hours).map(([hora, reservas]) => ({ hora, reservas })).sort((a, b) => a.hora.localeCompare(b.hora))
  }

  // === TOP CLIENTS ===
  function getTopClients() {
    const clients: Record<string, { nombre: string; reservas: number; gasto: number }> = {}
    activeBookings.forEach(b => {
      const name = b.customer_name || 'Sin nombre'
      if (!clients[name]) clients[name] = { nombre: name, reservas: 0, gasto: 0 }
      clients[name].reservas++
      clients[name].gasto += Number(b.price) || 0
    })
    return Object.values(clients).sort((a, b) => b.reservas - a.reservas).slice(0, 10)
  }

  // === STAFF RANKING ===
  function getStaffStats() {
    const staff: Record<string, { nombre: string; reservas: number }> = {}
    activeBookings.forEach(b => {
      const profile = profiles.find(p => p.id === b.created_by)
      const name = profile?.full_name || 'Sin asignar'
      if (!staff[name]) staff[name] = { nombre: name, reservas: 0 }
      staff[name].reservas++
    })
    return Object.values(staff).sort((a, b) => b.reservas - a.reservas).slice(0, 5)
  }

  // === REVENUE TREND ===
  function getRevenueTrend() {
    const grouped: Record<string, { label: string; ingresos: number }> = {}
    cashEntries.filter(e => e.amount > 0).forEach(e => {
      const key = e.date?.substring(0, 7)
      const d = new Date(e.date + 'T12:00:00')
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      if (!grouped[key]) grouped[key] = { label, ingresos: 0 }
      grouped[key].ingresos += Number(e.amount)
    })
    return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label)).slice(-12)
  }

  // === STATUS BREAKDOWN ===
  function getStatusBreakdown() {
    const statuses: Record<string, number> = { confirmed: 0, pending: 0, cancelled: 0 }
    bookings.forEach(b => { statuses[b.status] = (statuses[b.status] || 0) + 1 })
    return [
      { name: 'Confirmadas', value: statuses.confirmed, color: '#22c55e' },
      { name: 'Pendientes', value: statuses.pending, color: '#f59e0b' },
      { name: 'Canceladas', value: statuses.cancelled, color: '#ef4444' },
    ].filter(s => s.value > 0)
  }

  const periodLabels: Record<Period, string> = { day: 'Día', month: 'Mes', quarter: 'Trimestre', year: 'Año' }

  function handleExport() {
    exportToExcel(activeBookings.map(b => ({
      Fecha: b.date, Hora: b.start_time?.substring(0, 5), Pista: `Pista ${b.court_id}`,
      Cliente: b.customer_name, Email: b.customer_email || '', Telefono: b.customer_phone || '',
      Duracion: `${b.duration_minutes}min`, Precio: b.price, Estado: b.status, Jugadores: b.players || '',
    })), 'estadisticas_reservas')
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-lg">
        <p className="text-white font-bold text-sm">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {p.name === 'ingresos' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }

  if (loading) return <div className="text-gray-400 text-center py-20">Cargando estadísticas...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-cyan-400" size={32} />
            Dashboard — Estadísticas
          </h1>
          <p className="text-gray-400 mt-1">Panel de control — Nueva Marina Pádel & Sport</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all">
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Reservas Hoy', value: todayBookings.length, icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
          { label: 'Reservas Mes', value: monthBookings.length, icon: TrendingUp, color: 'from-cyan-500 to-cyan-600' },
          { label: 'Total Reservas', value: activeBookings.length, icon: Target, color: 'from-purple-500 to-purple-600' },
          { label: 'Ingresos Hoy', value: formatCurrency(cashEntries.filter(e => e.date === today && e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)), icon: DollarSign, color: 'from-green-500 to-green-600' },
          { label: 'Ingresos Mes', value: formatCurrency(monthRevenue), icon: DollarSign, color: 'from-lime-500 to-lime-600' },
          { label: 'Total Ingresos', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'from-yellow-500 to-yellow-600' },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <card.icon size={18} className="text-white/70" />
            </div>
            <p className="text-white/80 text-xs">{card.label}</p>
            <p className="text-white text-xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Period selector + Main chart */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-400" /> Reservas e Ingresos
          </h2>
          <div className="flex gap-1 bg-gray-700 rounded-xl p-1">
            {(['day', 'month', 'quarter', 'year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
                }`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getBookingsByPeriod()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="reservas" fill="#06b6d4" radius={[6, 6, 0, 0]} name="reservas" />
            <Bar yAxisId="right" dataKey="ingresos" fill="#22c55e" radius={[6, 6, 0, 0]} name="ingresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-400" /> Tendencia de Ingresos
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={getRevenueTrend()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="ingresos" stroke="#22c55e" fill="url(#greenGrad)" strokeWidth={2} name="ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings by Hour */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Clock size={18} className="text-yellow-400" /> Horarios más Populares
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={getBookingsByHour()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hora" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="reservas" fill="#f59e0b" radius={[6, 6, 0, 0]} name="reservas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Court (Pie) */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Target size={18} className="text-purple-400" /> Reservas por Pista
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={getBookingsByCourt()} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {getBookingsByCourt().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown (Pie) */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-400" /> Estado de Reservas
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={getStatusBreakdown()} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {getStatusBreakdown().map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's Schedule + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Calendar */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-blue-400" /> Hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {todayBookings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay reservas para hoy</p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {todayBookings.sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 bg-gray-700/50 rounded-xl px-4 py-3">
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: COLORS[(b.court_id - 1) % 4] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{b.customer_name}</p>
                    <p className="text-gray-400 text-xs">Pista {b.court_id} — {b.start_time?.substring(0, 5)} a {b.end_time?.substring(0, 5)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>{b.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}</span>
                    <p className="text-cyan-400 text-xs font-bold mt-1">{formatCurrency(Number(b.price))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Clock size={18} className="text-orange-400" /> Últimas Reservas
          </h2>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {bookings.slice(0, 15).map((b: any) => {
              const creator = profiles.find((p: any) => p.id === b.created_by)
              return (
                <div key={b.id} className="flex items-center gap-3 bg-gray-700/30 rounded-xl px-4 py-3 border-l-4" style={{ borderColor: b.status === 'cancelled' ? '#ef4444' : b.status === 'confirmed' ? '#22c55e' : '#f59e0b' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{b.customer_name}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(b.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} — Pista {b.court_id} — {b.start_time?.substring(0, 5)}
                    </p>
                    {creator && <p className="text-cyan-400/60 text-xs">por {creator.full_name}</p>}
                  </div>
                  <span className="text-gray-300 text-sm font-medium">{formatCurrency(Number(b.price))}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Award size={18} className="text-yellow-400" /> Mejores Clientes
          </h2>
          {getTopClients().length === 0 ? (
            <p className="text-gray-400 text-center py-4">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {getTopClients().map((client, i) => (
                <div key={client.nombre} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500 font-mono text-sm">{i + 1}</span>}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{client.nombre}</p>
                      <p className="text-gray-400 text-xs">{client.reservas} reservas</p>
                    </div>
                  </div>
                  <span className="text-cyan-400 font-bold">{formatCurrency(client.gasto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Ranking */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-cyan-400" /> Staff — Reservas Creadas
          </h2>
          {getStaffStats().length === 0 ? (
            <p className="text-gray-400 text-center py-4">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {getStaffStats().map((staff, i) => {
                const maxReservas = getStaffStats()[0]?.reservas || 1
                const pct = (staff.reservas / maxReservas) * 100
                return (
                  <div key={staff.nombre} className="bg-gray-700/50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold text-sm">{staff.nombre}</span>
                      <span className="text-cyan-400 font-bold text-sm">{staff.reservas}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
