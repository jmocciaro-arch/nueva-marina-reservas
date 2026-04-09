-- Add players column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS players TEXT;

-- Add photo columns for tournaments and players
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Insert sample padel products (based on popular padelnuestro.com categories)
INSERT INTO products (name, category, price, stock, is_active) VALUES
  -- Palas/Paletas
  ('Bullpadel Hack 03 2025', 'Paletas', 189.95, 5, true),
  ('Head Flash Pro 2025', 'Paletas', 149.95, 8, true),
  ('Adidas Metalbone 3.3', 'Paletas', 219.95, 3, true),
  ('Nox AT10 Genius 18K', 'Paletas', 259.95, 4, true),
  ('Babolat Viper Air', 'Paletas', 199.95, 6, true),
  ('Wilson Bela Pro v2', 'Paletas', 179.95, 5, true),
  ('Siux Diablo Revolution', 'Paletas', 169.95, 7, true),
  ('StarVie Metheora Warrior', 'Paletas', 229.95, 3, true),
  -- Pelotas
  ('Head Padel Pro (3 uds)', 'Pelotas', 5.95, 50, true),
  ('Head Padel Pro S (3 uds)', 'Pelotas', 5.95, 40, true),
  ('Bullpadel Premium Pro (3 uds)', 'Pelotas', 5.50, 60, true),
  ('Wilson Padel Rush (3 uds)', 'Pelotas', 4.95, 45, true),
  ('Dunlop Padel Training (3 uds)', 'Pelotas', 4.50, 35, true),
  -- Grips & Overgrips
  ('Bullpadel Overgrip Comfort (3 uds)', 'Grips', 4.95, 30, true),
  ('Wilson Pro Overgrip (3 uds)', 'Grips', 5.95, 25, true),
  ('Head Xtreme Soft Overgrip', 'Grips', 3.95, 40, true),
  ('Vibora Overgrip Premium', 'Grips', 3.50, 35, true),
  -- Accesorios
  ('Muñequera Bullpadel BPM (par)', 'Accesorios', 8.95, 20, true),
  ('Protector de pala Bullpadel', 'Accesorios', 6.95, 15, true),
  ('Cinta antivibración Head', 'Accesorios', 4.95, 25, true),
  ('Gorra Adidas Padel', 'Accesorios', 19.95, 12, true),
  ('Visera Head Performance', 'Accesorios', 14.95, 10, true),
  -- Bolsos/Paleteros
  ('Paletero Bullpadel BPP-23014', 'Bolsos', 49.95, 6, true),
  ('Mochila Head Padel Tour', 'Bolsos', 39.95, 8, true),
  ('Paletero Nox Pro Series', 'Bolsos', 59.95, 4, true),
  ('Bolso Wilson Padel Super Tour', 'Bolsos', 69.95, 3, true),
  -- Zapatillas
  ('Bullpadel Hack Hybrid Fly 23', 'Zapatillas', 89.95, 5, true),
  ('Adidas Barricade Padel', 'Zapatillas', 99.95, 4, true),
  ('Head Sprint Pro 3.5', 'Zapatillas', 109.95, 3, true),
  ('Wilson Rush Pro 4.0 Padel', 'Zapatillas', 119.95, 4, true),
  -- Ropa
  ('Camiseta Bullpadel Tremol', 'Ropa', 29.95, 15, true),
  ('Short Adidas Club Padel', 'Ropa', 24.95, 12, true),
  ('Falda Head Club Basic', 'Ropa', 27.95, 10, true),
  ('Polo Wilson Padel Team', 'Ropa', 34.95, 8, true)
ON CONFLICT DO NOTHING;
