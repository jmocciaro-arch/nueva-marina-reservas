'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel } from '@/lib/export-excel'
import type { Tournament, TournamentCategory, TournamentKind } from '@/lib/types'
import { Trophy, Plus, Edit2, Trash2, X, Save, Users, Download, Eye, Swords, Image as ImageIcon, Link as LinkIcon, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'

const FORMATS = [
  { value: 'elimination', label: 'Eliminación Directa' },
  { value: 'preliminary', label: 'Fase Previa + Eliminación' },
  { value: 'groups', label: 'Fase de Grupos' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'Próximo', color: 'bg-blue-500/20 text-blue-400' },
  active: { label: 'En Curso', color: 'bg-green-500/20 text-green-400' },
  finished: { label: 'Finalizado', color: 'bg-gray-500/20 text-gray-400' },
}

interface CompetitionForm {
  name: string
  start_date: string
  end_date: string
  status: string
  format: string
  categories: string[]
  cover_image_url: string
}

const defaultForm: CompetitionForm = {
  name: '', start_date: '', end_date: '', status: 'upcoming', format: 'elimination',
  categories: ['5ta', '6ta', '7ma', 'Libre'], cover_image_url: ''
}

interface Props {
  kind: TournamentKind
}

export default function CompetitionManager({ kind }: Props) {
  const labels = kind === 'league'
    ? { titleSingular: 'Liga', titlePlural: 'Ligas', newBtn: 'Nueva Liga', editBtn: 'Editar Liga', placeholder: 'Ej: Liga Anual 2026', empty: 'No hay ligas creadas. Creá la primera!', defaultFormat: 'groups' as const }
    : { titleSingular: 'Torneo', titlePlural: 'Torneos', newBtn: 'Nuevo Torneo', editBtn: 'Editar Torneo', placeholder: 'Ej: Torneo Apertura 2026', empty: 'No hay torneos creados. Creá el primero!', defaultFormat: 'elimination' as const }

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [registrations, setRegistrations] = useState<Record<number, number>>({})
  const [showModal, setShowModal] = useState(false)
  const [showRegModal, setShowRegModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CompetitionForm>({ ...defaultForm, format: labels.defaultFormat })
  const [regTournament, setRegTournament] = useState<Tournament | null>(null)
  const [categories, setCategories] = useState<TournamentCategory[]>([])
  const [regForm, setRegForm] = useState({ category_id: 0, player1_name: '', player1_email: '', player1_phone: '', player2_name: '', player2_email: '', player2_phone: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: t } = await supabase.from('tournaments').select('*').eq('kind', kind).order('start_date', { ascending: false })
    setTournaments(t || [])
    if (t && t.length > 0) {
      const ids = t.map(x => x.id)
      const { data: regs } = await supabase.from('tournament_registrations').select('tournament_id').in('tournament_id', ids)
      const counts: Record<number, number> = {}
      regs?.forEach(r => { counts[r.tournament_id] = (counts[r.tournament_id] || 0) + 1 })
      setRegistrations(counts)
    }
  }, [kind])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditingId(null)
    setForm({ ...defaultForm, format: labels.defaultFormat })
    setCoverMode('url'); setUploadError(null)
    setShowModal(true)
  }

  function openEdit(t: Tournament) {
    setEditingId(t.id)
    setForm({ name: t.name, start_date: t.start_date, end_date: t.end_date || '', status: t.status, format: t.format, categories: [], cover_image_url: t.cover_image_url || '' })
    setCoverMode('url'); setUploadError(null)
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    const data = {
      name: form.name, start_date: form.start_date, end_date: form.end_date || null,
      status: form.status, format: form.format, kind,
      cover_image_url: form.cover_image_url.trim() || null,
    }
    if (editingId) {
      await supabase.from('tournaments').update(data).eq('id', editingId)
    } else {
      const { data: newT } = await supabase.from('tournaments').insert(data).select().single()
      if (newT && form.categories.length > 0) {
        await supabase.from('tournament_categories').insert(
          form.categories.map(name => ({ tournament_id: newT.id, name }))
        )
      }
    }
    setShowModal(false); setLoading(false); loadData()
  }

  async function handleDelete(id: number) {
    await supabase.from('tournament_registrations').delete().eq('tournament_id', id)
    await supabase.from('tournament_categories').delete().eq('tournament_id', id)
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('tournaments').delete().eq('id', id)
    setDeleteConfirm(null); loadData()
  }

  async function openRegistration(t: Tournament) {
    setRegTournament(t)
    const { data } = await supabase.from('tournament_categories').select('*').eq('tournament_id', t.id)
    setCategories(data || [])
    setRegForm({ category_id: data?.[0]?.id || 0, player1_name: '', player1_email: '', player1_phone: '', player2_name: '', player2_email: '', player2_phone: '' })
    setShowRegModal(true)
  }

  async function handleRegister() {
    if (!regTournament) return
    setLoading(true)
    await supabase.from('tournament_registrations').insert({
      tournament_id: regTournament.id,
      category_id: regForm.category_id,
      player1_name: regForm.player1_name,
      player1_email: regForm.player1_email || null,
      player1_phone: regForm.player1_phone || null,
      player2_name: regForm.player2_name,
      player2_email: regForm.player2_email || null,
      player2_phone: regForm.player2_phone || null,
      status: 'confirmed',
    })
    setShowRegModal(false); setLoading(false); loadData()
  }

  function handleExport() {
    exportToExcel(tournaments.map(t => ({
      Nombre: t.name, Fecha_Inicio: t.start_date, Fecha_Fin: t.end_date || '',
      Estado: STATUS_LABELS[t.status]?.label || t.status, Formato: t.format,
      Inscriptos: registrations[t.id] || 0
    })), labels.titlePlural.toLowerCase())
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    if (!file.type.startsWith('image/')) { setUploadError('El archivo debe ser una imagen'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('La imagen no debe superar 5 MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('tournament-covers').upload(path, file, { upsert: false })
    if (error) { setUploadError(error.message); setUploading(false); return }
    const { data: pub } = supabase.storage.from('tournament-covers').getPublicUrl(path)
    setForm(f => ({ ...f, cover_image_url: pub.publicUrl }))
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="text-yellow-400" size={32} /> {labels.titlePlural}
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all">
            <Download size={18} /> Exportar
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl text-lg transition-all shadow-lg shadow-yellow-500/20">
            <Plus size={22} /> {labels.newBtn}
          </button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
          <Trophy size={64} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{labels.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-yellow-500/30 transition-all">
              <div
                className={`relative p-6 ${tournament.cover_image_url ? '' : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20'}`}
                style={tournament.cover_image_url ? { backgroundImage: `url(${tournament.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {tournament.cover_image_url && <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-gray-900/10" />}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <Trophy size={28} className="text-yellow-400 drop-shadow-lg" />
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[tournament.status]?.color}`}>
                      {STATUS_LABELS[tournament.status]?.label}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-xl mt-3 drop-shadow-lg">{tournament.name}</h3>
                  <p className="text-gray-200 text-sm mt-1 drop-shadow">
                    {new Date(tournament.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Formato:</span>
                  <span className="text-white font-medium">{FORMATS.find(f => f.value === tournament.format)?.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Inscriptos:</span>
                  <span className="text-white font-bold text-lg">{registrations[tournament.id] || 0} parejas</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/torneos/${tournament.id}`}
                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    <Eye size={16} /> Ver
                  </Link>
                  <button onClick={() => openRegistration(tournament)}
                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    <Users size={16} /> Inscribir
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(tournament)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-xl font-medium flex items-center justify-center gap-2 text-sm">
                    <Edit2 size={14} /> Editar
                  </button>
                  {deleteConfirm === tournament.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(tournament.id)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium">Sí, borrar</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-gray-600 text-white rounded-xl text-sm">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(tournament.id)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2 text-sm">
                      <Trash2 size={14} /> Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editingId ? labels.editBtn : labels.newBtn}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del {labels.titleSingular} *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-yellow-400" placeholder={labels.placeholder} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Inicio</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Fin</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Formato</label>
                <div className="grid grid-cols-1 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={() => setForm({ ...form, format: f.value })}
                      className={`py-3 px-4 rounded-xl font-medium text-sm text-left transition-all ${
                        form.format === f.value ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}>
                      <Swords size={16} className="inline mr-2" />{f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400">
                  <option value="upcoming">Próximo</option>
                  <option value="active">En Curso</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Portada
                </label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setCoverMode('url')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      coverMode === 'url' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}>
                    <LinkIcon size={14} /> Desde URL
                  </button>
                  <button type="button" onClick={() => setCoverMode('upload')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      coverMode === 'upload' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}>
                    <Upload size={14} /> Subir foto
                  </button>
                </div>
                {coverMode === 'url' ? (
                  <input type="url" value={form.cover_image_url}
                    onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-yellow-400" />
                ) : (
                  <div>
                    <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600 border border-dashed border-gray-500 rounded-xl cursor-pointer text-sm text-gray-300 transition-all">
                      {uploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo...</> : <><Upload size={16} /> Elegir imagen (máx 5 MB)</>}
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploading} />
                    </label>
                    {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
                  </div>
                )}
                {form.cover_image_url && (
                  <div className="mt-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.cover_image_url} alt="Portada" className="w-full h-32 object-cover rounded-xl border border-gray-600" />
                    <button type="button" onClick={() => setForm({ ...form, cover_image_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500 rounded-lg text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Categorías</label>
                  <div className="flex flex-wrap gap-2">
                    {['5ta', '6ta', '7ma', '8va', 'Libre', 'Mixto', 'Femenino'].map(cat => (
                      <button key={cat} onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          categories: prev.categories.includes(cat) ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat]
                        }))
                      }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          form.categories.includes(cat) ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.name || !form.start_date}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} />{loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegModal && regTournament && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Inscribir Pareja — {regTournament.name}</h2>
              <button onClick={() => setShowRegModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button key={cat.id} onClick={() => setRegForm({ ...regForm, category_id: cat.id })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          regForm.category_id === cat.id ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'
                        }`}>{cat.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-gray-700/30 rounded-xl p-4 space-y-3">
                <h3 className="text-white font-bold">Jugador 1</h3>
                <input value={regForm.player1_name} onChange={(e) => setRegForm({ ...regForm, player1_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" placeholder="Nombre *" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={regForm.player1_email} onChange={(e) => setRegForm({ ...regForm, player1_email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm" placeholder="Email" />
                  <input value={regForm.player1_phone} onChange={(e) => setRegForm({ ...regForm, player1_phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm" placeholder="Teléfono" />
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-xl p-4 space-y-3">
                <h3 className="text-white font-bold">Jugador 2</h3>
                <input value={regForm.player2_name} onChange={(e) => setRegForm({ ...regForm, player2_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-400" placeholder="Nombre *" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={regForm.player2_email} onChange={(e) => setRegForm({ ...regForm, player2_email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm" placeholder="Email" />
                  <input value={regForm.player2_phone} onChange={(e) => setRegForm({ ...regForm, player2_phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm" placeholder="Teléfono" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowRegModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleRegister} disabled={loading || !regForm.player1_name || !regForm.player2_name}
                className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Users size={18} />{loading ? 'Inscribiendo...' : 'Inscribir Pareja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
