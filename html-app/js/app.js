// ==================== AUTH ====================
let editingBookingId = null
let editingPlayerId = null
let editingProductId = null
let editingTournamentId = null
let bookingStatus = 'confirmed'
let staffRole = 'staff'
let saleProduct = null
let saleQty = 1
let allBookings = []
let allCash = []
let allProducts = []
let allPlayers = []
let allProfiles = []
let mainChart = null, hoursChart = null, courtsChart = null

// Check auth on load
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await db.auth.getUser()
  if (user) {
    await initApp(user)
  } else {
    document.getElementById('loginPage').classList.remove('hidden')
    document.getElementById('appPage').classList.add('hidden')
  }
  // Populate time select
  const timeSelect = document.getElementById('bkTime')
  generateTimeSlots(8, 0, 15).forEach(t => {
    const opt = document.createElement('option')
    opt.value = t; opt.textContent = t
    timeSelect.appendChild(opt)
  })
})

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  document.getElementById('loginError').classList.add('hidden')
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    document.getElementById('loginError').textContent = 'Email o contrasena incorrectos'
    document.getElementById('loginError').classList.remove('hidden')
    return
  }
  await initApp(data.user)
})

async function initApp(user) {
  currentUser = user
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()
  currentProfile = profile
  document.getElementById('loginPage').classList.add('hidden')
  document.getElementById('appPage').classList.remove('hidden')
  // Set dates
  const today = new Date().toISOString().split('T')[0]
  document.getElementById('bookingDateInput').value = today
  document.getElementById('cashDateInput').value = today
  // Load all data
  await Promise.all([loadAllData(), loadBookings(), loadCash()])
  renderDashboard()
}

async function logout() {
  await db.auth.signOut()
  document.getElementById('loginPage').classList.remove('hidden')
  document.getElementById('appPage').classList.add('hidden')
  currentUser = null
  currentProfile = null
}

async function loadAllData() {
  const [bRes, cRes, pRes, plRes, prRes] = await Promise.all([
    db.from('bookings').select('*').order('date', { ascending: false }),
    db.from('cash_register').select('*').order('date', { ascending: false }),
    db.from('products').select('*').order('category').order('name'),
    db.from('players').select('*').order('name'),
    db.from('profiles').select('*'),
  ])
  allBookings = bRes.data || []
  allCash = cRes.data || []
  allProducts = pRes.data || []
  allPlayers = plRes.data || []
  allProfiles = prRes.data || []
}

// ==================== NAVIGATION ====================
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.getElementById('sec-' + name).classList.add('active')
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'))
  document.querySelector(`[data-section="${name}"]`).classList.add('active')
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('mobileOverlay').classList.remove('open')
  // Reload section data
  if (name === 'dashboard') renderDashboard()
  if (name === 'reservas') loadBookings()
  if (name === 'caja') loadCash()
  if (name === 'tienda') renderProducts()
  if (name === 'torneos') renderTournaments()
  if (name === 'ligas') renderLeagues()
  if (name === 'ranking') renderRanking()
  if (name === 'jugadores') renderPlayers()
  if (name === 'config') renderConfig()
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
  document.getElementById('mobileOverlay').classList.toggle('open')
}

function togglePassword(id, btn) {
  const input = document.getElementById(id)
  input.type = input.type === 'password' ? 'text' : 'password'
  btn.textContent = input.type === 'password' ? '👁' : '🔒'
}

function openModal(id) { document.getElementById(id).classList.add('open') }
function closeModal(id) { document.getElementById(id).classList.remove('open') }

// ==================== DASHBOARD ====================
let currentDashLayout = 'executive'
let analyticsMonthChart = null, analyticsRevenueChart = null, analyticsHoursChart2 = null, analyticsCourtsChart2 = null

function changeDashLayout(layout) {
  currentDashLayout = layout
  document.querySelectorAll('[id^="dash-"]').forEach(el => {
    if (el.id.startsWith('dash-')) el.classList.add('hidden')
  })
  document.getElementById('dash-' + layout)?.classList.remove('hidden')
  renderDashboard()
}

function searchDashPlayers() {
  const q = (document.getElementById('dashPlayerSearch')?.value || '').toLowerCase()
  const filtered = allPlayers.filter(p => (p.name || '').toLowerCase().includes(q) || (p.last_name || '').toLowerCase().includes(q)).slice(0, 8)
  document.getElementById('dashPlayerResults').innerHTML = filtered.length === 0 ? '<p style="color:#64748b">Sin resultados</p>' :
    filtered.map(p => `<div class="list-item"><div class="info"><div class="dot" style="background:#06b6d4"></div><div><h4>${p.name} ${p.last_name || ''}</h4><p>${p.category || 'Sin cat.'} — ${p.city || ''}</p></div></div><span class="badge badge-cyan">${p.phone || ''}</span></div>`).join('')
}

