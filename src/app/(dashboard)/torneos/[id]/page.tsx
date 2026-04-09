'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel } from '@/lib/export-excel'
import type { Tournament, TournamentCategory, TournamentRegistration, Match } from '@/lib/types'
import { Trophy, ArrowLeft, Users, Swords, Download, Trash2, Play, Edit2, Save, X } from 'lucide-react'

export default function TournamentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [categories, setCategories] = useState<TournamentCategory[]>([])
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [score, setScore] = useState({ set1_t1: '', set1_t2: '', set2_t1: '', set2_t2: '', set3_t1: '', set3_t2: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const [tRes, catRes, regRes, matchRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_categories').select('*').eq('tournament_id', id),
      supabase.from('tournament_registrations').select('*').eq('tournament_id', id).order('created_at'),
      supabase.from('matches').select('*').eq('tournament_id', id).order('round').order('position'),
    ])
    setTournament(tRes.data)
    setCategories(catRes.data || [])
    setRegistrations(regRes.data || [])
    setMatches(matchRes.data || [])
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
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/torneos')} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" size={28} /> {tournament.name}
          </h1>
          <p className="text-gray-400">{new Date(tournament.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

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
