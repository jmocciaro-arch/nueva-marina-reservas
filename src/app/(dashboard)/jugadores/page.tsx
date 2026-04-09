'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel } from '@/lib/export-excel'
import type { Player } from '@/lib/types'
import { Users, Plus, Edit2, Trash2, X, Save, Download, Search } from 'lucide-react'

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data || [])
  }, [])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  function openCreate() { setEditingId(null); setForm({ name: '', email: '', phone: '' }); setShowModal(true) }
  function openEdit(p: Player) {
    setEditingId(p.id); setForm({ name: p.name, email: p.email || '', phone: p.phone || '' }); setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    const data = { name: form.name, email: form.email || null, phone: form.phone || null }
    if (editingId) { await supabase.from('players').update(data).eq('id', editingId) }
    else { await supabase.from('players').insert(data) }
    setShowModal(false); setLoading(false); loadPlayers()
  }

  async function handleDelete(id: number) {
    await supabase.from('players').delete().eq('id', id)
    setDeleteConfirm(null); loadPlayers()
  }

  function handleExport() {
    exportToExcel(players.map(p => ({ Nombre: p.name, Email: p.email || '', Telefono: p.phone || '', Registro: p.created_at?.split('T')[0] || '' })), 'jugadores')
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="text-cyan-400" size={32} /> Jugadores
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium"><Download size={18} /> Exportar</button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-cyan-500/20">
            <Plus size={22} /> Nuevo Jugador
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 text-lg"
          placeholder="Buscar jugador..." />
      </div>

      <p className="text-gray-400">{filtered.length} jugadores registrados</p>

      {/* Players List */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-sm">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Teléfono</th>
                <th className="px-5 py-3 text-left">Registro</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-gray-400 text-center py-8">No se encontraron jugadores</td></tr>
              ) : filtered.map((player) => (
                <tr key={player.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-5 py-4 text-white font-bold">{player.name}</td>
                  <td className="px-5 py-4 text-gray-300">{player.email || '—'}</td>
                  <td className="px-5 py-4 text-gray-300">{player.phone || '—'}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{player.created_at ? new Date(player.created_at).toLocaleDateString('es-ES') : '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(player)} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400"><Edit2 size={16} /></button>
                      {deleteConfirm === player.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(player.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Sí</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(player.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Jugador' : 'Nuevo Jugador'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-cyan-400" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400" placeholder="+34 600 000 000" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.name}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} />{loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
