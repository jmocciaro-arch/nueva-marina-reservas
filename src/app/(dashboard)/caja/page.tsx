'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CashEntry } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Plus, Trash2, X, Save, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CajaPage() {
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('cash_register')
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: true })
    setEntries(data || [])
  }, [selectedDate])

  useEffect(() => { loadEntries() }, [loadEntries])

  const totalIncome = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)
  const total = entries.reduce((s, e) => s + e.amount, 0)

  async function handleAdd() {
    setLoading(true)
    await supabase.from('cash_register').insert({
      date: selectedDate,
      type: 'manual',
      concept,
      amount: Number(amount),
    })
    setConcept('')
    setAmount('')
    setShowModal(false)
    setLoading(false)
    loadEntries()
  }

  async function handleDelete(id: number) {
    await supabase.from('cash_register').delete().eq('id', id)
    setDeleteConfirm(null)
    loadEntries()
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    booking: { label: 'Reserva', color: 'text-blue-400' },
    sale: { label: 'Venta', color: 'text-purple-400' },
    manual: { label: 'Manual', color: 'text-gray-400' },
    cancellation: { label: 'Cancelación', color: 'text-red-400' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="text-green-400" size={32} />
            Caja del Día
          </h1>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-500/20">
          <Plus size={22} /> Agregar Movimiento
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronLeft size={20} /></button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 text-center" />
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronRight size={20} /></button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium text-sm">Hoy</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/80 text-sm"><TrendingUp size={18} />Ingresos</div>
          <p className="text-white text-3xl font-bold mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/80 text-sm"><TrendingDown size={18} />Egresos</div>
          <p className="text-white text-3xl font-bold mt-1">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-gradient-to-br from-lime-500 to-lime-600 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-900/70 text-sm"><DollarSign size={18} />Total Caja</div>
          <p className="text-gray-900 text-3xl font-bold mt-1">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Entries */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Movimientos</h2>
        {entries.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Sin movimientos para este día</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${entry.amount >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {entry.amount >= 0 ? <TrendingUp size={18} className="text-green-400" /> : <TrendingDown size={18} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.concept}</p>
                    <p className={`text-sm ${typeLabels[entry.type]?.color || 'text-gray-400'}`}>
                      {typeLabels[entry.type]?.label || entry.type} — {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                  </span>
                  {entry.type === 'manual' && (
                    deleteConfirm === entry.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(entry.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Sí</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(entry.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={16} /></button>
                    )
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
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Nuevo Movimiento</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Concepto *</label>
                <input value={concept} onChange={(e) => setConcept(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-lime-400"
                  placeholder="Ej: Venta de pelotas" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Monto (€) * <span className="text-gray-500">(negativo para egresos)</span></label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-lime-400"
                  placeholder="15.00" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleAdd} disabled={loading || !concept || !amount}
                className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} />{loading ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
