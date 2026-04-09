'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Booking, Court, BookingStatus } from '@/lib/types'
import { formatCurrency, generateTimeSlots, addMinutesToTime, COURT_COLORS, BOOKING_STATUS_LABELS } from '@/lib/utils'
import { Plus, Edit2, Trash2, X, Save, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const DURATIONS = [
  { label: '1 hora', value: 60 },
  { label: '1.5 horas', value: 90 },
  { label: '2 horas', value: 120 },
]

const STATUSES: { label: string; value: BookingStatus; color: string }[] = [
  { label: 'Confirmada', value: 'confirmed', color: 'bg-green-500' },
  { label: 'Pendiente', value: 'pending', color: 'bg-yellow-500' },
  { label: 'Cancelada', value: 'cancelled', color: 'bg-red-500' },
]

interface BookingForm {
  court_id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  players: string
  date: string
  start_time: string
  duration_minutes: number
  status: BookingStatus
  notes: string
  price: number
}

const defaultForm: BookingForm = {
  court_id: 1,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  players: '',
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  duration_minutes: 60,
  status: 'confirmed',
  notes: '',
  price: 15,
}

export default function ReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BookingForm>(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const supabase = createClient()
  const timeSlots = generateTimeSlots(8, 0, 30)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('full_name').eq('id', data.user.id).single().then(({ data: profile }) => {
          setCurrentUser({ id: data.user!.id, name: profile?.full_name || data.user!.email || '' })
        })
      }
    })
  }, [])

  const loadData = useCallback(async () => {
    const [courtsRes, bookingsRes] = await Promise.all([
      supabase.from('courts').select('*').eq('is_active', true).order('id'),
      supabase.from('bookings').select('*, court:courts(*)').eq('date', selectedDate).order('start_time'),
    ])
    setCourts(courtsRes.data || [{ id: 1, name: 'Pista 1', is_active: true }, { id: 2, name: 'Pista 2', is_active: true }, { id: 3, name: 'Pista 3', is_active: true }, { id: 4, name: 'Pista 4', is_active: true }])
    setBookings(bookingsRes.data || [])
  }, [selectedDate])

  useEffect(() => { loadData() }, [loadData])

  function openCreate(courtId?: number, time?: string) {
    setEditingId(null)
    setForm({ ...defaultForm, date: selectedDate, court_id: courtId || 1, start_time: time || '09:00' })
    setShowModal(true)
  }

  function openEdit(booking: Booking) {
    setEditingId(booking.id)
    setForm({
      court_id: booking.court_id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      players: (booking as any).players || '',
      date: booking.date,
      start_time: booking.start_time?.substring(0, 5) || '',
      duration_minutes: booking.duration_minutes,
      status: booking.status,
      notes: booking.notes || '',
      price: booking.price,
    })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    const endTime = addMinutesToTime(form.start_time, form.duration_minutes)
    const data: any = {
      court_id: form.court_id,
      customer_name: form.customer_name,
      customer_email: form.customer_email || null,
      customer_phone: form.customer_phone || null,
      players: form.players || null,
      date: form.date,
      start_time: form.start_time,
      end_time: endTime,
      duration_minutes: form.duration_minutes,
      status: form.status,
      notes: form.notes || null,
      price: form.price,
      created_by: currentUser?.id || null,
    }

    if (editingId) {
      await supabase.from('bookings').update(data).eq('id', editingId)
    } else {
      const { data: newBooking } = await supabase.from('bookings').insert(data).select().single()
      if (newBooking && form.status !== 'cancelled') {
        await supabase.from('cash_register').insert({
          date: form.date,
          type: 'booking',
          reference_id: newBooking.id,
          concept: `Reserva Pista ${form.court_id} — ${form.customer_name}`,
          amount: form.price,
          created_by: currentUser?.id || null,
        })
      }
    }

    // Send email notification
    if (!editingId && form.status !== 'cancelled') {
      try {
        const endTime = addMinutesToTime(form.start_time, form.duration_minutes)
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmation',
            data: {
              customerName: form.customer_name,
              customerEmail: form.customer_email,
              courtName: `Pista ${form.court_id}`,
              date: form.date,
              startTime: form.start_time,
              endTime,
              price: form.price,
              players: form.players,
              staffName: currentUser?.name,
            },
          }),
        })
      } catch {}
    }

    setShowModal(false)
    setLoading(false)
    loadData()
  }

  async function handleDelete(id: number) {
    await supabase.from('bookings').delete().eq('id', id)
    await supabase.from('cash_register').delete().eq('type', 'booking').eq('reference_id', id)
    setDeleteConfirm(null)
    loadData()
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function getBookingForSlot(courtId: number, time: string): Booking | null {
    return bookings.find(b =>
      b.court_id === courtId &&
      b.start_time?.substring(0, 5) === time &&
      b.status !== 'cancelled'
    ) || null
  }

  function isSlotOccupied(courtId: number, time: string): Booking | null {
    return bookings.find(b => {
      if (b.court_id !== courtId || b.status === 'cancelled') return false
      const start = b.start_time?.substring(0, 5) || ''
      const end = b.end_time?.substring(0, 5) || ''
      return time >= start && time < end
    }) || null
  }

  const displayCourts = courts.length > 0 ? courts : [
    { id: 1, name: 'Pista 1', is_active: true },
    { id: 2, name: 'Pista 2', is_active: true },
    { id: 3, name: 'Pista 3', is_active: true },
    { id: 4, name: 'Pista 4', is_active: true },
  ]

  const dateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CalendarDays className="text-blue-400" size={32} />
            Reservas
          </h1>
          <p className="text-gray-400 mt-1 capitalize">{dateFormatted}</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 px-6 py-3 bg-lime-400 hover:bg-lime-300 text-gray-900 font-bold rounded-xl text-lg transition-all shadow-lg shadow-lime-400/20"
        >
          <Plus size={22} />
          Nueva Reserva
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">
          <ChevronLeft size={20} />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 text-center"
        />
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium text-sm"
        >
          Hoy
        </button>
      </div>

      {/* Grid Calendar */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="flex border-b border-gray-700">
              <div className="w-20 flex-shrink-0 px-4 py-3 text-gray-400 text-sm font-medium">Hora</div>
              {displayCourts.map((court, i) => (
                <div key={court.id} className="flex-1 px-4 py-3 text-center text-sm font-bold" style={{ color: COURT_COLORS[i % 4] }}>
                  {court.name}
                </div>
              ))}
            </div>
            {/* Body */}
            <div className="flex">
              {/* Time column */}
              <div className="w-20 flex-shrink-0">
                {timeSlots.map((time) => (
                  <div key={time} className="h-12 px-4 flex items-center text-gray-400 text-sm font-mono border-b border-gray-700/50">
                    {time}
                  </div>
                ))}
              </div>
              {/* Court columns */}
              {displayCourts.map((court, courtIdx) => (
                <div key={court.id} className="flex-1 relative">
                  {/* Slot backgrounds */}
                  {timeSlots.map((time) => {
                    const occupied = isSlotOccupied(court.id, time)
                    return (
                      <div key={time} className="h-12 px-1 py-0.5 border-b border-gray-700/50">
                        {!occupied && (
                          <button
                            onClick={() => openCreate(court.id, time)}
                            className="w-full h-full rounded-lg border-2 border-dashed border-gray-700 hover:border-lime-400/50 hover:bg-lime-400/5 transition-all text-gray-600 hover:text-lime-400 text-xs"
                          >
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {/* Booking overlays */}
                  {bookings
                    .filter(b => b.court_id === court.id && b.status !== 'cancelled')
                    .map((booking) => {
                      const startStr = booking.start_time?.substring(0, 5) || ''
                      const slotIndex = timeSlots.indexOf(startStr)
                      if (slotIndex === -1) return null
                      const slotCount = booking.duration_minutes / 30
                      const topPx = slotIndex * 48 // h-12 = 48px
                      const heightPx = slotCount * 48
                      return (
                        <div
                          key={booking.id}
                          className="absolute left-1 right-1 rounded-xl p-2 cursor-pointer hover:opacity-90 transition-all z-10 overflow-hidden"
                          style={{
                            top: `${topPx + 2}px`,
                            height: `${heightPx - 4}px`,
                            backgroundColor: COURT_COLORS[courtIdx % 4] + '30',
                            borderLeft: `4px solid ${COURT_COLORS[courtIdx % 4]}`,
                          }}
                          onClick={() => openEdit(booking)}
                        >
                          <p className="text-white font-bold text-sm truncate">{booking.customer_name}</p>
                          <p className="text-gray-300 text-xs">{booking.start_time?.substring(0, 5)} - {booking.end_time?.substring(0, 5)}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                            booking.status === 'confirmed' ? 'bg-green-500/30 text-green-300' :
                            booking.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
                          }`}>{BOOKING_STATUS_LABELS[booking.status]}</span>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking List */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Listado de Reservas — {dateFormatted}</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay reservas para este día</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COURT_COLORS[(booking.court_id - 1) % 4] }}></div>
                  <div>
                    <p className="text-white font-bold">{booking.customer_name}</p>
                    <p className="text-gray-400 text-sm">
                      Pista {booking.court_id} — {booking.start_time?.substring(0, 5)} a {booking.end_time?.substring(0, 5)} — {formatCurrency(booking.price)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  }`}>{BOOKING_STATUS_LABELS[booking.status]}</span>
                  <button onClick={() => openEdit(booking)} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-all">
                    <Edit2 size={18} />
                  </button>
                  {deleteConfirm === booking.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(booking.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium">Sí</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(booking.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-all">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Creado por */}
              {currentUser && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="text-cyan-400 text-xs font-medium">Registra:</span>
                  <span className="text-white text-sm font-bold">{currentUser.name}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Reserva a nombre de *</label>
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                  placeholder="Nombre de quien reserva" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400" placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                  <input type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400" placeholder="+34 600 000 000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Jugadores (nombres separados por coma)</label>
                <input value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400"
                  placeholder="Ej: Juan, Pedro, María, Ana" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Pista</label>
                  <select value={form.court_id} onChange={(e) => setForm({ ...form, court_id: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400">
                    {displayCourts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Hora</label>
                  <select value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400">
                    {generateTimeSlots(8, 0, 15).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Duración</label>
                  <select value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400">
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Precio (€)</label>
                  <input type="number" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                <div className="flex gap-2">
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => setForm({ ...form, status: s.value })}
                      className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                        form.status === s.value
                          ? `${s.color} text-white shadow-lg`
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-lime-400" rows={2} placeholder="Notas opcionales..." />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading || !form.customer_name}
                className="flex-1 py-3 bg-lime-400 hover:bg-lime-300 text-gray-900 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} />
                {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