function renderDashboard() {
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.substring(0, 7)
  const active = allBookings.filter(b => b.status !== 'cancelled')
  const todayB = active.filter(b => b.date === today)
  const monthB = active.filter(b => b.date?.startsWith(thisMonth))
  const totalRev = allCash.filter(e => e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
  const monthRev = allCash.filter(e => e.date?.startsWith(thisMonth) && e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
  const todayRev = allCash.filter(e => e.date === today && e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)

  document.getElementById('dashStats').innerHTML = [
    { label: 'Reservas Hoy', value: todayB.length, bg: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
    { label: 'Reservas Mes', value: monthB.length, bg: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { label: 'Total Reservas', value: active.length, bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    { label: 'Ingresos Hoy', value: formatCurrency(todayRev), bg: 'linear-gradient(135deg,#22c55e,#16a34a)' },
    { label: 'Ingresos Mes', value: formatCurrency(monthRev), bg: 'linear-gradient(135deg,#84cc16,#65a30d)' },
    { label: 'Total Ingresos', value: formatCurrency(totalRev), bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  ].map(c => `<div class="stat-card" style="background:${c.bg}"><p class="label">${c.label}</p><p class="value">${c.value}</p></div>`).join('')

  // Render based on current layout
  if (currentDashLayout === 'executive') {
    renderMainChart('month')
    renderHoursChart()
    renderCourtsChart()
    renderTopClients()
    renderStaffStats()
  }
  if (currentDashLayout === 'operations') {
    const el = document.getElementById('dashStatsOps')
    if (el) el.innerHTML = document.getElementById('dashStats').innerHTML
    // Today bookings
    const todayB = active.filter(b => b.date === today).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    const tbEl = document.getElementById('todayBookingsOps')
    if (tbEl) tbEl.innerHTML = todayB.length === 0 ? '<p style="color:#64748b;text-align:center;padding:16px">No hay reservas para hoy</p>' :
      todayB.map(b => `<div class="list-item"><div class="info"><div class="dot" style="background:${COURT_COLORS[(b.court_id-1)%4]}"></div><div><h4>${b.customer_name}</h4><p>Pista ${b.court_id} — ${b.start_time?.substring(0,5)} a ${b.end_time?.substring(0,5)}</p></div></div><span class="badge badge-${b.status==='confirmed'?'green':'yellow'}">${b.status==='confirmed'?'Confirmada':'Pendiente'}</span></div>`).join('')
    // Recent activity
    const raEl = document.getElementById('recentActivityOps')
    if (raEl) raEl.innerHTML = allBookings.slice(0, 8).map(b => {
      const cr = allProfiles.find(p => p.id === b.created_by)
      return `<div class="list-item" style="border-left:3px solid ${b.status==='cancelled'?'#ef4444':b.status==='confirmed'?'#22c55e':'#f59e0b'}"><div class="info"><div><h4>${b.customer_name}</h4><p>${formatDate(b.date)} — Pista ${b.court_id}${cr ? ' — por '+cr.full_name : ''}</p></div></div><span style="color:#94a3b8;font-size:13px">${formatCurrency(Number(b.price))}</span></div>`
    }).join('')
  }
  if (currentDashLayout === 'analytics') {
    const el = document.getElementById('dashStatsAn')
    if (el) el.innerHTML = document.getElementById('dashStats').innerHTML
    // Monthly bookings chart
    const monthlyData = {}
    active.forEach(b => { const m = b.date?.substring(0,7); if(m){if(!monthlyData[m])monthlyData[m]={label:new Date(b.date+'T12:00:00').toLocaleDateString('es-ES',{month:'short',year:'2-digit'}),count:0,rev:0};monthlyData[m].count++;monthlyData[m].rev+=Number(b.price)||0} })
    const md = Object.values(monthlyData).slice(-12)
    if (analyticsMonthChart) analyticsMonthChart.destroy()
    const amc = document.getElementById('analyticsMonthChart')
    if (amc) analyticsMonthChart = new Chart(amc, { type:'bar', data:{labels:md.map(d=>d.label),datasets:[{label:'Reservas',data:md.map(d=>d.count),backgroundColor:'#06b6d4',borderRadius:8}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}},y:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}}}} })
    if (analyticsRevenueChart) analyticsRevenueChart.destroy()
    const arc = document.getElementById('analyticsRevenueChart')
    if (arc) analyticsRevenueChart = new Chart(arc, { type:'line', data:{labels:md.map(d=>d.label),datasets:[{label:'Ingresos',data:md.map(d=>d.rev),borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.1)',fill:true,tension:0.3}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}},y:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}}}} })
    // Hours
    const hours = {}
    active.forEach(b => { const h = b.start_time?.substring(0,2)+'h'; if(h)hours[h]=(hours[h]||0)+1 })
    const hs = Object.entries(hours).sort((a,b)=>a[0].localeCompare(b[0]))
    if (analyticsHoursChart2) analyticsHoursChart2.destroy()
    const ahc = document.getElementById('analyticsHoursChart')
    if (ahc) analyticsHoursChart2 = new Chart(ahc, { type:'bar', data:{labels:hs.map(s=>s[0]),datasets:[{label:'Reservas',data:hs.map(s=>s[1]),backgroundColor:'#f59e0b',borderRadius:8}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}},y:{ticks:{color:'#64748b'},grid:{color:'#1e293b'}}}} })
    // Courts
    const cc = {}; active.forEach(b => { const n=`P${b.court_id}`; cc[n]=(cc[n]||0)+1 })
    if (analyticsCourtsChart2) analyticsCourtsChart2.destroy()
    const acc = document.getElementById('analyticsCourtsChart')
    if (acc) analyticsCourtsChart2 = new Chart(acc, { type:'doughnut', data:{labels:Object.keys(cc),datasets:[{data:Object.values(cc),backgroundColor:COURT_COLORS}]}, options:{responsive:true,plugins:{legend:{labels:{color:'#94a3b8'}}}} })
  }
  if (currentDashLayout === 'members') {
    const el = document.getElementById('dashStatsMemb')
    if (el) {
      el.innerHTML = [
        { label: 'Jugadores', value: allPlayers.length, bg: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
        { label: 'Reservas Totales', value: active.length, bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
        { label: 'Ingresos Total', value: formatCurrency(totalRev), bg: 'linear-gradient(135deg,#22c55e,#16a34a)' },
      ].map(c => `<div class="stat-card" style="background:${c.bg}"><p class="label">${c.label}</p><p class="value">${c.value}</p></div>`).join('')
    }
    searchDashPlayers()
    // Active tournaments
    const atEl = document.getElementById('dashActiveTournaments')
    if (atEl) {
      db.from('tournaments').select('*').in('status',['upcoming','active']).then(({data}) => {
        atEl.innerHTML = (data||[]).length === 0 ? '<p style="color:#64748b">Sin torneos activos</p>' :
          (data||[]).map(t => `<div class="list-item"><div class="info"><div><h4>🏆 ${t.name}</h4><p>${t.start_date ? formatDate(t.start_date) : ''}</p></div></div><span class="badge badge-${t.status==='active'?'green':'blue'}">${t.status==='active'?'En Curso':'Proximo'}</span></div>`).join('')
      })
    }
    // Active leagues
    const alEl = document.getElementById('dashActiveLeagues')
    if (alEl) {
      db.from('leagues').select('*').in('status',['upcoming','active']).then(({data}) => {
        alEl.innerHTML = (data||[]).length === 0 ? '<p style="color:#64748b">Sin ligas activas</p>' :
          (data||[]).map(l => `<div class="list-item"><div class="info"><div><h4>⚽ ${l.name}</h4><p>${l.start_date ? formatDate(l.start_date) : ''}</p></div></div><span class="badge badge-${l.status==='active'?'green':'blue'}">${l.status==='active'?'En Curso':'Proxima'}</span></div>`).join('')
      })
    }
  }
}

function changePeriod(period, btn) {
  document.querySelectorAll('.period-selector button').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  renderMainChart(period)
}

function renderMainChart(period) {
  const active = allBookings.filter(b => b.status !== 'cancelled')
  const grouped = {}
  active.forEach(b => {
    const d = new Date(b.date + 'T12:00:00')
    let key, label
    if (period === 'month') { key = b.date?.substring(0, 7); label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }) }
    else if (period === 'quarter') { const q = Math.ceil((d.getMonth() + 1) / 3); key = `${d.getFullYear()}-Q${q}`; label = `Q${q} ${d.getFullYear()}` }
    else { key = `${d.getFullYear()}`; label = `${d.getFullYear()}` }
    if (!grouped[key]) grouped[key] = { label, reservas: 0, ingresos: 0 }
    grouped[key].reservas++
    grouped[key].ingresos += Number(b.price) || 0
  })
  const data = Object.values(grouped).slice(-12)
  if (mainChart) mainChart.destroy()
  mainChart = new Chart(document.getElementById('mainChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Reservas', data: data.map(d => d.reservas), backgroundColor: '#06b6d4', borderRadius: 8 },
        { label: 'Ingresos (EUR)', data: data.map(d => d.ingresos), backgroundColor: '#22c55e', borderRadius: 8, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
        y1: { position: 'right', ticks: { color: '#64748b' }, grid: { display: false } }
      }
    }
  })
}

function renderHoursChart() {
  const hours = {}
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const h = b.start_time?.substring(0, 2) + ':00'
    if (h) hours[h] = (hours[h] || 0) + 1
  })
  const sorted = Object.entries(hours).sort((a, b) => a[0].localeCompare(b[0]))
  if (hoursChart) hoursChart.destroy()
  hoursChart = new Chart(document.getElementById('hoursChart'), {
    type: 'bar',
    data: { labels: sorted.map(s => s[0]), datasets: [{ label: 'Reservas', data: sorted.map(s => s[1]), backgroundColor: '#f59e0b', borderRadius: 8 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } } } }
  })
}

function renderCourtsChart() {
  const counts = {}
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => { const n = `Pista ${b.court_id}`; counts[n] = (counts[n] || 0) + 1 })
  if (courtsChart) courtsChart.destroy()
  courtsChart = new Chart(document.getElementById('courtsChart'), {
    type: 'doughnut',
    data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: COURT_COLORS }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } } }
  })
}

