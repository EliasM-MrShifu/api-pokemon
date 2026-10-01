// Server.js

import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import process from 'node:process'
import { MOVES, TYPES } from './battleData.js'

const app = express()
const PORT = Number(process.env.API_PORT) || 3001
let battleDataReady = false
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pokedex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }))

async function fetchPokeApi(url, attempts = 4) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`PokéAPI respondió ${response.status} para ${url}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw lastError
}

async function initializeBattleData() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tipos_pokemon (
      id VARCHAR(20) NOT NULL PRIMARY KEY,
      nombre_es VARCHAR(30) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS habilidades (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(60) NOT NULL UNIQUE,
      tipo_id VARCHAR(20) NOT NULL,
      poder INT NOT NULL,
      precision_pct INT NOT NULL,
      descripcion VARCHAR(255) NOT NULL,
      CONSTRAINT fk_habilidad_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_pokemon(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS pokemon_tipos (
      pokemon_id INT NOT NULL,
      tipo_id VARCHAR(20) NOT NULL,
      slot TINYINT NOT NULL,
      PRIMARY KEY (pokemon_id, tipo_id),
      UNIQUE KEY uq_pokemon_tipo_slot (pokemon_id, slot),
      CONSTRAINT fk_pokemon_tipo_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE,
      CONSTRAINT fk_pokemon_tipo_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_pokemon(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS pokemon_habilidad (
      pokemon_id INT NOT NULL PRIMARY KEY,
      habilidad_id INT NOT NULL,
      CONSTRAINT fk_pokemon_habilidad_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE,
      CONSTRAINT fk_pokemon_habilidad_habilidad FOREIGN KEY (habilidad_id) REFERENCES habilidades(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS pokemon_estadisticas (
      pokemon_id INT NOT NULL PRIMARY KEY,
      hp INT NOT NULL,
      ataque INT NOT NULL,
      defensa INT NOT NULL,
      velocidad INT NOT NULL,
      CONSTRAINT fk_estadisticas_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS efectividad_tipos (
      tipo_atacante VARCHAR(20) NOT NULL,
      tipo_defensor VARCHAR(20) NOT NULL,
      multiplicador DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      PRIMARY KEY (tipo_atacante, tipo_defensor),
      CONSTRAINT fk_efectividad_atacante FOREIGN KEY (tipo_atacante) REFERENCES tipos_pokemon(id),
      CONSTRAINT fk_efectividad_defensor FOREIGN KEY (tipo_defensor) REFERENCES tipos_pokemon(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS combates (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      equipo_a_id INT NOT NULL,
      equipo_b_id INT NOT NULL,
      ganador_equipo_id INT NULL,
      turnos INT NOT NULL,
      registro_json LONGTEXT NOT NULL,
      fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_combate_equipo_a FOREIGN KEY (equipo_a_id) REFERENCES equipos(id) ON DELETE CASCADE,
      CONSTRAINT fk_combate_equipo_b FOREIGN KEY (equipo_b_id) REFERENCES equipos(id) ON DELETE CASCADE,
      CONSTRAINT fk_combate_ganador FOREIGN KEY (ganador_equipo_id) REFERENCES equipos(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await db.query(
    'INSERT INTO tipos_pokemon (id, nombre_es) VALUES ? ON DUPLICATE KEY UPDATE nombre_es = VALUES(nombre_es)',
    [TYPES.map(({ id, es }) => [id, es])]
  )
  await db.query(
    'INSERT INTO habilidades (nombre, tipo_id, poder, precision_pct, descripcion) VALUES ? ON DUPLICATE KEY UPDATE tipo_id = VALUES(tipo_id), poder = VALUES(poder), precision_pct = VALUES(precision_pct), descripcion = VALUES(descripcion)',
    [MOVES.map((move) => [move.name, move.type, move.power, move.accuracy, move.description])]
  )

  const [matchupCountRows] = await db.query('SELECT COUNT(*) AS total FROM efectividad_tipos')
  if (matchupCountRows[0].total < TYPES.length * TYPES.length) {
    const multiplier = new Map()
    for (const attackType of TYPES) {
      const detail = await fetchPokeApi(`https://pokeapi.co/api/v2/type/${attackType.id}`)
      for (const target of detail.damage_relations.no_damage_to) multiplier.set(`${attackType.id}:${target.name}`, 0)
      for (const target of detail.damage_relations.half_damage_to) multiplier.set(`${attackType.id}:${target.name}`, 0.5)
      for (const target of detail.damage_relations.double_damage_to) multiplier.set(`${attackType.id}:${target.name}`, 2)
    }
    const matchups = TYPES.flatMap((attack) => TYPES.map((defense) => [
      attack.id,
      defense.id,
      multiplier.get(`${attack.id}:${defense.id}`) ?? 1
    ]))
    await db.query(
      'INSERT INTO efectividad_tipos (tipo_atacante, tipo_defensor, multiplicador) VALUES ? ON DUPLICATE KEY UPDATE multiplicador = VALUES(multiplicador)',
      [matchups]
    )
  }

  const [statCountRows] = await db.query('SELECT COUNT(*) AS total FROM pokemon_estadisticas')
  if (statCountRows[0].total < 151) {
    const pokemonRows = []
    for (let start = 1; start <= 151; start += 8) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(8, 152 - start) }, (_, offset) => fetchPokeApi(`https://pokeapi.co/api/v2/pokemon/${start + offset}`))
      )
      pokemonRows.push(...batch)
    }

    const [moveRows] = await db.query('SELECT id, tipo_id FROM habilidades')
    const moveByType = new Map(moveRows.map((move) => [move.tipo_id, move.id]))
    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()
      for (const pokemon of pokemonRows) {
        const id = pokemon.id
        const types = pokemon.types.sort((a, b) => a.slot - b.slot)
        const typeValues = types.map(({ slot, type }) => [id, type.name, slot])
        await connection.execute(
          'INSERT INTO pokemones (id, name, image) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), image = IF(image IS NULL OR image = "", VALUES(image), image)',
          [id, pokemon.name, pokemon.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`]
        )
        await connection.execute('DELETE FROM pokemon_tipos WHERE pokemon_id = ?', [id])
        await connection.query('INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot) VALUES ?', [typeValues])
        await connection.execute(
          'INSERT INTO pokemon_habilidad (pokemon_id, habilidad_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE habilidad_id = VALUES(habilidad_id)',
          [id, moveByType.get(types[0].type.name)]
        )
        const stats = Object.fromEntries(pokemon.stats.map((stat) => [stat.stat.name, stat.base_stat]))
        await connection.execute(
          'INSERT INTO pokemon_estadisticas (pokemon_id, hp, ataque, defensa, velocidad) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE hp = VALUES(hp), ataque = VALUES(ataque), defensa = VALUES(defensa), velocidad = VALUES(velocidad)',
          [id, stats.hp, stats.attack, stats.defense, stats.speed]
        )
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  console.log('✅ Tabla de tipos, habilidades y efectividades inicializada.')
  battleDataReady = true
}

async function getPokemonRows(whereSql = '', values = []) {
  const [rows] = await db.execute(`
    SELECT p.id, p.name, p.image, ps.hp, ps.ataque, ps.defensa, ps.velocidad,
           pt.slot, t.id AS tipo_id, t.nombre_es AS tipo_es,
           h.id AS habilidad_id, h.nombre AS habilidad_nombre, h.tipo_id AS habilidad_tipo,
           ht.nombre_es AS habilidad_tipo_es, h.poder, h.precision_pct, h.descripcion AS habilidad_descripcion
    FROM pokemones p
    LEFT JOIN pokemon_estadisticas ps ON ps.pokemon_id = p.id
    LEFT JOIN pokemon_tipos pt ON pt.pokemon_id = p.id
    LEFT JOIN tipos_pokemon t ON t.id = pt.tipo_id
    LEFT JOIN pokemon_habilidad ph ON ph.pokemon_id = p.id
    LEFT JOIN habilidades h ON h.id = ph.habilidad_id
    LEFT JOIN tipos_pokemon ht ON ht.id = h.tipo_id
    ${whereSql}
    ORDER BY p.id, pt.slot
  `, values)
  return rows
}

function formatPokemonRows(rows) {
  const pokemonMap = new Map()
  for (const row of rows) {
    if (!pokemonMap.has(row.id)) {
      pokemonMap.set(row.id, {
        id: row.id,
        name: row.name,
        image: row.image,
        stats: row.hp === null ? null : { hp: row.hp, attack: row.ataque, defense: row.defensa, speed: row.velocidad },
        types: [],
        ability: row.habilidad_id === null ? null : {
          id: row.habilidad_id,
          name: row.habilidad_nombre,
          type: row.habilidad_tipo,
          typeEs: row.habilidad_tipo_es,
          power: row.poder,
          accuracy: row.precision_pct,
          description: row.habilidad_descripcion
        }
      })
    }
    if (row.tipo_id && !pokemonMap.get(row.id).types.some((type) => type.id === row.tipo_id)) {
      pokemonMap.get(row.id).types.push({ id: row.tipo_id, name: row.tipo_es })
    }
  }
  return [...pokemonMap.values()]
}

function formatTeamRows(rows) {
  const teams = new Map()
  for (const row of rows) {
    if (!teams.has(row.equipo_id)) {
      teams.set(row.equipo_id, {
        id: row.equipo_id,
        nombre: row.nombre,
        fecha_creacion: row.fecha_creacion,
        pokemones: []
      })
    }
    if (row.pokemon_id !== null) {
      let pokemon = teams.get(row.equipo_id).pokemones.find((item) => item.id === row.pokemon_id)
      if (!pokemon) {
        pokemon = {
          id: row.pokemon_id,
          name: row.pokemon_name,
          image: row.pokemon_image,
          stats: { hp: row.hp, attack: row.ataque, defense: row.defensa, speed: row.velocidad },
          types: [],
          ability: row.habilidad_id === null ? null : {
            id: row.habilidad_id,
            name: row.habilidad_nombre,
            type: row.habilidad_tipo,
            typeEs: row.habilidad_tipo_es,
            power: row.poder,
            accuracy: row.precision_pct,
            description: row.habilidad_descripcion
          }
        }
        teams.get(row.equipo_id).pokemones.push(pokemon)
      }
      if (row.tipo_id && !pokemon.types.some((type) => type.id === row.tipo_id)) {
        pokemon.types.push({ id: row.tipo_id, name: row.tipo_es })
      }
    }
  }
  return [...teams.values()]
}

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ success: true, database: 'connected', battleData: battleDataReady })
  } catch (error) {
    console.error('Database health check failed:', error.message)
    res.status(503).json({ success: false, error: 'No se pudo conectar con MySQL.' })
  }
})

app.get('/api/pokemones', async (_req, res) => {
  try {
    const rows = await getPokemonRows()
    res.json({ success: true, pokemones: formatPokemonRows(rows) })
  } catch (error) {
    console.error('Error al cargar el catálogo de batalla:', error)
    res.status(500).json({ success: false, error: 'No se pudo cargar el catálogo de Pokémon.' })
  }
})

app.get('/api/tipos', (_req, res) => {
  res.json({ success: true, tipos: TYPES })
})

app.post('/api/pokemones', async (req, res) => {
  const pokemones = req.body?.pokemones
  if (!Array.isArray(pokemones) || pokemones.length < 1 || pokemones.length > 151) {
    return res.status(400).json({ error: 'Se esperaba una lista válida de Pokémon.' })
  }

  const ids = new Set()
  const validos = pokemones.every((pokemon) => {
    const id = Number(pokemon?.id)
    if (!Number.isInteger(id) || id < 1 || id > 10000 || ids.has(id)) return false
    if (typeof pokemon?.name !== 'string' || !pokemon.name.trim() || pokemon.name.length > 100) return false
    ids.add(id)
    return true
  })

  if (!validos) {
    return res.status(400).json({ error: 'La lista contiene Pokémon con datos inválidos o repetidos.' })
  }

  try {
    const values = pokemones.map(({ id, name, image }) => [
      Number(id),
      name.trim(),
      typeof image === 'string' ? image : ''
    ])
    await db.query(
      'INSERT INTO pokemones (id, name, image) VALUES ? ON DUPLICATE KEY UPDATE name = VALUES(name), image = VALUES(image)',
      [values]
    )
    res.json({ success: true, total: pokemones.length })
  } catch (error) {
    console.error('Error al sincronizar el catálogo:', error)
    res.status(500).json({ error: 'No se pudo guardar el catálogo en la base de datos.' })
  }
})

app.post('/api/equipos', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : ''
  const pokemones = req.body?.pokemones

  if (!nombre || nombre.length > 100 || !Array.isArray(pokemones) || pokemones.length < 1 || pokemones.length > 5) {
    return res.status(400).json({ error: 'Indica un nombre (máximo 100 caracteres) y entre 1 y 5 Pokémon.' })
  }

  const vistos = new Set()
  const validos = pokemones.every((pokemon) => {
    const id = Number(pokemon?.id)
    if (!Number.isInteger(id) || id < 1 || typeof pokemon?.name !== 'string' || !pokemon.name.trim()) return false
    if (vistos.has(id)) return false
    vistos.add(id)
    return true
  })

  if (!validos) {
    return res.status(400).json({ error: 'La lista de Pokémon contiene datos inválidos o repetidos.' })
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()
    const [equipoResult] = await connection.execute(
      'INSERT INTO equipos (nombre) VALUES (?)',
      [nombre]
    )
    const equipoId = equipoResult.insertId

    for (const pokemon of pokemones) {
      const id = Number(pokemon.id)
      const image = typeof pokemon.image === 'string' ? pokemon.image : ''
      await connection.execute(
        'INSERT INTO pokemones (id, name, image) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), image = VALUES(image)',
        [id, pokemon.name.trim(), image]
      )
      await connection.execute(
        'INSERT INTO equipo_pokemon (equipo_id, pokemon_id) VALUES (?, ?)',
        [equipoId, id]
      )
    }

    await connection.commit()
    res.status(201).json({ success: true, mensaje: 'Equipo guardado correctamente.', id: equipoId })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Error al guardar el equipo:', error)
    res.status(500).json({ error: 'No se pudo guardar el equipo en la base de datos.' })
  } finally {
    connection?.release()
  }
})

app.get('/api/listado', async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.id AS equipo_id, e.nombre, e.fecha_creacion,
             p.id AS pokemon_id, p.name AS pokemon_name, p.image AS pokemon_image,
             ps.hp, ps.ataque, ps.defensa, ps.velocidad,
             pt.slot, t.id AS tipo_id, t.nombre_es AS tipo_es,
             h.id AS habilidad_id, h.nombre AS habilidad_nombre, h.tipo_id AS habilidad_tipo,
             ht.nombre_es AS habilidad_tipo_es, h.poder, h.precision_pct,
             h.descripcion AS habilidad_descripcion
      FROM equipos e
      LEFT JOIN equipo_pokemon ep ON ep.equipo_id = e.id
      LEFT JOIN pokemones p ON p.id = ep.pokemon_id
      LEFT JOIN pokemon_estadisticas ps ON ps.pokemon_id = p.id
      LEFT JOIN pokemon_tipos pt ON pt.pokemon_id = p.id
      LEFT JOIN tipos_pokemon t ON t.id = pt.tipo_id
      LEFT JOIN pokemon_habilidad ph ON ph.pokemon_id = p.id
      LEFT JOIN habilidades h ON h.id = ph.habilidad_id
      LEFT JOIN tipos_pokemon ht ON ht.id = h.tipo_id
      ORDER BY e.fecha_creacion DESC, e.id DESC, ep.id ASC, pt.slot ASC
    `)
    res.json({ success: true, equipos: formatTeamRows(rows) })
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    res.status(500).json({ success: false, error: 'No se pudieron cargar los equipos.' })
  }
})

