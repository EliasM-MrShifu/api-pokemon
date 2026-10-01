## Pokédex de equipos

Aplicación Vue 3 + Vite para explorar los 151 Pokémon originales, armar equipos de hasta cinco integrantes, asignarles habilidades de su tipo y combatir entre equipos guardados.

### Requisitos

- Node.js 20.19+ (o 22.12+).
- MySQL Server activo, con un usuario que pueda crear/usar la base `pokedex`.

### Preparar MySQL

Importa `pokedex.sql` desde MySQL Workbench o ejecútalo con tu cliente MySQL. El esquema crea `pokemones`, `equipos`, `equipo_pokemon`, tipos, habilidades, tipos y estadísticas por Pokémon, efectividad de tipos y combates. La API migra la base existente al iniciar y sincroniza tipos, estadísticas y habilidades de los 151 Pokémon desde PokéAPI la primera vez. Se necesita conexión a internet durante esa carga inicial.

Si ya existe una base `pokedex` creada con otro esquema, revisa que sus tres tablas tengan las columnas de `pokedex.sql`; `CREATE TABLE IF NOT EXISTS` no modifica tablas preexistentes.

### Configurar y ejecutar

1. Ejecuta `npm install`.
2. Copia `.env.example` como `.env` y ajusta `DB_USER`, `DB_PASSWORD` y, si corresponde, `DB_HOST`/`DB_PORT`.
3. En una terminal, ejecuta `npm run dev:api` para iniciar Express en `http://localhost:3001`.
4. En otra terminal, ejecuta `npm run dev` y abre `http://localhost:5173`.

Vite reenvía las llamadas `/api` al servidor Express. Comprueba la API y la conexión a MySQL en `http://localhost:3001/api/health`. En Combates selecciona dos equipos guardados distintos; el sistema aplica daño, velocidad, precisión, STAB, resistencias, debilidades e inmunidades según los tipos oficiales y guarda el resultado en MySQL.

### Validación

- `npm run build`: compila la aplicación Vue.
- `npm run lint`: revisa el código con ESLint.
