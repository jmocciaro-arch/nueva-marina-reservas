// Supabase Configuration
const SUPABASE_URL = 'https://vsgrwnfjzmovmnxjzkea.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZ3J3bmZqem1vdm1ueGp6a2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTU2NjUsImV4cCI6MjA5MTMzMTY2NX0.NqloeK1MRv940jYWW4HiARS96-Sbc_OMEqTtWgpMsCM'

// Initialize Supabase
const { createClient } = window.supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Court colors
const COURT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

// Generate time slots
function generateTimeSlots(startHour, endHour, interval) {
  const slots = []
  for (let h = startHour; h < (endHour === 0 ? 24 : endHour); h++) {
    for (let m = 0; m < 60; m += interval) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  if (endHour === 0) slots.push('00:00')
  return slots
}

// Add minutes to time
function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Current user
let currentUser = null
let currentProfile = null