function battleDamage(attacker, defender, effectiveness) {
  const move = attacker.ability
  if (Math.random() * 100 >= move.accuracy) {
    return { damage: 0, effectiveness, missed: true, critical: false }
  }
  const attack = attacker.stats?.attack || 50
  const defense = Math.max(1, defender.stats?.defense || 50)
  const sameType = attacker.types.some((type) => type.id === move.type)
  const stab = sameType ? 1.5 : 1
  const critical = Math.random() < 1 / 16
  const randomFactor = 0.85 + Math.random() * 0.15
  const base = ((2 * 50 / 5 + 2) * move.power * attack / defense) / 50 + 2
  const damage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(base * stab * effectiveness * randomFactor * (critical ? 1.5 : 1)))
  return { damage, effectiveness, missed: false, critical }
}

function simulateBattle(teamA, teamB, matchupRows) {
  const matchup = new Map(matchupRows.map((row) => [`${row.tipo_atacante}:${row.tipo_defensor}`, Number(row.multiplicador)]))
  const prepareTeam = (team) => team.pokemones.map((pokemon) => ({
    pokemon,
    maxHp: Math.max(50, (pokemon.stats?.hp || 50) * 2 + 50),
    hp: Math.max(50, (pokemon.stats?.hp || 50) * 2 + 50)
  }))
  const sides = [
    { team: teamA, fighters: prepareTeam(teamA), active: 0 },
    { team: teamB, fighters: prepareTeam(teamB), active: 0 }
  ]
  const log = []
  let round = 0
  const alive = (side) => side.active < side.fighters.length
  const effectivenessFor = (moveType, types) => types.reduce(
    (result, type) => result * (matchup.get(`${moveType}:${type.id}`) ?? 1),
    1
  )

  while (alive(sides[0]) && alive(sides[1]) && round < 150) {
    round += 1
    const firstIndex = (sides[0].fighters[sides[0].active].pokemon.stats?.speed || 0) >=
      (sides[1].fighters[sides[1].active].pokemon.stats?.speed || 0) ? 0 : 1
    for (const sideIndex of [firstIndex, 1 - firstIndex]) {
      const side = sides[sideIndex]
      const opponent = sides[1 - sideIndex]
      if (!alive(side) || !alive(opponent)) continue
      const fighter = side.fighters[side.active]
      const target = opponent.fighters[opponent.active]
      const pokemon = fighter.pokemon
      if (!pokemon.ability) {
        log.push({ round, team: side.team.nombre, pokemon: pokemon.name, text: `${pokemon.name} no tiene una habilidad cargada.` })
        continue
      }
      const multiplier = effectivenessFor(pokemon.ability.type, target.pokemon.types)
      const result = battleDamage(pokemon, target.pokemon, multiplier)
      target.hp = Math.max(0, target.hp - result.damage)
      const effectText = result.effectiveness === 0 ? 'No tuvo efecto' : result.effectiveness >= 2 ? '¡Súper eficaz!' : result.effectiveness > 0 && result.effectiveness < 1 ? 'No es muy eficaz' : ''
      const text = result.missed
        ? `${pokemon.name} usó ${pokemon.ability.name}, pero falló.`
        : `${pokemon.name} usó ${pokemon.ability.name} (${pokemon.ability.typeEs}) e hizo ${result.damage} de daño${result.critical ? ' · ¡crítico!' : ''}${effectText ? ` · ${effectText}` : ''}.`
      log.push({
        round,
        team: side.team.nombre,
        pokemon: pokemon.name,
        target: target.pokemon.name,
        ability: pokemon.ability.name,
        abilityType: pokemon.ability.type,
        effectiveness: result.effectiveness,
        damage: result.damage,
        remainingHp: target.hp,
        targetMaxHp: target.maxHp,
        missed: result.missed,
        critical: result.critical,
        text
      })
      if (target.hp === 0) {
        log.push({ round, team: opponent.team.nombre, pokemon: target.pokemon.name, text: `¡${target.pokemon.name} quedó fuera de combate!` })
        opponent.active += 1
      }
    }
  }

  let winner = null
  if (alive(sides[0])) winner = teamA
  else if (alive(sides[1])) winner = teamB
  else log.push({ round, text: 'El combate terminó sin ganador tras alcanzar el límite de turnos.' })
  return { winner, rounds: round, log }
}