function renderTopClients() {
  const clients = {}
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const n = b.customer_name || 'Sin nombre'
    if (!clients[n]) clients[n] = { nombre: n, reservas: 0, gasto: 0 }
    clients[n].reservas++; clients[n].gasto += Number(b.price) || 0
  })
  const top = Object.values(clients).sort((a, b) => b.reservas - a.reservas).slice(0, 5)
  const medals = ['🥇', '🥈', '🥉']
  document.getElementById('topClients').innerHTML = top.length === 0 ? '<p style="color:#64748b;text-align:center;padding:16px">Sin datos aun</p>' :
    top.map((c, i) => `<div class="item"><span class="rank">${medals[i] || i + 1}</span><div class="info"><h4>${c.nombre}</h4><p>${c.reservas} reservas</p></div><span class="value">${formatCurrency(c.gasto)}</span></div>`).join('')
}

function renderStaffStats() {
  const staff = {}
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const p = allProfiles.find(pr => pr.id === b.created_by)
    const n = p?.full_name || 'Sin asignar'
    if (!staff[n]) staff[n] = { nombre: n, reservas: 0 }
    staff[n].reservas++
  })
  const sorted = Object.values(staff).sort((a, b) => b.reservas - a.reservas).slice(0, 5)
  const max = sorted[0]?.reservas || 1
  document.getElementById('staffStats').innerHTML = sorted.length === 0 ? '<p style="color:#64748b;text-align:center;padding:16px">Sin datos aun</p>' :
    sorted.map(s => `<div style="background:rgba(51,65,85,0.3);border-radius:12px;padding:12px 16px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:white;font-weight:700;font-size:14px">${s.nombre}</span><span style="color:#06b6d4;font-weight:700">${s.reservas}</span></div><div class="progress-bar"><div class="fill" style="width:${(s.reservas / max) * 100}%"></div></div></div>`).join('')
}

// ==================== RESERVAS ====================
async function loadBookings() {
  const date = document.getElementById('bookingDateInput').value
  const d = new Date(date + 'T12:00:00')
  document.getElementById('reservasDate').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const { data } = await db.from('bookings').select('*').eq('date', date).order('start_time')
  const bookings = data || []
  const slots = generateTimeSlots(8, 0, 30)
  const courts = [{ id: 1, name: 'Pista 1' }, { id: 2, name: 'Pista 2' }, { id: 3, name: 'Pista 3' }, { id: 4, name: 'Pista 4' }]

  let html = '<div class="time-col"><div class="slot" style="height:44px;border-bottom:1px solid #334155">&nbsp;</div>'
  slots.forEach(t => { html += `<div class="slot">${t}</div>` })
  html += '</div>'

  courts.forEach((court, ci) => {
    const courtBookings = bookings.filter(b => b.court_id === court.id && b.status !== 'cancelled')
    html += `<div class="court-col"><div class="header" style="color:${COURT_COLORS[ci]}">${court.name}</div>`
    slots.forEach(t => {
      const occupied = courtBookings.some(b => { const s = b.start_time?.substring(0, 5) || ''; const e = b.end_time?.substring(0, 5) || ''; return t >= s && t < e })
      html += `<div class="slot ${occupied ? '' : 'empty'}" ${!occupied ? `onclick="openBookingModal(${court.id},'${t}')"` : ''}>${!occupied ? '<span>+</span>' : ''}</div>`
    })
    // Booking blocks
    courtBookings.forEach(b => {
      const startStr = b.start_time?.substring(0, 5) || ''
      const idx = slots.indexOf(startStr)
      if (idx === -1) return
      const count = b.duration_minutes / 30
      const top = (idx * 48) + 44 + 2
      const height = (count * 48) - 4
      html += `<div class="booking-block" style="top:${top}px;height:${height}px;background:${COURT_COLORS[ci]}30;border-left:4px solid ${COURT_COLORS[ci]}" onclick="editBooking(${b.id})"><div class="name">${b.customer_name}</div><div class="time">${startStr} - ${b.end_time?.substring(0, 5)}</div><span class="badge badge-${b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'yellow' : 'red'}" style="font-size:10px">${b.status === 'confirmed' ? 'Confirmada' : b.status === 'pending' ? 'Pendiente' : 'Cancelada'}</span></div>`
    })
    html += '</div>'
  })
  document.getElementById('bookingGrid').innerHTML = html

  // List
  document.getElementById('bookingList').innerHTML = bookings.length === 0 ? '<p style="color:#64748b;text-align:center;padding:32px">No hay reservas para este dia</p>' :
    bookings.map(b => {
      const creator = allProfiles.find(p => p.id === b.created_by)
      return `<div class="list-item"><div class="info"><div class="dot" style="background:${COURT_COLORS[(b.court_id - 1) % 4]}"></div><div><h4>${b.customer_name}</h4><p>Pista ${b.court_id} — ${b.start_time?.substring(0, 5)} a ${b.end_time?.substring(0, 5)} — ${formatCurrency(b.price)}${creator ? ` — por ${creator.full_name}` : ''}</p></div></div><div class="actions"><span class="badge badge-${b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'yellow' : 'red'}">${b.status === 'confirmed' ? 'Confirmada' : b.status === 'pending' ? 'Pendiente' : 'Cancelada'}</span><button class="btn-icon" style="color:#3b82f6" onclick="editBooking(${b.id})">✏</button><button class="btn-icon" style="color:#ef4444" onclick="deleteBooking(${b.id})">🗑</button></div></div>`
    }).join('')
}

function changeBookingDate(days) {
  const input = document.getElementById('bookingDateInput')
  const d = new Date(input.value)
  d.setDate(d.getDate() + days)
  input.value = d.toISOString().split('T')[0]
  loadBookings()
}
function goToday() { document.getElementById('bookingDateInput').value = new Date().toISOString().split('T')[0]; loadBookings() }

function openBookingModal(courtId, time) {
  editingBookingId = null
  document.getElementById('bookingModalTitle').textContent = 'Nueva Reserva'
  document.getElementById('bkName').value = ''
  document.getElementById('bkEmail').value = ''
  document.getElementById('bkPhone').value = ''
  document.getElementById('bkPlayers').value = ''
  document.getElementById('bkCourt').value = courtId || 1
  document.getElementById('bkDate').value = document.getElementById('bookingDateInput').value
  document.getElementById('bkTime').value = time || '09:00'
  document.getElementById('bkDuration').value = 60
  document.getElementById('bkPrice').value = 15
  document.getElementById('bkNotes').value = ''
  bookingStatus = 'confirmed'
  updateStatusButtons()
  if (currentProfile) {
    document.getElementById('bookingStaffBadge').classList.remove('hidden')
    document.getElementById('bookingStaffName').textContent = currentProfile.full_name || currentUser.email
  }
  openModal('bookingModal')
}

async function editBooking(id) {
  const { data: b } = await db.from('bookings').select('*').eq('id', id).single()
  if (!b) return
  editingBookingId = id
  document.getElementById('bookingModalTitle').textContent = 'Editar Reserva'
  document.getElementById('bkName').value = b.customer_name
  document.getElementById('bkEmail').value = b.customer_email || ''
  document.getElementById('bkPhone').value = b.customer_phone || ''
  document.getElementById('bkPlayers').value = b.players || ''
  document.getElementById('bkCourt').value = b.court_id
  document.getElementById('bkDate').value = b.date
  document.getElementById('bkTime').value = b.start_time?.substring(0, 5) || ''
  document.getElementById('bkDuration').value = b.duration_minutes
  document.getElementById('bkPrice').value = b.price
  document.getElementById('bkNotes').value = b.notes || ''
  bookingStatus = b.status
  updateStatusButtons()
  if (currentProfile) {
    document.getElementById('bookingStaffBadge').classList.remove('hidden')
    document.getElementById('bookingStaffName').textContent = currentProfile.full_name || currentUser.email
  }
  openModal('bookingModal')
}

