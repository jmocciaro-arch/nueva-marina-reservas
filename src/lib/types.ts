export type UserRole = 'admin' | 'staff'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  created_at: string
}

export interface Court {
  id: number
  name: string
  is_active: boolean
}

export interface Config {
  key: string
  value: string
  description: string
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'

export interface Booking {
  id: number
  court_id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: BookingStatus
  notes: string | null
  price: number
  created_by: string | null
  created_at: string
  court?: Court
}

export type CashEntryType = 'booking' | 'sale' | 'manual' | 'cancellation'

export interface CashEntry {
  id: number
  date: string
  type: CashEntryType
  reference_id: number | null
  concept: string
  amount: number
  created_by: string | null
  created_at: string
}

export interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  image_url: string | null
  is_active: boolean
}

export interface Sale {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  total: number
  created_by: string | null
  created_at: string
  product?: Product
}

export type TournamentStatus = 'upcoming' | 'active' | 'finished'
export type TournamentFormat = 'elimination' | 'preliminary' | 'groups'

export interface Tournament {
  id: number
  name: string
  start_date: string
  end_date: string | null
  status: TournamentStatus
  format: TournamentFormat
  created_at: string
}

export interface TournamentCategory {
  id: number
  tournament_id: number
  name: string
}

export type RegistrationStatus = 'confirmed' | 'pending' | 'cancelled'

export interface TournamentRegistration {
  id: number
  tournament_id: number
  category_id: number
  player1_name: string
  player1_email: string | null
  player1_phone: string | null
  player2_name: string
  player2_email: string | null
  player2_phone: string | null
  status: RegistrationStatus
  created_at: string
}

export type MatchStatus = 'pending' | 'in_progress' | 'finished'

export interface Match {
  id: number
  tournament_id: number
  category_id: number
  round: number
  position: number
  team1_registration_id: number | null
  team2_registration_id: number | null
  score_team1: string | null
  score_team2: string | null
  sets_detail: Record<string, string>[] | null
  winner_registration_id: number | null
  status: MatchStatus
  team1?: TournamentRegistration
  team2?: TournamentRegistration
}

export interface Player {
  id: number
  name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface RankingEntry {
  id: number
  player_id: number
  matches_played: number
  matches_won: number
  matches_lost: number
  games_won: number
  games_lost: number
  points: number
  player?: Player
}