app.post('/api/batallas', async (req, res) => {
  const teamAId = Number(req.body?.equipoA)
  const teamBId = Number(req.body?.equipoB)
  if (!Number.isInteger(teamAId) || !Number.isInteger(teamBId) || teamAId === teamBId) {
    return res.status(400).json({ error: 'Selecciona dos equipos guardados diferentes.' })
  }

  try {
    const [rows] = await db.execute(`
      SELECT e.id AS equipo_id, e.nombre, e.fecha_creacion,
             p.id AS pokemon_id, p.name AS pokemon_name, p.image AS pokemon_image,
             ps.hp, ps.ataque, ps.defensa, ps.velocidad,
             pt.slot, t.id AS tipo_id, t.nombre_es AS tipo_es,
             h.id AS habilidad_id, h.nombre AS habilidad_nombre, h.tipo_id AS habilidad_tipo,
             ht.nombre_es AS habilidad_tipo_es, h.poder, h.precision_pct,
             h.descripcion AS habilidad_descripcion
      FROM equipos e
      LEFT JOIN equipo_pokemon ep ON ep.equipo_id = e.id
      LEFT JOIN pokemones p ON p.id = ep.pokemon_id
      LEFT JOIN pokemon_estadisticas ps ON ps.pokemon_id = p.id
      LEFT JOIN pokemon_tipos pt ON pt.pokemon_id = p.id
      LEFT JOIN tipos_pokemon t ON t.id = pt.tipo_id
      LEFT JOIN pokemon_habilidad ph ON ph.pokemon_id = p.id
      LEFT JOIN habilidades h ON h.id = ph.habilidad_id
      LEFT JOIN tipos_pokemon ht ON ht.id = h.tipo_id
      WHERE e.id IN (?, ?)
      ORDER BY e.id, ep.id, pt.slot
    `, [teamAId, teamBId])
    const teams = formatTeamRows(rows)
    const teamA = teams.find((team) => team.id === teamAId)
    const teamB = teams.find((team) => team.id === teamBId)
    if (!teamA || !teamB) return res.status(404).json({ error: 'No se encontraron los dos equipos seleccionados.' })
    if (!teamA.pokemones.length || !teamB.pokemones.length) {
      return res.status(400).json({ error: 'Ambos equipos deben tener al menos un Pokémon.' })
    }
    if ([...teamA.pokemones, ...teamB.pokemones].some((pokemon) => !pokemon.ability || !pokemon.types.length)) {
      return res.status(503).json({ error: 'Faltan tipos o habilidades. Reinicia la API con conexión a internet para sincronizar PokéAPI.' })
    }

    const [matchupRows] = await db.query('SELECT tipo_atacante, tipo_defensor, multiplicador FROM efectividad_tipos')
    const result = simulateBattle(teamA, teamB, matchupRows)
    const registro = JSON.stringify(result.log)
    const [saveResult] = await db.execute(
      'INSERT INTO combates (equipo_a_id, equipo_b_id, ganador_equipo_id, turnos, registro_json) VALUES (?, ?, ?, ?, ?)',
      [teamAId, teamBId, result.winner?.id ?? null, result.rounds, registro]
    )
    res.json({
      success: true,
      combateId: saveResult.insertId,
      ganador: result.winner ? { id: result.winner.id, nombre: result.winner.nombre } : null,
      equipoA: teamA,
      equipoB: teamB,
      turnos: result.rounds,
      registro: result.log
    })
  } catch (error) {
    console.error('Error al simular el combate:', error)
    res.status(500).json({ error: 'No se pudo completar el combate.' })
  }
})

async function startServer() {
  try {
    await db.query('SELECT 1')
    console.log(`✅ Conectado a MySQL (${process.env.DB_NAME || 'pokedex'}).`)
    await initializeBattleData()
  } catch (error) {
    console.error('❌ No se pudo inicializar MySQL o la PokéAPI:', error.message)
  }

  app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}`)
  })
}

startServer()