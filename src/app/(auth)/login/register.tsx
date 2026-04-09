'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, ArrowLeft, Check, Shield } from 'lucide-react'

interface RegisterProps {
  onBack: () => void
}

function SimpleCaptcha({ onVerify }: { onVerify: (ok: boolean) => void }) {
  const [a] = useState(Math.floor(Math.random() * 10) + 1)
  const [b] = useState(Math.floor(Math.random() * 10) + 1)
  const [answer, setAnswer] = useState('')

  function check(val: string) {
    setAnswer(val)
    onVerify(Number(val) === a + b)
  }

  return (
    <div className="flex items-center gap-3 bg-gray-700/50 rounded-xl p-4">
      <Shield size={20} className="text-cyan-400 flex-shrink-0" />
      <span className="text-gray-300 text-sm">¿Cuánto es {a} + {b}?</span>
      <input
        type="number"
        value={answer}
        onChange={(e) => check(e.target.value)}
        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:ring-2 focus:ring-cyan-400"
        placeholder="?"
      />
      {Number(answer) === a + b && <Check size={20} className="text-green-400" />}
    </div>
  )
}

export default function RegisterForm({ onBack }: RegisterProps) {
  const [form, setForm] = useState({ name: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [captchaOk, setCaptchaOk] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!captchaOk) { setError('Completá el captcha correctamente'); return }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!form.name || !form.lastName || !form.email || !form.phone) { setError('Completá todos los campos'); return }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: `${form.name} ${form.lastName}`,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Update profile with extra data
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: `${form.name} ${form.lastName}`,
        last_name: form.lastName,
        phone: form.phone,
        role: 'client',
      })
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl">
          <Check size={32} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">¡Registro exitoso!</h2>
        <p className="text-gray-400">
          Te enviamos un email de confirmación a <span className="text-cyan-400">{form.email}</span>.
          Revisá tu bandeja de entrada y hacé clic en el enlace para activar tu cuenta.
        </p>
        <button onClick={onBack}
          className="mt-4 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl transition-all">
          Volver al Login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-2">
        <ArrowLeft size={16} /> Volver al login
      </button>

      <h2 className="text-xl font-bold text-white">Crear Cuenta</h2>
      <p className="text-gray-400 text-sm">Registrate para reservar pistas y participar en torneos</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
            placeholder="Juan" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Apellido *</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
            placeholder="García" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
          placeholder="email@ejemplo.com" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono *</label>
        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
          placeholder="+34 600 000 000" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña *</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
            placeholder="Min. 6 chars" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar *</label>
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-cyan-400"
            placeholder="Repetir" required />
        </div>
      </div>

      <SimpleCaptcha onVerify={setCaptchaOk} />

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <button type="submit" disabled={loading || !captchaOk}
        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
        <UserPlus size={22} />
        {loading ? 'Creando cuenta...' : 'Registrarse'}
      </button>
    </form>
  )
}