function setBookingStatus(status, btn) {
  bookingStatus = status
  updateStatusButtons()
}

function updateStatusButtons() {
  const btns = document.querySelectorAll('.status-buttons button')
  btns[0].className = bookingStatus === 'confirmed' ? 'btn-green' : 'inactive'
  btns[1].className = bookingStatus === 'pending' ? 'btn-yellow' : 'inactive'
  btns[2].className = bookingStatus === 'cancelled' ? 'btn-red' : 'inactive'
}

async function saveBooking() {
  const name = document.getElementById('bkName').value
  if (!name) return alert('Ingresa el nombre')
  const endTime = addMinutesToTime(document.getElementById('bkTime').value, Number(document.getElementById('bkDuration').value))
  const data = {
    court_id: Number(document.getElementById('bkCourt').value),
    customer_name: name,
    customer_email: document.getElementById('bkEmail').value || null,
    customer_phone: document.getElementById('bkPhone').value || null,
    players: document.getElementById('bkPlayers').value || null,
    date: document.getElementById('bkDate').value,
    start_time: document.getElementById('bkTime').value,
    end_time: endTime,
    duration_minutes: Number(document.getElementById('bkDuration').value),
    status: bookingStatus,
    notes: document.getElementById('bkNotes').value || null,
    price: Number(document.getElementById('bkPrice').value),
    created_by: currentUser?.id || null,
  }
  if (editingBookingId) {
    await db.from('bookings').update(data).eq('id', editingBookingId)
  } else {
    const { data: nb } = await db.from('bookings').insert(data).select().single()
    if (nb && bookingStatus !== 'cancelled') {
      await db.from('cash_register').insert({ date: data.date, type: 'booking', reference_id: nb.id, concept: `Reserva Pista ${data.court_id} — ${name}`, amount: data.price, created_by: currentUser?.id })
    }
  }
  closeModal('bookingModal')
  await loadAllData()
  loadBookings()
}

async function deleteBooking(id) {
  if (!confirm('Eliminar esta reserva?')) return
  await db.from('bookings').delete().eq('id', id)
  await db.from('cash_register').delete().eq('type', 'booking').eq('reference_id', id)
  await loadAllData()
  loadBookings()
}

// ==================== CAJA ====================
async function loadCash() {
  const date = document.getElementById('cashDateInput').value
  const { data } = await db.from('cash_register').select('*').eq('date', date).order('created_at')
  const entries = data || []
  const income = entries.filter(e => e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
  const expense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(Number(e.amount)), 0)
  const total = entries.reduce((s, e) => s + Number(e.amount), 0)

  document.getElementById('cashSummary').innerHTML = `
    <div class="stat-card" style="background:linear-gradient(135deg,#22c55e,#16a34a)"><p class="label">Ingresos</p><p class="value">${formatCurrency(income)}</p></div>
    <div class="stat-card" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><p class="label">Egresos</p><p class="value">${formatCurrency(expense)}</p></div>
    <div class="stat-card" style="background:linear-gradient(135deg,#84cc16,#65a30d)"><p class="label">Total Caja</p><p class="value">${formatCurrency(total)}</p></div>
  `
  const typeLabels = { booking: ['Reserva', '#3b82f6'], sale: ['Venta', '#8b5cf6'], manual: ['Manual', '#64748b'], cancellation: ['Cancelacion', '#ef4444'] }
  document.getElementById('cashList').innerHTML = entries.length === 0 ? '<p style="color:#64748b;text-align:center;padding:32px">Sin movimientos para este dia</p>' :
    entries.map(e => {
      const [label, color] = typeLabels[e.type] || ['Otro', '#64748b']
      return `<div class="list-item"><div class="info"><div style="padding:8px;border-radius:8px;background:${e.amount >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}">${e.amount >= 0 ? '📈' : '📉'}</div><div><h4>${e.concept}</h4><p style="color:${color}">${label} — ${new Date(e.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p></div></div><span style="color:${e.amount >= 0 ? '#4ade80' : '#f87171'};font-size:16px;font-weight:700">${e.amount >= 0 ? '+' : ''}${formatCurrency(e.amount)}</span></div>`
    }).join('')
}

function changeCashDate(days) {
  const input = document.getElementById('cashDateInput')
  const d = new Date(input.value); d.setDate(d.getDate() + days)
  input.value = d.toISOString().split('T')[0]; loadCash()
}
function goCashToday() { document.getElementById('cashDateInput').value = new Date().toISOString().split('T')[0]; loadCash() }

function openCashModal() { document.getElementById('cashConcept').value = ''; document.getElementById('cashAmount').value = ''; openModal('cashModal') }

async function saveCash() {
  const concept = document.getElementById('cashConcept').value
  const amount = document.getElementById('cashAmount').value
  if (!concept || !amount) return alert('Completa todos los campos')
  await db.from('cash_register').insert({ date: document.getElementById('cashDateInput').value, type: 'manual', concept, amount: Number(amount), created_by: currentUser?.id })
  closeModal('cashModal'); await loadAllData(); loadCash()
}

