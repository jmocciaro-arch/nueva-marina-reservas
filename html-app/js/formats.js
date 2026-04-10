// ==================== TOURNAMENT & LEAGUE FORMATS ====================

const TOURNAMENT_FORMATS = [
  { id: 'premier', name: 'Premier Padel', desc: 'Cuadro eliminatorio 32-48 parejas, best of 3 sets. Formato profesional.', teams: '32-48', origin: 'Mundial' },
  { id: 'americano', name: 'Americano', desc: 'Parejas rotan cada ronda. Se juegan partidos a puntos fijos (16, 24 o 32). Gana el individuo con más puntos.', teams: '8-24', origin: 'Suecia/España' },
  { id: 'mexicano', name: 'Mexicano', desc: 'Variante del Americano donde los emparejamientos se hacen según el ranking en vivo (1+4 vs 2+3). Partidos más equilibrados.', teams: '8-24', origin: 'España' },
  { id: 'americano_mixto', name: 'Americano Mixto', desc: 'Cada pareja debe tener un hombre y una mujer. Rotación mixta obligatoria.', teams: '8-16', origin: 'Europa/Argentina' },
  { id: 'eliminatorio', name: 'Eliminatorio Clásico', desc: 'Eliminación directa desde octavos o cuartos. Formato federativo estándar.', teams: '16-64', origin: 'Argentina/España' },
  { id: 'round_robin', name: 'Round Robin + Playoff', desc: 'Todos contra todos en grupos, luego cuadro eliminatorio con los mejores.', teams: '8-16', origin: 'Latinoamérica' },
  { id: 'express', name: 'Express/Relámpago', desc: 'Partidos cortos a 1 set o a tiempo fijo (20-30 min). Se juega en una sola jornada.', teams: '8-16', origin: 'Argentina/España' },
  { id: 'team', name: 'Team Championship', desc: 'Equipos de 3-5 parejas compiten entre sí. Gana el equipo que sume más victorias.', teams: '4-8 equipos', origin: 'FIP World' },
  { id: 'fip_amateur', name: 'FIP Beyond (Amateur)', desc: 'Circuito amateur con 3 niveles (B1/B2/B3), categorías obligatorias +40 y +50.', teams: '16-32', origin: 'Mundial' },
  { id: 'pro_league', name: 'Pro Padel League', desc: 'Equipos franquicia, fase de grupos + playoffs. Best of 3 sets con super tie-break.', teams: '10 equipos', origin: 'USA/España' },
]

const LEAGUE_FORMATS = [
  { id: 'regular', name: 'Liga Regular por Categorías', desc: 'Parejas fijas agrupadas por nivel (1a a 5a). Todos contra todos.', scoring: '2 pts victoria, 0 derrota + dif. games', duration: '3-4 meses' },
  { id: 'mixta', name: 'Liga Mixta', desc: 'Parejas obligatoriamente hombre+mujer. División por niveles.', scoring: '2 pts victoria, 1 empate', duration: '2-3 meses' },
  { id: 'interempresas', name: 'Liga Interempresas', desc: 'Equipos de empresas compiten entre sí. Formato social/networking.', scoring: 'Puntos por partido + bonus asistencia', duration: '3-6 meses' },
  { id: 'interclub', name: 'Liga Interclub', desc: 'Clubes presentan equipos que compiten contra otros clubes.', scoring: '3 pts victoria, 1 empate, 0 derrota', duration: '8-10 meses' },
  { id: 'ladder', name: 'Liga Ladder (Escalera)', desc: 'Ranking individual. Desafiás al de arriba; si ganás, subís de posición.', scoring: 'Sube/baja posiciones', duration: 'Continua' },
  { id: 'nocturna', name: 'Liga Nocturna', desc: 'Partidos en horario nocturno (20h-23h) entre semana. Round robin.', scoring: '2 pts victoria + games a favor', duration: '2-3 meses' },
  { id: 'puntos', name: 'Liga por Puntos Individual', desc: 'Tipo Americano semanal. Acumulás puntos a lo largo de la temporada.', scoring: 'Puntos por game ganado', duration: '3-6 meses' },
  { id: 'femenina', name: 'Liga Femenina', desc: 'Exclusiva para mujeres, dividida por categorías.', scoring: '2 pts victoria, games diferencia', duration: '3-4 meses' },
  { id: 'social', name: 'Liga Social/Recreativa', desc: 'Sin categorías estrictas. Rotación de parejas. Enfoque en diversión.', scoring: 'Participación + puntos', duration: '2-3 meses' },
  { id: 'ascenso', name: 'Liga con Ascenso/Descenso', desc: 'Varias divisiones. Los mejores suben, los últimos bajan.', scoring: '3 pts victoria, 1 empate, dif. sets', duration: '6-10 meses' },
]

const DASHBOARD_LAYOUTS = [
  { id: 'executive', name: 'Resumen Ejecutivo', desc: 'KPIs arriba, gráfico de ingresos, tabla de reservas. Limpio y minimalista.', icon: '📊' },
  { id: 'operations', name: 'Centro de Operaciones', desc: 'Grilla de pistas en tiempo real, lista de reservas con estados, acciones rápidas.', icon: '🎯' },
  { id: 'analytics', name: 'Analítica Deportiva', desc: '80% gráficos: barras comparativas, heatmap horarios, curva retención.', icon: '📈' },
  { id: 'members', name: 'Gestión de Socios', desc: 'Centrado en personas: búsqueda, perfiles, timeline actividad, comunicaciones.', icon: '👥' },
]

const HOME_LAYOUTS = [
  { id: 'hero-fullscreen', name: 'Hero Fullscreen + CTA', desc: 'Video/imagen a pantalla completa, botón reservar centrado' },
  { id: 'split-screen', name: 'Split Screen', desc: 'Mitad texto + CTA, mitad foto. Debajo: 3 columnas servicios' },
  { id: 'magazine', name: 'Magazine Deportivo', desc: 'Grid asimétrico tipo editorial con noticias y fotos grandes' },
  { id: 'one-page', name: 'One-Page Scroll', desc: 'Todo en una sola página con scroll: hero, sobre nosotros, canchas, tarifas' },
  { id: 'booking-first', name: 'Booking-First', desc: 'Widget de reserva como protagonista, disponibilidad en tiempo real' },
  { id: 'social', name: 'Comunidad/Social', desc: 'Feed de Instagram, testimonios, ranking, fotos de eventos' },
  { id: 'premium', name: 'Premium/Luxury', desc: 'Fondo oscuro, tipografía elegante, fotos profesionales' },
  { id: 'energetico', name: 'Deportivo Energético', desc: 'Colores vibrantes, ángulos diagonales, animaciones, CTAs agresivos' },
  { id: 'familiar', name: 'Informativo Familiar', desc: 'Tono cálido, fotos de familias, escuela de menores, campus' },
  { id: 'app-like', name: 'App-Like Landing', desc: 'Mockup de la app como hero, features con iconos, QR, pricing cards' },
]

// Player categories
const PLAYER_CATEGORIES = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va', 'Sin categoría']
