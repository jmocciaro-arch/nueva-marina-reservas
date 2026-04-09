'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateTimeSlots, COURT_COLORS } from '@/lib/utils'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone, Clock, Trophy, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function HorariosPublicPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const supabase = createClient()
  const timeSlots = generateTimeSlots(8, 0, 30)
  const courts = [
    { id: 1, name: 'Pista 1' }, { id: 2, name: 'Pista 2' },
    { id: 3, name: 'Pista 3' }, { id: 4, name: 'Pista 4' },
  ]

  useEffect(() => {
    supabase.from('bookings').select('court_id, date, start_time, end_time, status')
      .eq('date', selectedDate).neq('status', 'cancelled')
      .then(({ data }) => setBookings(data || []))
  }, [selectedDate])

  function isSlotOccupied(courtId: number, time: string): boolean {
    return bookings.some(b => {
      if (b.court_id !== courtId) return false
      const start = b.start_time?.substring(0, 5) || ''
      const end = b.end_time?.substring(0, 5) || ''
      return time >= start && time < end
    })
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-cyan-600 via-cyan-700 to-gray-900 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-6">
            <span className="text-4xl font-black text-white">MN</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Nueva Marina</h1>
          <p className="text-cyan-200 text-lg mb-6">Pádel & Sport — Reservá tu pista</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-cyan-100">
            <span className="flex items-center gap-2"><Clock size={16} /> 08:00 - 00:00</span>
            <span className="flex items-center gap-2"><MapPin size={16} /> España</span>
            <span className="flex items-center gap-2"><Phone size={16} /> Contacto</span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="px-8 py-3 bg-white text-cyan-700 font-bold rounded-xl text-lg hover:bg-cyan-50 transition-all shadow-lg">
              Reservar Pista
            </Link>
            <Link href="/login" className="px-8 py-3 bg-cyan-500/30 text-white font-bold rounded-xl text-lg hover:bg-cyan-500/50 transition-all border border-cyan-400/30">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: CalendarDays, title: '4 Pistas de Pádel', desc: 'Reservá online en segundos', color: 'from-blue-500 to-blue-600' },
            { icon: Trophy, title: 'Torneos & Ligas', desc: 'Competí y subí en el ranking', color: 'from-yellow-500 to-yellow-600' },
            { icon: ShoppingBag, title: 'Nueva Marina Shop', desc: 'Equipamiento de las mejores marcas', color: 'from-purple-500 to-purple-600' },
          ].map(s => (
            <div key={s.title} className={`bg-gradient-to-br ${s.color} rounded-2xl p-6 text-center shadow-lg`}>
              <s.icon size={36} className="text-white mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg">{s.title}</h3>
              <p className="text-white/80 text-sm mt-1">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Availability Grid */}
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <CalendarDays className="text-cyan-400" /> Disponibilidad de Pistas
        </h2>
        <p className="text-gray-400 mb-4 capitalize">{dateFormatted}</p>

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => changeDate(-1)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronLeft size={20} /></button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 text-center" />
          <button onClick={() => changeDate(1)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronRight size={20} /></button>
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium text-sm">Hoy</button>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500/30 border border-green-500/50" /><span className="text-gray-400 text-sm">Disponible</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50" /><span className="text-gray-400 text-sm">Reservado</span></div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex border-b border-gray-700">
                <div className="w-16 flex-shrink-0 px-3 py-3 text-gray-400 text-xs font-medium">Hora</div>
                {courts.map((court, i) => (
                  <div key={court.id} className="flex-1 px-3 py-3 text-center text-xs font-bold" style={{ color: COURT_COLORS[i] }}>
                    {court.name}
                  </div>
                ))}
              </div>
              <div className="flex">
                <div className="w-16 flex-shrink-0">
                  {timeSlots.map(time => (
                    <div key={time} className="h-8 px-3 flex items-center text-gray-500 text-xs font-mono border-b border-gray-700/30">{time}</div>
                  ))}
                </div>
                {courts.map(court => (
                  <div key={court.id} className="flex-1">
                    {timeSlots.map(time => {
                      const occupied = isSlotOccupied(court.id, time)
                      return (
                        <div key={time} className={`h-8 border-b border-gray-700/30 flex items-center justify-center text-xs font-medium ${
                          occupied ? 'bg-red-500/15 text-red-400' : 'bg-green-500/5 text-green-500/50'
                        }`}>
                          {occupied ? 'Reservado' : '—'}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-cyan-500/20">
            <CalendarDays size={22} /> Reservar una Pista
          </Link>
          <p className="text-gray-500 text-sm mt-3">Registrate gratis para reservar</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 py-8 px-4 text-center">
        <p className="text-gray-500 text-sm">Nueva Marina Pádel & Sport © {new Date().getFullYear()} — www.nuevamarina.es</p>
      </div>
    </div>
  )
}
