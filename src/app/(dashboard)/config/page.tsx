'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Config, Profile } from '@/lib/types'
import { Settings, Save, Users, Shield, Plus, Trash2, X, UserPlus } from 'lucide-react'

const CONFIG_FIELDS = [
  { key: 'club_name', label: 'Nombre del Club', type: 'text', default: 'Nueva Marina Pádel & Sport' },
  { key: 'location', label: 'Ubicación', type: 'text', default: 'España' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text', default: '' },
  { key: 'email', label: 'Email de contacto', type: 'text', default: '' },
  { key: 'web', label: 'Sitio Web', type: 'text', default: 'www.nuevamarina.es' },
  { key: 'courts_count', label: 'Cantidad de pistas', type: 'number', default: '4' },
  { key: 'price_1h', label: 'Precio 1 hora (€)', type: 'number', default: '15' },
  { key: 'price_1_5h', label: 'Precio 1.5 horas (€)', type: 'number', default: '20' },
  { key: 'price_2h', label: 'Precio 2 horas (€)', type: 'number', default: '25' },
  { key: 'open_time', label: 'Hora apertura', type: 'time', default: '08:00' },
  { key: 'close_time', label: 'Hora cierre', type: 'time', default: '00:00' },
  { key: 'slot_interval', label: 'Intervalo slots (minutos)', type: 'number', default: '15' },
  { key: 'points_win', label: 'Puntos por victoria', type: 'number', default: '10' },
  { key: 'points_loss', label: 'Puntos por derrota', type: 'number', default: '-5' },
  { key: 'points_participation', label: 'Puntos por participar', type: 'number', default: '2' },
]

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffForm, setStaffForm] = useState({ email: '', password: '', full_name: '', role: 'staff' as 'admin' | 'staff' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const supabase = createClient()

  const loadConfig = useCallback(async () => {
    const { data } = await supabase.from('config').select('*')
    const cfg: Record<string, string> = {}
    CONFIG_FIELDS.forEach(f => { cfg[f.key] = f.default })
    data?.forEach((row: Config) => { cfg[row.key] = row.value })
    setConfig(cfg)
  }, [])

  const loadStaff = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['admin', 'staff']).order('role').order('full_name')
    setStaffList(data || [])
  }, [])

  useEffect(() => { loadConfig(); loadStaff() }, [loadConfig, loadStaff])

  async function handleSaveConfig() {
    setSaving(true)
    for (const [key, value] of Object.entries(config)) {
      const { data: existing } = await supabase.from('config').select('key').eq('key', key).single()
      if (existing) {
        await supabase.from('config').update({ value }).eq('key', key)
      } else {
        await supabase.from('config').insert({ key, value, description: CONFIG_FIELDS.find(f => f.key === key)?.label || key })
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleCreateStaff() {
    setSaving(true)
    const res = await fetch('/api/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffForm),
    })
    const result = await res.json()
    if (!res.ok) {
      alert(result.error || 'Error al crear usuario')
    }
    setShowStaffModal(false)
    setSaving(false)
    setStaffForm({ email: '', password: '', full_name: '', role: 'staff' })
    loadStaff()
  }

  async function deleteStaffMember(id: string) {
    await supabase.from('profiles').delete().eq('id', id)
    setDeleteConfirm(null)
    loadStaff()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3">
        <Settings className="text-gray-400" size={32} /> Configuración
      </h1>

      {/* Club Config */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Datos del Club & Precios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONFIG_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
              <input
                type={field.type}
                value={config[field.key] || ''}
                onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button onClick={handleSaveConfig} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-lg transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20">
            <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
          {saved && <span className="text-green-400 font-medium">Guardado correctamente</span>}
        </div>
      </div>

      {/* Staff Management */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={20} className="text-yellow-400" /> Administradores & Staff
          </h2>
          <button onClick={() => setShowStaffModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold transition-all">
            <UserPlus size={18} /> Agregar
          </button>
        </div>

        <div className="space-y-3">
          {staffList.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay usuarios registrados</p>
          ) : staffList.map((staff) => (
            <div key={staff.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${staff.role === 'admin' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                  {staff.role === 'admin' ? <Shield size={20} className="text-yellow-400" /> : <Users size={20} className="text-blue-400" />}
                </div>
                <div>
                  <p className="text-white font-bold">{staff.full_name || 'Sin nombre'}</p>
                  <p className="text-gray-400 text-sm">{staff.phone || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${staff.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {staff.role === 'admin' ? 'ADMIN' : 'STAFF'}
                </span>
                {deleteConfirm === staff.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteStaffMember(staff.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Sí</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(staff.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Nuevo Usuario</h2>
              <button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre completo *</label>
                <input value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-yellow-400" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña *</label>
                <input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
                <div className="flex gap-3">
                  <button onClick={() => setStaffForm({ ...staffForm, role: 'admin' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${staffForm.role === 'admin' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'}`}>
                    <Shield size={16} className="inline mr-1" /> Admin
                  </button>
                  <button onClick={() => setStaffForm({ ...staffForm, role: 'staff' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${staffForm.role === 'staff' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    <Users size={16} className="inline mr-1" /> Staff
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowStaffModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleCreateStaff} disabled={saving || !staffForm.full_name || !staffForm.email || !staffForm.password}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} /> Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
