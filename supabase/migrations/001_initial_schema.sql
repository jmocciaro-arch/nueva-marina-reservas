-- ============================================
-- NUEVA MARINA PADEL - Database Schema
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'staff', 'client')),
  full_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courts
CREATE TABLE courts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO courts (name) VALUES ('Pista 1'), ('Pista 2'), ('Pista 3'), ('Pista 4');

-- Config
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

INSERT INTO config (key, value, description) VALUES
  ('club_name', 'Nueva Marina Pádel & Sport', 'Nombre del club'),
  ('location', 'España', 'Ubicación'),
  ('web', 'www.nuevamarina.es', 'Sitio web'),
  ('courts_count', '4', 'Cantidad de pistas'),
  ('price_1h', '15', 'Precio 1 hora (€)'),
  ('price_1_5h', '20', 'Precio 1.5 horas (€)'),
  ('price_2h', '25', 'Precio 2 horas (€)'),
  ('open_time', '08:00', 'Hora apertura'),
  ('close_time', '00:00', 'Hora cierre'),
  ('slot_interval', '15', 'Intervalo slots (min)'),
  ('points_win', '10', 'Puntos por victoria'),
  ('points_loss', '-5', 'Puntos por derrota'),
  ('points_participation', '2', 'Puntos por participar');

-- Bookings
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  court_id INTEGER REFERENCES courts(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  notes TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_court_date ON bookings(court_id, date);

-- Cash Register
CREATE TABLE cash_register (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('booking', 'sale', 'manual', 'cancellation')),
  reference_id INTEGER,
  concept TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_date ON cash_register(date);

-- Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments
CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  format TEXT NOT NULL DEFAULT 'elimination' CHECK (format IN ('elimination', 'preliminary', 'groups')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Categories
CREATE TABLE tournament_categories (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Tournament Registrations
CREATE TABLE tournament_registrations (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES tournament_categories(id) ON DELETE CASCADE,
  player1_name TEXT NOT NULL,
  player1_email TEXT,
  player1_phone TEXT,
  player2_name TEXT NOT NULL,
  player2_email TEXT,
  player2_phone TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES tournament_categories(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1,
  team1_registration_id INTEGER REFERENCES tournament_registrations(id),
  team2_registration_id INTEGER REFERENCES tournament_registrations(id),
  score_team1 TEXT,
  score_team2 TEXT,
  sets_detail JSONB,
  winner_registration_id INTEGER REFERENCES tournament_registrations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id, category_id, round);

-- Ranking
CREATE TABLE ranking (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all, admin/staff can write
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can read courts" ON courts FOR SELECT USING (true);
CREATE POLICY "Admin/staff can manage courts" ON courts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read config" ON config FOR SELECT USING (true);
CREATE POLICY "Admin can manage config" ON config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Auth users can manage bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);
CREATE POLICY "Clients can create bookings" ON bookings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Auth can read cash" ON cash_register FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);
CREATE POLICY "Auth can manage cash" ON cash_register FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admin/staff can manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Admin/staff can manage sales" ON sales FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Admin/staff can manage players" ON players FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Admin can manage tournaments" ON tournaments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read categories" ON tournament_categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON tournament_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read registrations" ON tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Auth can register" ON tournament_registrations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage registrations" ON tournament_registrations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Admin can manage matches" ON matches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

CREATE POLICY "Anyone can read ranking" ON ranking FOR SELECT USING (true);
CREATE POLICY "Admin can manage ranking" ON ranking FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);
