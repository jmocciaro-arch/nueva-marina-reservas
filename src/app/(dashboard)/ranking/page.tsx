'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel } from '@/lib/export-excel'
import type { RankingEntry, Player } from '@/lib/types'
import { Medal, Download, RefreshCw } from 'lucide-react'

export default function RankingPage() {
  const [ranking, setRanking] = useState<(RankingEntry & { player?: Player })[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadRanking() }, [])

  async function loadRanking() {
    const { data } = await supabase.from('ranking').select('*, player:players(*)').order('points', { ascending: false })
    setRanking(data || [])
  }

  async function recalculate() {
    setLoading(true)
    // Get all finished matches
    const { data: matches } = await supabase.from('matches').select('*').eq('status', 'finished')
    const { data: regs } = await supabase.from('tournament_registrations').select('*')
    const { data: players } = await supabase.from('players').select('*')
    if (!matches || !regs || !players) { setLoading(false); return }

    const playerStats: Record<number, { mp: number; mw: number; ml: number; gw: number; gl: number; pts: number }> = {}
    const initPlayer = (id: number) => { if (!playerStats[id]) playerStats[id] = { mp: 0, mw: 0, ml: 0, gw: 0, gl: 0, pts: 0 } }

    matches.forEach(match => {
      if (!match.winner_registration_id) return
      const reg1 = regs.find(r => r.id === match.team1_registration_id)
      const reg2 = regs.find(r => r.id === match.team2_registration_id)
      if (!reg1 || !reg2) return

      // Find player IDs by name
      const findPlayer = (name: string) => players.find(p => p.name === name)

      const processPlayer = (name: string, isWinnerTeam: boolean, setsDetail: any[]) => {
        const player = findPlayer(name)
        if (!player) return
        initPlayer(player.id)
        const s = playerStats[player.id]
        s.mp++
        if (isWinnerTeam) { s.mw++; s.pts += 10 } else { s.ml++; s.pts -= 5 }
        if (setsDetail) {
          setsDetail.forEach((set: any) => {
            if (isWinnerTeam && match.team1_registration_id === match.winner_registration_id) {
              s.gw += (set.t1 || 0); s.gl += (set.t2 || 0)
            } else {
              s.gw += (set.t2 || 0); s.gl += (set.t1 || 0)
            }
          })
        }
      }

      const isTeam1Winner = match.winner_registration_id === match.team1_registration_id
      processPlayer(reg1.player1_name, isTeam1Winner, match.sets_detail || [])
      processPlayer(reg1.player2_name, isTeam1Winner, match.sets_detail || [])
      processPlayer(reg2.player1_name, !isTeam1Winner, match.sets_detail || [])
      processPlayer(reg2.player2_name, !isTeam1Winner, match.sets_detail || [])
    })

    // Delete old ranking and insert new
    await supabase.from('ranking').delete().neq('id', 0)
    const entries = Object.entries(playerStats).map(([pid, s]) => ({
      player_id: Number(pid), matches_played: s.mp, matches_won: s.mw, matches_lost: s.ml,
      games_won: s.gw, games_lost: s.gl, points: s.pts,
    }))
    if (entries.length > 0) await supabase.from('ranking').insert(entries)

    setLoading(false)
    loadRanking()
  }

  function handleExport() {
    exportToExcel(ranking.map((r, i) => ({
      Posicion: i + 1, Jugador: r.player?.name || '', PJ: r.matches_played, PG: r.matches_won,
      PP: r.matches_lost, Games_G: r.games_won, Games_P: r.games_lost, Puntos: r.points,
      Win_Rate: r.matches_played > 0 ? `${Math.round((r.matches_won / r.matches_played) * 100)}%` : '0%'
    })), 'ranking')
  }

  const medals = ['🥇', '🥈', '🥉']
  const podiumColors = ['from-yellow-500/20 to-yellow-600/20 border-yellow-500/30', 'from-gray-400/20 to-gray-500/20 border-gray-400/30', 'from-orange-600/20 to-orange-700/20 border-orange-600/30']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Medal className="text-orange-400" size={32} /> Ranking
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all">
            <Download size={18} /> Exportar
          </button>
          <button onClick={recalculate} disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold transition-all disabled:opacity-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Recalcular
          </button>
        </div>
      </div>

      {/* Podium */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {ranking.slice(0, 3).map((entry, i) => (
            <div key={entry.id} className={`bg-gradient-to-br ${podiumColors[i]} rounded-2xl p-6 border text-center`}>
              <span className="text-4xl">{medals[i]}</span>
              <p className="text-white font-bold text-lg mt-2">{entry.player?.name || 'Jugador'}</p>
              <p className="text-cyan-400 font-bold text-3xl mt-1">+{entry.points}</p>
              <p className="text-gray-400 text-sm mt-1">
                {entry.matches_won}V / {entry.matches_lost}D — {entry.matches_played > 0 ? Math.round((entry.matches_won / entry.matches_played) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Full Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-sm">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Jugador</th>
                <th className="px-4 py-3 text-center">PJ</th>
                <th className="px-4 py-3 text-center">PG</th>
                <th className="px-4 py-3 text-center">PP</th>
                <th className="px-4 py-3 text-center">G+</th>
                <th className="px-4 py-3 text-center">G-</th>
                <th className="px-4 py-3 text-center">Puntos</th>
                <th className="px-4 py-3 text-center">Win %</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr><td colSpan={9} className="text-gray-400 text-center py-8">Sin datos de ranking. Jugá torneos y recalculá.</td></tr>
              ) : ranking.map((entry, i) => (
                <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-lg">{i < 3 ? medals[i] : <span className="text-gray-500 font-mono">{i + 1}</span>}</td>
                  <td className="px-4 py-3 text-white font-bold">{entry.player?.name || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{entry.matches_played}</td>
                  <td className="px-4 py-3 text-center text-green-400 font-medium">{entry.matches_won}</td>
                  <td className="px-4 py-3 text-center text-red-400 font-medium">{entry.matches_lost}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{entry.games_won}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{entry.games_lost}</td>
                  <td className="px-4 py-3 text-center text-cyan-400 font-bold text-lg">{entry.points > 0 ? '+' : ''}{entry.points}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.matches_played > 0 && (entry.matches_won / entry.matches_played) >= 0.7 ? 'bg-green-500/20 text-green-400' :
                      entry.matches_played > 0 && (entry.matches_won / entry.matches_played) >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.matches_played > 0 ? `${Math.round((entry.matches_won / entry.matches_played) * 100)}%` : '0%'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