// ==================== TIENDA ====================
function renderProducts() {
  const categories = [...new Set(allProducts.map(p => p.category))]
  document.getElementById('shopFilters').innerHTML = `<button class="btn btn-sm ${!window._shopFilter ? 'btn-purple' : 'btn-gray'}" onclick="filterShop(null)">Todos (${allProducts.length})</button>` +
    categories.map(c => `<button class="btn btn-sm ${window._shopFilter === c ? 'btn-purple' : 'btn-gray'}" onclick="filterShop('${c}')">${c} (${allProducts.filter(p => p.category === c).length})</button>`).join('')

  const filtered = window._shopFilter ? allProducts.filter(p => p.category === window._shopFilter) : allProducts
  document.getElementById('productGrid').innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="image">📦</div>
      <div class="body">
        <div class="category">${p.category}</div>
        <div class="name">${p.name}</div>
        <div class="price-row">
          <span class="price">${formatCurrency(p.price)}</span>
          <span class="badge ${p.stock > 5 ? 'badge-green' : p.stock > 0 ? 'badge-yellow' : 'badge-red'}">Stock: ${p.stock}</span>
        </div>
        <div class="actions">
          <button class="btn btn-green btn-sm" onclick="openSaleModal(${p.id})" ${p.stock <= 0 ? 'disabled style="opacity:0.4"' : ''}>🛒 Vender</button>
          <button class="btn btn-sm" style="background:rgba(59,130,246,0.2);color:#60a5fa" onclick="editProduct(${p.id})">✏</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171" onclick="deleteProduct(${p.id})">🗑</button>
        </div>
      </div>
    </div>
  `).join('')
}

function filterShop(cat) { window._shopFilter = cat; renderProducts() }

function openProductModal() {
  editingProductId = null
  document.getElementById('productModalTitle').textContent = 'Nuevo Producto'
  document.getElementById('prName').value = ''; document.getElementById('prCategory').value = 'Paletas'
  document.getElementById('prPrice').value = 0; document.getElementById('prStock').value = 0
  openModal('productModal')
}

async function editProduct(id) {
  const p = allProducts.find(pr => pr.id === id)
  if (!p) return
  editingProductId = id
  document.getElementById('productModalTitle').textContent = 'Editar Producto'
  document.getElementById('prName').value = p.name; document.getElementById('prCategory').value = p.category
  document.getElementById('prPrice').value = p.price; document.getElementById('prStock').value = p.stock
  openModal('productModal')
}

async function saveProduct() {
  const data = { name: document.getElementById('prName').value, category: document.getElementById('prCategory').value, price: Number(document.getElementById('prPrice').value), stock: Number(document.getElementById('prStock').value), is_active: true }
  if (!data.name) return alert('Ingresa el nombre')
  if (editingProductId) await db.from('products').update(data).eq('id', editingProductId)
  else await db.from('products').insert(data)
  closeModal('productModal'); await loadAllData(); renderProducts()
}

async function deleteProduct(id) {
  if (!confirm('Eliminar este producto?')) return
  await db.from('products').delete().eq('id', id)
  await loadAllData(); renderProducts()
}

function openSaleModal(id) {
  saleProduct = allProducts.find(p => p.id === id); saleQty = 1
  document.getElementById('saleName').textContent = saleProduct.name
  document.getElementById('salePrice').textContent = formatCurrency(saleProduct.price) + ' c/u'
  document.getElementById('saleQty').textContent = saleQty
  document.getElementById('saleTotal').textContent = formatCurrency(saleProduct.price * saleQty)
  openModal('saleModal')
}

function changeSaleQty(delta) {
  saleQty = Math.max(1, Math.min(saleProduct.stock, saleQty + delta))
  document.getElementById('saleQty').textContent = saleQty
  document.getElementById('saleTotal').textContent = formatCurrency(saleProduct.price * saleQty)
}

async function confirmSale() {
  const total = saleProduct.price * saleQty
  const today = new Date().toISOString().split('T')[0]
  await db.from('sales').insert({ product_id: saleProduct.id, quantity: saleQty, unit_price: saleProduct.price, total, created_by: currentUser?.id })
  await db.from('products').update({ stock: saleProduct.stock - saleQty }).eq('id', saleProduct.id)
  await db.from('cash_register').insert({ date: today, type: 'sale', concept: `Venta: ${saleQty}x ${saleProduct.name}`, amount: total, created_by: currentUser?.id })
  closeModal('saleModal'); await loadAllData(); renderProducts()
}

// ==================== TORNEOS ====================
function renderTournaments() {
  db.from('tournaments').select('*').order('start_date', { ascending: false }).then(({ data }) => {
    const tournaments = data || []
    document.getElementById('tournamentList').innerHTML = tournaments.length === 0 ?
      '<div class="card" style="text-align:center;padding:48px"><p style="font-size:48px;margin-bottom:16px">🏆</p><p style="color:#64748b;font-size:16px">No hay torneos creados. Crea el primero!</p></div>' :
      '<div class="grid-3">' + tournaments.map(t => {
        const statusLabels = { upcoming: ['Proximo', 'badge-blue'], active: ['En Curso', 'badge-green'], finished: ['Finalizado', 'badge-cyan'] }
        const [label, cls] = statusLabels[t.status] || ['', '']
        return `<div class="card" style="border-color:rgba(245,158,11,0.2)">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:24px">🏆</span><span class="badge ${cls}">${label}</span></div>
          <h3 style="color:white;font-size:18px;font-weight:700">${t.name}</h3>
          <p style="color:#94a3b8;font-size:13px;margin-top:4px">${new Date(t.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-gray btn-sm" onclick="editTournament(${t.id})">✏ Editar</button>
            <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171" onclick="deleteTournament(${t.id})">🗑 Borrar</button>
          </div>
        </div>`
      }).join('') + '</div>'
  })
}

function openTournamentModal() {
  editingTournamentId = null
  document.getElementById('tournamentModalTitle').textContent = 'Nuevo Torneo'
  document.getElementById('trName').value = ''; document.getElementById('trStartDate').value = ''
  document.getElementById('trEndDate').value = ''; document.getElementById('trFormat').value = 'elimination'
  document.getElementById('trStatus').value = 'upcoming'
  openModal('tournamentModal')
}

async function editTournament(id) {
  const { data: t } = await db.from('tournaments').select('*').eq('id', id).single()
  if (!t) return
  editingTournamentId = id
  document.getElementById('tournamentModalTitle').textContent = 'Editar Torneo'
  document.getElementById('trName').value = t.name; document.getElementById('trStartDate').value = t.start_date
  document.getElementById('trEndDate').value = t.end_date || ''; document.getElementById('trFormat').value = t.format
  document.getElementById('trStatus').value = t.status
  openModal('tournamentModal')
}

async function saveTournament() {
  const data = { name: document.getElementById('trName').value, start_date: document.getElementById('trStartDate').value, end_date: document.getElementById('trEndDate').value || null, format: document.getElementById('trFormat').value, status: document.getElementById('trStatus').value }
  if (!data.name || !data.start_date) return alert('Completa nombre y fecha')
  if (editingTournamentId) await db.from('tournaments').update(data).eq('id', editingTournamentId)
  else await db.from('tournaments').insert(data)
  closeModal('tournamentModal'); renderTournaments()
}

async function deleteTournament(id) {
  if (!confirm('Eliminar este torneo?')) return
  await db.from('matches').delete().eq('tournament_id', id)
  await db.from('tournament_registrations').delete().eq('tournament_id', id)
  await db.from('tournament_categories').delete().eq('tournament_id', id)
  await db.from('tournaments').delete().eq('id', id)
  renderTournaments()
}

// ==================== LIGAS ====================
let editingLeagueId = null

function renderLeagues() {
  db.from('leagues').select('*').order('start_date', { ascending: false }).then(({ data }) => {
    const leagues = data || []
    const formatLabels = {}
    if (typeof LEAGUE_FORMATS !== 'undefined') LEAGUE_FORMATS.forEach(f => { formatLabels[f.id] = f.name })
    const statusLabels = { upcoming: ['Proxima', 'badge-blue'], active: ['En Curso', 'badge-green'], finished: ['Finalizada', 'badge-cyan'] }

    document.getElementById('leagueList').innerHTML = leagues.length === 0 ?
      '<div class="card" style="text-align:center;padding:48px"><p style="font-size:48px;margin-bottom:16px">⚽</p><p style="color:#64748b;font-size:16px">No hay ligas creadas. Crea la primera!</p></div>' :
      '<div class="grid-3">' + leagues.map(l => {
        const [label, cls] = statusLabels[l.status] || ['', '']
        return `<div class="card" style="border-color:rgba(34,197,94,0.2)">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:24px">⚽</span><span class="badge ${cls}">${label}</span></div>
          <h3 style="color:white;font-size:18px;font-weight:700">${l.name}</h3>
          <p style="color:#94a3b8;font-size:12px;margin-top:4px">${formatLabels[l.format] || l.format}</p>
          <p style="color:#64748b;font-size:12px;margin-top:2px">${l.start_date ? new Date(l.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : ''} ${l.end_date ? '— ' + new Date(l.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : ''}</p>
          ${l.entry_fee > 0 ? `<p style="color:#84cc16;font-weight:700;margin-top:4px">${formatCurrency(l.entry_fee)} / pareja</p>` : ''}
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-gray btn-sm" onclick="editLeague(${l.id})">✏ Editar</button>
            <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171" onclick="deleteLeague(${l.id})">🗑 Borrar</button>
          </div>
        </div>`
      }).join('') + '</div>'
  })
}

function openLeagueModal() {
  editingLeagueId = null
  document.getElementById('leagueModalTitle').textContent = 'Nueva Liga'
  document.getElementById('lgName').value = ''
  document.getElementById('lgFormat').value = 'regular'
  document.getElementById('lgCategory').value = ''
  document.getElementById('lgStartDate').value = ''
  document.getElementById('lgEndDate').value = ''
  document.getElementById('lgMaxTeams').value = 16
  document.getElementById('lgFee').value = 0
  document.getElementById('lgScoring').value = '2 pts victoria, 0 derrota'
  document.getElementById('lgDesc').value = ''
  document.getElementById('lgStatus').value = 'upcoming'
  openModal('leagueModal')
}

async function editLeague(id) {
  const { data: l } = await db.from('leagues').select('*').eq('id', id).single()
  if (!l) return
  editingLeagueId = id
  document.getElementById('leagueModalTitle').textContent = 'Editar Liga'
  document.getElementById('lgName').value = l.name
  document.getElementById('lgFormat').value = l.format
  document.getElementById('lgCategory').value = l.category || ''
  document.getElementById('lgStartDate').value = l.start_date || ''
  document.getElementById('lgEndDate').value = l.end_date || ''
  document.getElementById('lgMaxTeams').value = l.max_teams || 16
  document.getElementById('lgFee').value = l.entry_fee || 0
  document.getElementById('lgScoring').value = l.scoring_system || ''
  document.getElementById('lgDesc').value = l.description || ''
  document.getElementById('lgStatus').value = l.status
  openModal('leagueModal')
}

async function saveLeague() {
  const data = {
    name: document.getElementById('lgName').value,
    format: document.getElementById('lgFormat').value,
    category: document.getElementById('lgCategory').value || null,
    start_date: document.getElementById('lgStartDate').value || null,
    end_date: document.getElementById('lgEndDate').value || null,
    max_teams: Number(document.getElementById('lgMaxTeams').value) || null,
    entry_fee: Number(document.getElementById('lgFee').value) || 0,
    scoring_system: document.getElementById('lgScoring').value || null,
    description: document.getElementById('lgDesc').value || null,
    status: document.getElementById('lgStatus').value,
  }
  if (!data.name) return alert('Ingresa el nombre de la liga')
  if (editingLeagueId) await db.from('leagues').update(data).eq('id', editingLeagueId)
  else await db.from('leagues').insert(data)
  closeModal('leagueModal')
  renderLeagues()
}

async function deleteLeague(id) {
  if (!confirm('Eliminar esta liga?')) return
  await db.from('league_standings').delete().eq('league_id', id)
  await db.from('league_matches').delete().eq('league_id', id)
  await db.from('league_registrations').delete().eq('league_id', id)
  await db.from('leagues').delete().eq('id', id)
  renderLeagues()
}

function exportLeagues() { /* TODO */ }

// ==================== RANKING ====================
async function renderRanking() {
  const { data } = await db.from('ranking').select('*, player:players(*)').order('points', { ascending: false })
  const ranking = data || []
  const medals = ['🥇', '🥈', '🥉']
  document.getElementById('podium').innerHTML = ranking.slice(0, 3).map((r, i) => {
    const colors = ['linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.1))', 'linear-gradient(135deg,rgba(148,163,184,0.2),rgba(148,163,184,0.1))', 'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(249,115,22,0.1))']
    return `<div class="card" style="text-align:center;background:${colors[i]}"><span style="font-size:36px">${medals[i]}</span><p style="color:white;font-weight:700;margin-top:8px">${r.player?.name || 'Jugador'}</p><p style="color:#06b6d4;font-size:28px;font-weight:700">+${r.points}</p><p style="color:#64748b;font-size:12px">${r.matches_won}V / ${r.matches_lost}D</p></div>`
  }).join('')

  document.getElementById('rankingTable').innerHTML = ranking.length === 0 ? '<tr><td colspan="9" style="color:#64748b;text-align:center;padding:32px">Sin datos de ranking. Juga torneos y recalcula.</td></tr>' :
    ranking.map((r, i) => {
      const wr = r.matches_played > 0 ? Math.round((r.matches_won / r.matches_played) * 100) : 0
      return `<tr><td>${i < 3 ? medals[i] : `<span style="color:#64748b">${i + 1}</span>`}</td><td style="color:white;font-weight:700">${r.player?.name || '—'}</td><td>${r.matches_played}</td><td style="color:#4ade80">${r.matches_won}</td><td style="color:#f87171">${r.matches_lost}</td><td>${r.games_won}</td><td>${r.games_lost}</td><td style="color:#06b6d4;font-weight:700">${r.points > 0 ? '+' : ''}${r.points}</td><td><span class="badge ${wr >= 70 ? 'badge-green' : wr >= 40 ? 'badge-yellow' : 'badge-red'}">${wr}%</span></td></tr>`
    }).join('')
}

async function recalcRanking() { alert('Recalcular ranking desde resultados de torneos - En desarrollo'); renderRanking() }

// ==================== JUGADORES ====================
let playerViewMode = 'table'

function playerFullName(p) {
  return ((p.name || '') + ' ' + (p.last_name || '')).trim() || 'Sin nombre'
}

function playerInitials(p) {
  const n = (p.name || '?')[0].toUpperCase()
  const l = (p.last_name || '')[0]?.toUpperCase() || ''
  return n + l
}

function playerAvatarBg(p) {
  const colors = ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#22c55e','#ef4444','#f97316','#ec4899']
  const hash = (p.name || '').length + (p.last_name || '').length + (p.id || 0)
  return colors[hash % colors.length]
}

function playerAvatarHTML(p, cssClass) {
  if (p.photo_url) {
    return `<div class="${cssClass}" style="background:${playerAvatarBg(p)}"><img src="${p.photo_url}" alt="${playerFullName(p)}" onerror="this.parentElement.innerHTML='${playerInitials(p)}'"></div>`
  }
  return `<div class="${cssClass}" style="background:${playerAvatarBg(p)}">${playerInitials(p)}</div>`
}

function categoryBadge(cat) {
  if (!cat) return '<span class="badge badge-cyan">—</span>'
  const map = { '1ra': 'badge-green', '2da': 'badge-green', '3ra': 'badge-blue', '4ta': 'badge-blue', '5ta': 'badge-yellow', '6ta': 'badge-yellow', '7ma': 'badge-red', '8va': 'badge-red', 'Sin categoria': 'badge-cyan' }
  return `<span class="badge ${map[cat] || 'badge-cyan'}">${cat}</span>`
}

function setPlayerView(mode) {
  playerViewMode = mode
  document.getElementById('viewTableBtn').className = mode === 'table' ? 'btn btn-sm btn-cyan' : 'btn btn-sm btn-gray'
  document.getElementById('viewCardBtn').className = mode === 'cards' ? 'btn btn-sm btn-cyan' : 'btn btn-sm btn-gray'
  document.getElementById('playersTableView').style.display = mode === 'table' ? 'block' : 'none'
  document.getElementById('playersCardView').style.display = mode === 'cards' ? 'block' : 'none'
  renderPlayers()
}

function renderPlayers() {
  const search = (document.getElementById('playerSearch')?.value || '').toLowerCase()
  const filtered = allPlayers.filter(p => {
    const full = playerFullName(p).toLowerCase()
    return full.includes(search) || (p.email || '').toLowerCase().includes(search) || (p.city || '').toLowerCase().includes(search) || (p.category || '').toLowerCase().includes(search) || (p.phone || '').includes(search)
  })

  // Table view
  document.getElementById('playersTable').innerHTML = filtered.length === 0
    ? '<tr><td colspan="6" style="color:#64748b;text-align:center;padding:32px">No se encontraron jugadores</td></tr>'
    : filtered.map(p => `<tr>
        <td>${playerAvatarHTML(p, 'player-table-avatar')}</td>
        <td style="color:white;font-weight:700">${playerFullName(p)}</td>
        <td>${categoryBadge(p.category)}</td>
        <td style="color:#94a3b8">${p.city || '—'}</td>
        <td style="color:#94a3b8">${p.phone || '—'}</td>
        <td>
          <button class="btn-icon" style="color:#3b82f6" onclick="editPlayer(${p.id})">✏</button>
          <button class="btn-icon" style="color:#ef4444" onclick="deletePlayer(${p.id})">🗑</button>
        </td>
      </tr>`).join('')

  // Card view
  document.getElementById('playersCardGrid').innerHTML = filtered.length === 0
    ? '<div class="card" style="grid-column:1/-1;text-align:center;padding:32px"><p style="color:#64748b">No se encontraron jugadores</p></div>'
    : filtered.map(p => `<div class="player-card">
        ${playerAvatarHTML(p, 'avatar')}
        <div class="pc-name">${playerFullName(p)}</div>
        ${categoryBadge(p.category)}
        <div class="pc-detail" style="margin-top:8px">📍 ${p.city || '—'}</div>
        <div class="pc-detail">📞 ${p.phone || '—'}</div>
        <div class="pc-detail">✉ ${p.email || '—'}</div>
        <div class="pc-actions">
          <button class="btn btn-sm" style="background:rgba(59,130,246,0.2);color:#60a5fa" onclick="editPlayer(${p.id})">✏ Editar</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171" onclick="deletePlayer(${p.id})">🗑 Borrar</button>
        </div>
      </div>`).join('')
}

function filterPlayers() { renderPlayers() }

function openPlayerModal() {
  editingPlayerId = null
  document.getElementById('playerModalTitle').textContent = 'Nuevo Jugador'
  document.getElementById('plName').value = ''
  document.getElementById('plLastName').value = ''
  document.getElementById('plAge').value = ''
  document.getElementById('plBirthDate').value = ''
  document.getElementById('plCity').value = ''
  document.getElementById('plCategory').value = ''
  document.getElementById('plGender').value = ''
  document.getElementById('plDni').value = ''
  document.getElementById('plEmergencyPhone').value = ''
  document.getElementById('plEmail').value = ''
  document.getElementById('plPhone').value = ''
  document.getElementById('plPhotoUrl').value = ''
  document.getElementById('plPhotoFile').value = ''
  document.getElementById('photoPreview').innerHTML = '<span style="color:#64748b;font-size:24px">📷</span>'
  document.getElementById('plNotes').value = ''
  openModal('playerModal')
}

async function editPlayer(id) {
  const p = allPlayers.find(pl => pl.id === id)
  if (!p) return
  editingPlayerId = id
  document.getElementById('playerModalTitle').textContent = 'Editar Jugador'
  document.getElementById('plName').value = p.name || ''
  document.getElementById('plLastName').value = p.last_name || ''
  document.getElementById('plAge').value = p.age || ''
  document.getElementById('plBirthDate').value = p.birth_date || ''
  document.getElementById('plCity').value = p.city || ''
  document.getElementById('plCategory').value = p.category || ''
  document.getElementById('plGender').value = p.gender || ''
  document.getElementById('plDni').value = p.dni || ''
  document.getElementById('plEmergencyPhone').value = p.emergency_phone || ''
  document.getElementById('plEmail').value = p.email || ''
  document.getElementById('plPhone').value = p.phone || ''
  document.getElementById('plPhotoUrl').value = p.photo_url || ''
  document.getElementById('plPhotoFile').value = ''
  if (p.photo_url) {
    document.getElementById('photoPreview').innerHTML = `<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover">`
  } else {
    document.getElementById('photoPreview').innerHTML = '<span style="color:#64748b;font-size:24px">📷</span>'
  }
  document.getElementById('plNotes').value = p.notes || ''
  openModal('playerModal')
}

// Photo preview
function previewPhoto(input) {
  const file = input.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    document.getElementById('photoPreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`
  }
  reader.readAsDataURL(file)
}

// Upload photo to Supabase Storage
async function uploadPlayerPhoto(name, lastName) {
  const fileInput = document.getElementById('plPhotoFile')
  const file = fileInput?.files?.[0]
  if (!file) return document.getElementById('plPhotoUrl').value.trim() || null

  // Generate filename: 2026_04_10_apellido_nombre
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '_')
  const cleanName = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${today}_${cleanName(lastName)}_${cleanName(name)}.${ext}`

  const { data, error } = await db.storage.from('fotos-jugadores').upload(fileName, file, {
    cacheControl: '3600',
    upsert: true
  })

  if (error) {
    console.error('Upload error:', error)
    alert('Error al subir foto: ' + error.message)
    return null
  }

  // Get public URL
  const { data: urlData } = db.storage.from('fotos-jugadores').getPublicUrl(fileName)
  return urlData?.publicUrl || null
}

async function savePlayer() {
  const name = document.getElementById('plName').value.trim()
  const last_name = document.getElementById('plLastName').value.trim()
  if (!name || !last_name) return alert('Ingresa nombre y apellido')

  // Upload photo first if file selected
  const photoUrl = await uploadPlayerPhoto(name, last_name)

  const data = {
    name,
    last_name,
    age: document.getElementById('plAge').value ? Number(document.getElementById('plAge').value) : null,
    birth_date: document.getElementById('plBirthDate').value || null,
    city: document.getElementById('plCity').value.trim() || null,
    category: document.getElementById('plCategory').value || null,
    gender: document.getElementById('plGender').value || null,
    dni: document.getElementById('plDni').value.trim() || null,
    emergency_phone: document.getElementById('plEmergencyPhone').value.trim() || null,
    email: document.getElementById('plEmail').value.trim() || null,
    phone: document.getElementById('plPhone').value.trim() || null,
    photo_url: photoUrl || document.getElementById('plPhotoUrl').value.trim() || null,
    notes: document.getElementById('plNotes').value.trim() || null,
  }
  if (editingPlayerId) await db.from('players').update(data).eq('id', editingPlayerId)
  else await db.from('players').insert(data)
  closeModal('playerModal'); await loadAllData(); renderPlayers()
}

async function deletePlayer(id) {
  if (!confirm('Eliminar este jugador?')) return
  await db.from('players').delete().eq('id', id)
  await loadAllData(); renderPlayers()
}

// ==================== CONFIG ====================
const CONFIG_FIELDS = [
  { key: 'club_name', label: 'Nombre del Club', type: 'text' },
  { key: 'location', label: 'Ubicacion', type: 'text' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { key: 'email', label: 'Email contacto', type: 'text' },
  { key: 'web', label: 'Sitio Web', type: 'text' },
  { key: 'courts_count', label: 'Pistas', type: 'number' },
  { key: 'price_1h', label: 'Precio 1h (EUR)', type: 'number' },
  { key: 'price_1_5h', label: 'Precio 1.5h (EUR)', type: 'number' },
  { key: 'price_2h', label: 'Precio 2h (EUR)', type: 'number' },
  { key: 'open_time', label: 'Hora apertura', type: 'time' },
  { key: 'close_time', label: 'Hora cierre', type: 'time' },
  { key: 'slot_interval', label: 'Intervalo (min)', type: 'number' },
  { key: 'points_win', label: 'Puntos victoria', type: 'number' },
  { key: 'points_loss', label: 'Puntos derrota', type: 'number' },
]

async function renderConfig() {
  const { data } = await db.from('config').select('*')
  const cfg = {}; (data || []).forEach(r => { cfg[r.key] = r.value })
  document.getElementById('configFields').innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">' +
    CONFIG_FIELDS.map(f => `<div class="form-group"><label>${f.label}</label><input type="${f.type}" id="cfg_${f.key}" value="${cfg[f.key] || ''}"></div>`).join('') + '</div>'

  // Staff list
  const staffMembers = allProfiles.filter(p => p.role === 'admin' || p.role === 'staff')
  document.getElementById('staffList').innerHTML = staffMembers.length === 0 ? '<p style="color:#64748b;text-align:center;padding:16px">No hay usuarios registrados</p>' :
    staffMembers.map(s => `<div class="list-item"><div class="info"><div style="padding:8px;border-radius:12px;background:${s.role === 'admin' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}">${s.role === 'admin' ? '🛡' : '👤'}</div><div><h4>${s.full_name || 'Sin nombre'}</h4></div></div><span class="badge ${s.role === 'admin' ? 'badge-yellow' : 'badge-blue'}">${s.role.toUpperCase()}</span></div>`).join('')
}

async function saveConfig() {
  for (const f of CONFIG_FIELDS) {
    const val = document.getElementById('cfg_' + f.key).value
    const { data: existing } = await db.from('config').select('key').eq('key', f.key).single()
    if (existing) await db.from('config').update({ value: val }).eq('key', f.key)
    else await db.from('config').insert({ key: f.key, value: val, description: f.label })
  }
  document.getElementById('configSaved').classList.remove('hidden')
  setTimeout(() => document.getElementById('configSaved').classList.add('hidden'), 2000)
}

function openStaffModal() {
  document.getElementById('stName').value = ''; document.getElementById('stEmail').value = ''
  document.getElementById('stPassword').value = ''; staffRole = 'staff'
  document.getElementById('roleAdmin').className = 'btn btn-gray'
  document.getElementById('roleStaff').className = 'btn btn-cyan'
  openModal('staffModal')
}

function setStaffRole(role) {
  staffRole = role
  document.getElementById('roleAdmin').className = role === 'admin' ? 'btn btn-yellow' : 'btn btn-gray'
  document.getElementById('roleStaff').className = role === 'staff' ? 'btn btn-cyan' : 'btn btn-gray'
}

async function saveStaff() {
  const name = document.getElementById('stName').value
  const email = document.getElementById('stEmail').value
  const password = document.getElementById('stPassword').value
  if (!name || !email || !password) return alert('Completa todos los campos')
  if (password.length < 6) return alert('La contrasena debe tener al menos 6 caracteres')
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } })
  if (error) return alert(error.message)
  if (data?.user) {
    await db.from('profiles').upsert({ id: data.user.id, full_name: name, role: staffRole })
  }
  closeModal('staffModal'); await loadAllData(); renderConfig()
  alert('Usuario creado! Nota: esto te pudo haber deslogueado. Volve a entrar.')
}

// ==================== EXPORT ====================
function exportCSV(data, filename) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csv = [headers.join(';'), ...data.map(r => headers.map(h => String(r[h] ?? '').includes(';') ? `"${r[h]}"` : (r[h] ?? '')).join(';'))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
}

function exportBookings() {
  exportCSV(allBookings.filter(b => b.status !== 'cancelled').map(b => ({
    Fecha: b.date, Hora: b.start_time?.substring(0, 5), Pista: `Pista ${b.court_id}`,
    Cliente: b.customer_name, Email: b.customer_email || '', Telefono: b.customer_phone || '',
    Duracion: `${b.duration_minutes}min`, Precio: b.price, Estado: b.status, Jugadores: b.players || ''
  })), 'reservas')
}

function exportTournaments() { /* TODO */ }
function exportRanking() { /* TODO */ }
function exportPlayers() {
  exportCSV(allPlayers.map(p => ({
    Nombre: p.name || '', Apellido: p.last_name || '', Categoria: p.category || '',
    Genero: p.gender || '', Edad: p.age || '', FechaNacimiento: p.birth_date || '',
    Ciudad: p.city || '', DNI: p.dni || '', Email: p.email || '',
    Telefono: p.phone || '', TelEmergencia: p.emergency_phone || '',
    Notas: p.notes || '', Registro: p.created_at?.split('T')[0] || ''
  })), 'jugadores')
}

// ==================== CLIENT REGISTRATION ====================
let captchaA = 0, captchaB = 0, captchaVerified = false

function showRegister() {
  captchaA = Math.floor(Math.random() * 10) + 1
  captchaB = Math.floor(Math.random() * 10) + 1
  captchaVerified = false
  document.getElementById('loginForm').style.display = 'none'
  document.getElementById('registerForm').classList.remove('hidden')
  document.getElementById('captchaQuestion').textContent = `Cuanto es ${captchaA} + ${captchaB}?`
}

function showLogin() {
  document.getElementById('loginForm').style.display = 'block'
  document.getElementById('registerForm').classList.add('hidden')
}

function checkCaptcha() {
  const val = Number(document.getElementById('regCaptcha').value)
  captchaVerified = val === (captchaA + captchaB)
  document.getElementById('captchaCheck').textContent = captchaVerified ? '✅' : ''
}

async function doRegister(e) {
  e.preventDefault()
  const name = document.getElementById('regName').value
  const lastName = document.getElementById('regLastName').value
  const email = document.getElementById('regEmail').value
  const phone = document.getElementById('regPhone').value
  const pw = document.getElementById('regPassword').value
  const pw2 = document.getElementById('regPassword2').value
  const errEl = document.getElementById('regError')
  errEl.classList.add('hidden')

  if (!captchaVerified) { errEl.textContent = 'Completa el captcha'; errEl.classList.remove('hidden'); return }
  if (pw !== pw2) { errEl.textContent = 'Las contrasenas no coinciden'; errEl.classList.remove('hidden'); return }
  if (pw.length < 6) { errEl.textContent = 'La contrasena debe tener al menos 6 caracteres'; errEl.classList.remove('hidden'); return }
  if (!name || !lastName || !email || !phone) { errEl.textContent = 'Completa todos los campos'; errEl.classList.remove('hidden'); return }

  const { data, error } = await db.auth.signUp({ email, password: pw, options: { data: { full_name: `${name} ${lastName}` } } })
  if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return }

  if (data?.user) {
    await db.from('profiles').upsert({ id: data.user.id, full_name: `${name} ${lastName}`, last_name: lastName, phone, role: 'client' })
  }

  document.getElementById('registerForm').innerHTML = `
    <div style="text-align:center;padding:20px">
      <p style="font-size:48px;margin-bottom:16px">✅</p>
      <h2 style="color:white;font-size:22px;margin-bottom:8px">Registro exitoso!</h2>
      <p style="color:#64748b">Ya podes iniciar sesion con <span style="color:#06b6d4">${email}</span></p>
      <button class="btn btn-cyan" style="margin-top:16px" onclick="showLogin()">Volver al Login</button>
    </div>
  `
}
