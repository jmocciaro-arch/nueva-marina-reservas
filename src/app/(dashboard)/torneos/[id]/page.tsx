'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel } from '@/lib/export-excel'
import type { Tournament, TournamentCategory, TournamentRegistration, Match, Player, RegistrationStatus } from '@/lib/types'
import { Trophy, ArrowLeft, Users, Swords, Download, Trash2, Play, Edit2, Save, X, UserPlus } from 'lucide-react'

export default function TournamentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [categories, setCategories] = useState<TournamentCategory[]>([])
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [score, setScore] = useState({ set1_t1: '', set1_t2: '', set2_t1: '', set2_t2: '', set3_t1: '', set3_t2: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRegModal, setShowRegModal] = useState(false)
  const emptyReg = {
    category_id: 0,
    player1_name: '', player1_email: '', player1_phone: '',
    player2_name: '', player2_email: '', player2_phone: '',
    status: 'confirmed' as RegistrationStatus,
  }
  const [newReg, setNewReg] = useState(emptyReg)
  const [focusedField, setFocusedField] = useState<'p1' | 'p2' | null>(null)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const [tRes, catRes, regRes, matchRes, playersRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_categories').select('*').eq('tournament_id', id),
      supabase.from('tournament_registrations').select('*').eq('tournament_id', id).order('created_at'),
      supabase.from('matches').select('*').eq('tournament_id', id).order('round').order('position'),
      supabase.from('players').select('*').order('name'),
    ])
    setTournament(tRes.data)
    setCategories(catRes.data || [])
    setRegistrations(regRes.data || [])
    setMatches(matchRes.data || [])
    setPlayers(playersRes.data || [])
    if (catRes.data?.[0] && !selectedCat) setSelectedCat(catRes.data[0].id)
  }, [id, selectedCat])

  useEffect(() => { loadData() }, [loadData])

  const catRegistrations = registrations.filter(r => !selectedCat || r.category_id === selectedCat)
  const catMatches = matches.filter(m => !selectedCat || m.category_id === selectedCat)

  async function generateBracket() {
    if (!selectedCat) return
    setLoading(true)
    const regs = catRegistrations.filter(r => r.status === 'confirmed')
    const n = regs.length
    if (n < 2) { setLoading(false); return }

    // Find next power of 2
    let size = 2
    while (size < n) size *= 2
    const totalRounds = Math.log2(size)

    // Delete existing matches for this category
    await supabase.from('matches').delete().eq('tournament_id', id).eq('category_id', selectedCat)

    // Generate first round
    const shuffled = [...regs].sort(() => Math.random() - 0.5)
    const firstRoundMatches = []
    for (let i = 0; i < size / 2; i++) {
      firstRoundMatches.push({
        tournament_id: id,
        category_id: selectedCat,
        round: 1,
        position: i + 1,
        team1_registration_id: shuffled[i * 2]?.id || null,
        team2_registration_id: shuffled[i * 2 + 1]?.id || null,
        status: 'pending' as const,
      })
    }
    await supabase.from('matches').insert(firstRoundMatches)

    // Generate subsequent rounds (empty)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = size / Math.pow(2, round)
      const emptyMatches = []
      for (let pos = 1; pos <= matchesInRound; pos++) {
        emptyMatches.push({
          tournament_id: id,
          category_id: selectedCat,
          round,
          position: pos,
          team1_registration_id: null,
          team2_registration_id: null,
          status: 'pending' as const,
        })
      }
      if (emptyMatches.length > 0) await supabase.from('matches').insert(emptyMatches)
    }

    setLoading(false)
    loadData()
  }

  function openScoreModal(match: Match) {
    setEditingMatch(match)
    setScore({ set1_t1: '', set1_t2: '', set2_t1: '', set2_t2: '', set3_t1: '', set3_t2: '' })
    setShowScoreModal(true)
  }

  async function saveScore() {
    if (!editingMatch) return
    setLoading(true)
    const sets = []
    if (score.set1_t1 && score.set1_t2) sets.push({ t1: Number(score.set1_t1), t2: Number(score.set1_t2) })
    if (score.set2_t1 && score.set2_t2) sets.push({ t1: Number(score.set2_t1), t2: Number(score.set2_t2) })
    if (score.set3_t1 && score.set3_t2) sets.push({ t1: Number(score.set3_t1), t2: Number(score.set3_t2) })

    const setsWonT1 = sets.filter(s => s.t1 > s.t2).length
    const setsWonT2 = sets.filter(s => s.t2 > s.t1).length
    const winnerId = setsWonT1 > setsWonT2 ? editingMatch.team1_registration_id : editingMatch.team2_registration_id
    const scoreStr = sets.map(s => `${s.t1}-${s.t2}`).join(' ')

    await supabase.from('matches').update({
      score_team1: scoreStr, sets_detail: sets, winner_registration_id: winnerId, status: 'finished'
    }).eq('id', editingMatch.id)

    // Advance winner to next round
    const nextRound = editingMatch.round + 1
    const nextPos = Math.ceil(editingMatch.position / 2)
    const nextMatch = catMatches.find(m => m.round === nextRound && m.position === nextPos)
    if (nextMatch && winnerId) {
      const field = editingMatch.position % 2 === 1 ? 'team1_registration_id' : 'team2_registration_id'
      await supabase.from('matches').update({ [field]: winnerId }).eq('id', nextMatch.id)
    }

    setShowScoreModal(false); setLoading(false); loadData()
  }

  async function deleteRegistration(regId: number) {
    await supabase.from('tournament_registrations').delete().eq('id', regId)
    setDeleteConfirm(null); loadData()
  }

  function openRegModal() {
    setNewReg({ ...emptyReg, category_id: selectedCat || categories[0]?.id || 0 })
    setFocusedField(null)
    setShowRegModal(true)
  }

  async function saveRegistration() {
    if (!newReg.category_id || !newReg.player1_name.trim() || !newReg.player2_name.trim()) return
    setLoading(true)
    await supabase.from('tournament_registrations').insert({
      tournament_id: id,
      category_id: newReg.category_id,
      player1_name: newReg.player1_name.trim(),
      player1_email: newReg.player1_email.trim() || null,
      player1_phone: newReg.player1_phone.trim() || null,
      player2_name: newReg.player2_name.trim(),
      player2_email: newReg.player2_email.trim() || null,
      player2_phone: newReg.player2_phone.trim() || null,
      status: newReg.status,
    })
    setShowRegModal(false); setLoading(false); loadData()
  }

  function pickPlayer(slot: 'p1' | 'p2', p: Player) {
    if (slot === 'p1') {
      setNewReg({ ...newReg, player1_name: p.name, player1_email: p.email || '', player1_phone: p.phone || '' })
    } else {
      setNewReg({ ...newReg, player2_name: p.name, player2_email: p.email || '', player2_phone: p.phone || '' })
    }
    setFocusedField(null)
  }

  function matchesFor(query: string) {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return players.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
  }

  function getTeamName(regId: number | null) {
    if (!regId) return 'BYE'
    const reg = registrations.find(r => r.id === regId)
    return reg ? `${reg.player1_name} / ${reg.player2_name}` : '—'
  }

  function handleExportRegs() {
    exportToExcel(catRegistrations.map(r => ({
      Jugador_1: r.player1_name, Email_1: r.player1_email || '', Tel_1: r.player1_phone || '',
      Jugador_2: r.player2_name, Email_2: r.player2_email || '', Tel_2: r.player2_phone || '',
      Estado: r.status,
    })), `inscriptos_${tournament?.name || 'torneo'}`)
  }

  if (!tournament) return <div className="text-gray-400 text-center py-12">Cargando...</div>

  const roundNames = (totalRounds: number, round: number) => {
    const diff = totalRounds - round
    if (diff === 0) return 'Final'
    if (diff === 1) return 'Semifinal'
    if (diff === 2) return 'Cuartos'
    return `Ronda ${round}`
  }

  const maxRound = catMatches.length > 0 ? Math.max(...catMatches.map(m => m.round)) : 0

  return (
    <div className="space-y-6">
      {tournament.cover_image_url ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tournament.cover_image_url} alt={tournament.name} className="w-full h-48 md:h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          <button onClick={() => router.push('/torneos')}
            className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black/80 rounded-xl text-white"><ArrowLeft size={20} /></button>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
              <Trophy className="text-yellow-400" size={28} /> {tournament.name}
            </h1>
            <p className="text-gray-200 drop-shadow">{new Date(tournament.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/torneos')} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="text-yellow-400" size={28} /> {tournament.name}
            </h1>
            <p className="text-gray-400">{new Date(tournament.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedCat === cat.id ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>{cat.name}</button>
          ))}
        </div>
      )}

      {/* Registrations */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-green-400" /> Inscriptos ({catRegistrations.length} parejas)
          </h2>
          <div className="flex gap-2">
            <button onClick={openRegModal} disabled={categories.length === 0}
              className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold text-sm disabled:opacity-50">
              <UserPlus size={14} /> Inscribir pareja
            </button>
            <button onClick={handleExportRegs} className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={generateBracket} disabled={loading || catRegistrations.length < 2}
              className="flex items-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-bold text-sm disabled:opacity-50">
              <Play size={14} /> Generar Llaves
            </button>
          </div>
        </div>
        {catRegistrations.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Sin inscriptos en esta categoría</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {catRegistrations.map((reg, i) => (
              <div key={reg.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm font-mono w-6">{i + 1}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{reg.player1_name} / {reg.player2_name}</p>
                    <p className="text-gray-400 text-xs">{reg.player1_phone || reg.player1_email || ''}</p>
                  </div>
                </div>
                {deleteConfirm === reg.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteRegistration(reg.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Sí</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-600 text-white rounded text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(reg.id)} className="p-1.5 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bracket */}
      {catMatches.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <Swords size={20} className="text-orange-400" /> Cuadro de Llaves
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-8 min-w-max">
              {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => {
                const roundMatches = catMatches.filter(m => m.round === round).sort((a, b) => a.position - b.position)
                return (
                  <div key={round} className="min-w-[280px]">
                    <h3 className="text-center text-yellow-400 font-bold text-sm mb-4">{roundNames(maxRound, round)}</h3>
                    <div className="space-y-4" style={{ paddingTop: round > 1 ? `${Math.pow(2, round - 1) * 16}px` : '0' }}>
                      {roundMatches.map(match => (
                        <div key={match.id} className={`bg-gray-700/50 rounded-xl border ${match.status === 'finished' ? 'border-green-500/30' : 'border-gray-600'}`}
                          style={{ marginBottom: round > 1 ? `${Math.pow(2, round) * 16}px` : '0' }}>
                          <div className={`px-3 py-2 border-b border-gray-600 flex justify-between items-center ${
                            match.winner_registration_id === match.team1_registration_id ? 'bg-green-500/10' : ''
                          }`}>
                            <span className={`text-sm ${match.winner_registration_id === match.team1_registration_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                              {getTeamName(match.team1_registration_id)}
                            </span>
                            {match.score_team1 && <span className="text-gray-400 text-xs font-mono">{match.score_team1}</span>}
                          </div>
                          <div className={`px-3 py-2 flex justify-between items-center ${
                            match.winner_registration_id === match.team2_registration_id ? 'bg-green-500/10' : ''
                          }`}>
                            <span className={`text-sm ${match.winner_registration_id === match.team2_registration_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                              {getTeamName(match.team2_registration_id)}
                            </span>
                          </div>
                          {match.status !== 'finished' && match.team1_registration_id && match.team2_registration_id && (
                            <button onClick={() => openScoreModal(match)}
                              className="w-full py-1.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 text-xs font-medium rounded-b-xl transition-all">
                              Cargar Resultado
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserPlus size={20} className="text-green-400" /> Inscribir pareja</h2>
              <button onClick={() => setShowRegModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-gray-400 text-xs uppercase font-bold block mb-2">Categoría</label>
                <select value={newReg.category_id} onChange={e => setNewReg({ ...newReg, category_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {(['p1', 'p2'] as const).map(slot => {
                const nameKey = slot === 'p1' ? 'player1_name' : 'player2_name'
                const emailKey = slot === 'p1' ? 'player1_email' : 'player2_email'
                const phoneKey = slot === 'p1' ? 'player1_phone' : 'player2_phone'
                const suggestions = focusedField === slot ? matchesFor(newReg[nameKey]) : []
                return (
                  <div key={slot} className="bg-gray-700/40 rounded-xl p-4 space-y-3">
                    <p className="text-white font-bold text-sm">Jugador {slot === 'p1' ? '1' : '2'}</p>
                    <div className="relative">
                      <label className="text-gray-400 text-xs block mb-1">Nombre (escribí para buscar socio)</label>
                      <input type="text" value={newReg[nameKey]}
                        onChange={e => setNewReg({ ...newReg, [nameKey]: e.target.value })}
                        onFocus={() => setFocusedField(slot)}
                        onBlur={() => setTimeout(() => setFocusedField(f => f === slot ? null : f), 150)}
                        placeholder="Nombre y apellido"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                          {suggestions.map(p => (
                            <button key={p.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => pickPlayer(slot, p)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-0">
                              <div>{p.name}</div>
                              {(p.phone || p.email) && <div className="text-gray-400 text-xs">{p.phone || p.email}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Teléfono</label>
                        <input type="tel" value={newReg[phoneKey]}
                          onChange={e => setNewReg({ ...newReg, [phoneKey]: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Email</label>
                        <input type="email" value={newReg[emailKey]}
                          onChange={e => setNewReg({ ...newReg, [emailKey]: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                  </div>
                )
              })}

              <div>
                <label className="text-gray-400 text-xs uppercase font-bold block mb-2">Estado</label>
                <select value={newReg.status} onChange={e => setNewReg({ ...newReg, status: e.target.value as RegistrationStatus })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="confirmed">Confirmada</option>
                  <option value="pending">Pendiente de pago</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800">
              <button onClick={() => setShowRegModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={saveRegistration}
                disabled={loading || !newReg.category_id || !newReg.player1_name.trim() || !newReg.player2_name.trim()}
                className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} /> Inscribir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && editingMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Cargar Resultado</h2>
              <button onClick={() => setShowScoreModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center text-sm">
                <p className="text-white font-medium">{getTeamName(editingMatch.team1_registration_id)}</p>
                <p className="text-gray-400">vs</p>
                <p className="text-white font-medium">{getTeamName(editingMatch.team2_registration_id)}</p>
              </div>
              {[1, 2, 3].map(setNum => (
                <div key={setNum} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-12">Set {setNum}</span>
                  <input type="number" min="0" max="7" value={score[`set${setNum}_t1` as keyof typeof score]}
                    onChange={(e) => setScore({ ...score, [`set${setNum}_t1`]: e.target.value })}
                    className="w-16 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg" placeholder="0" />
                  <span className="text-gray-500">-</span>
                  <input type="number" min="0" max="7" value={score[`set${setNum}_t2` as keyof typeof score]}
                    onChange={(e) => setScore({ ...score, [`set${setNum}_t2`]: e.target.value })}
                    className="w-16 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg" placeholder="0" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowScoreModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={saveScore} disabled={loading || !score.set1_t1}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
