import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM_EMAIL = 'Nueva Marina Pádel <onboarding@resend.dev>'
const ADMIN_EMAIL = 'nuevamarina.padel@gmail.com'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not configured')
  return new Resend(key)
}

export async function POST(request: NextRequest) {
  try {
    const resend = getResend()
    const body = await request.json()
    const { type, data } = body

    if (type === 'booking_confirmation') {
      const { customerName, customerEmail, courtName, date, startTime, endTime, price, players, staffName } = data
      const subject = `Reserva Confirmada — ${courtName} — ${date}`
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:30px;text-align:center">
            <img src="https://www.nuevamarina.es/wp-content/uploads/2026/02/LOGONUEVAMARINA_pantone319C_pantone432C-1.png" alt="Nueva Marina Pádel & Sport" width="280" style="max-width:280px;height:auto;display:block;margin:0 auto"/>
            <p style="margin:5px 0 0;color:#e0f2fe;font-size:14px">Pádel & Sport — Confirmación de Reserva</p>
          </div>
          <div style="padding:30px">
            <h2 style="color:#22d3ee;margin:0 0 20px">¡Reserva Confirmada!</h2>
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px">
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Nombre:</strong> ${customerName}</p>
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Pista:</strong> ${courtName}</p>
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Fecha:</strong> ${date}</p>
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Horario:</strong> ${startTime} - ${endTime}</p>
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Precio:</strong> ${price}€</p>
              ${players ? `<p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Jugadores:</strong> ${players}</p>` : ''}
              ${staffName ? `<p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Registrado por:</strong> ${staffName}</p>` : ''}
            </div>
            <p style="color:#64748b;font-size:13px">Si necesitás cancelar o modificar la reserva, contactanos por WhatsApp o en recepción.</p>
          </div>
          <div style="background:#1e293b;padding:15px;text-align:center">
            <p style="margin:0;color:#64748b;font-size:12px">Nueva Marina Pádel & Sport — www.nuevamarina.es</p>
          </div>
        </div>
      `
      const emails = [ADMIN_EMAIL]
      if (customerEmail) emails.push(customerEmail)

      await resend.emails.send({ from: FROM_EMAIL, to: emails, subject, html })
      return NextResponse.json({ ok: true })
    }

    if (type === 'welcome') {
      const { name, email } = data
      const subject = '¡Bienvenido a Nueva Marina Pádel & Sport! 🎾'
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:30px;text-align:center">
            <img src="https://www.nuevamarina.es/wp-content/uploads/2026/02/LOGONUEVAMARINA_pantone319C_pantone432C-1.png" alt="Nueva Marina Pádel & Sport" width="280" style="max-width:280px;height:auto;display:block;margin:0 auto"/>
            <p style="margin:5px 0 0;color:#e0f2fe;font-size:14px">Pádel & Sport</p>
          </div>
          <div style="padding:30px">
            <h2 style="color:#22d3ee;margin:0 0 20px">¡Bienvenido/a ${name}!</h2>
            <p style="color:#94a3b8;line-height:1.6">Tu cuenta ha sido creada exitosamente. Ya podés reservar pistas, participar en torneos y mucho más.</p>
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin:20px 0">
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Email:</strong> ${email}</p>
              <p style="margin:8px 0;color:#94a3b8"><strong style="color:#fff">Contraseña:</strong> La que elegiste al registrarte</p>
            </div>
            <a href="https://nueva-marina-reservas.vercel.app/login" style="display:inline-block;background:#06b6d4;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:10px">Iniciar Sesión</a>
            <p style="color:#64748b;font-size:13px;margin-top:20px">¡Te esperamos en las pistas!</p>
          </div>
          <div style="background:#1e293b;padding:15px;text-align:center">
            <p style="margin:0;color:#64748b;font-size:12px">Nueva Marina Pádel & Sport — www.nuevamarina.es</p>
          </div>
        </div>
      `
      await resend.emails.send({ from: FROM_EMAIL, to: [email, ADMIN_EMAIL], subject, html })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
