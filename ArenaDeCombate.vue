<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from './axios.js'

const equipos = ref([])
const equipoA = ref('')
const equipoB = ref('')
const cargando = ref(true)
const combatiendo = ref(false)
const error = ref('')
const resultado = ref(null)

const equipoSeleccionadoA = computed(() => equipos.value.find((equipo) => equipo.id === equipoA.value))
const equipoSeleccionadoB = computed(() => equipos.value.find((equipo) => equipo.id === equipoB.value))

async function cargarEquipos() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/listado')
    equipos.value = data.equipos.filter((equipo) => equipo.pokemones.length > 0)
  } catch (requestError) {
    console.error('No se pudieron cargar los equipos para combatir:', requestError)
    error.value = requestError.response?.data?.error || 'No se pudo conectar con la API. Comprueba que Express y MySQL estén activos.'
  } finally {
    cargando.value = false
  }
}

async function iniciarCombate() {
  if (!equipoA.value || !equipoB.value || equipoA.value === equipoB.value) return
  combatiendo.value = true
  error.value = ''
  resultado.value = null
  try {
    const { data } = await api.post('/batallas', { equipoA: equipoA.value, equipoB: equipoB.value })
    resultado.value = data
  } catch (requestError) {
    console.error('No se pudo completar el combate:', requestError)
    error.value = requestError.response?.data?.error || 'No se pudo iniciar el combate.'
  } finally {
    combatiendo.value = false
  }
}

function tipoClase(tipo) {
  return `type-${tipo}`
}

onMounted(cargarEquipos)
</script>

<template>
  <section class="page battle-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">ARENA POKÉMON</p>
        <h1>Prepara un combate</h1>
        <p class="page-description">Elige dos equipos guardados. Los tipos, las habilidades y las estadísticas deciden cada enfrentamiento.</p>
      </div>
      <RouterLink to="/pokemon" class="button button-secondary">Ver equipos</RouterLink>
    </div>

    <div v-if="cargando" class="notice">Cargando equipos guardados…</div>
    <div v-else-if="error" class="notice notice-error" role="alert">{{ error }} <button class="button button-secondary" @click="cargarEquipos">Reintentar</button></div>
    <div v-else-if="equipos.length < 2" class="empty-state battle-empty">
      <h2>Necesitas dos equipos para empezar</h2>
      <p>Guarda dos equipos distintos en la Pokédex y después podrás enfrentarlos aquí.</p>
      <RouterLink class="button button-primary" to="/listado">Elegir Pokémon</RouterLink>
      <RouterLink class="button button-secondary" to="/pokemon">Ir a mis equipos</RouterLink>
    </div>
    <template v-else>
      <div class="battle-picker">
        <article class="battle-side side-a">
          <span class="side-label">EQUIPO AZUL</span>
          <label for="team-a">Tu equipo</label>
          <select id="team-a" v-model.number="equipoA" @change="resultado = null">
            <option disabled value="">Elegir equipo guardado</option>
            <option v-for="equipo in equipos" :key="equipo.id" :value="equipo.id">{{ equipo.nombre }} · {{ equipo.pokemones.length }} Pokémon</option>
          </select>
          <div v-if="equipoSeleccionadoA" class="picker-roster">
            <div v-for="pokemon in equipoSeleccionadoA.pokemones" :key="pokemon.id" class="picker-pokemon">
              <img :src="pokemon.image" :alt="pokemon.name" />
              <div><strong>{{ pokemon.name }}</strong><span>{{ pokemon.ability?.name || 'Habilidad pendiente' }}</span></div>
              <div class="type-list"><span v-for="tipo in pokemon.types" :key="tipo.id" class="type-badge" :class="tipoClase(tipo.id)">{{ tipo.name }}</span></div>
            </div>
          </div>
        </article>

        <div class="versus-mark" aria-label="contra">VS</div>

        <article class="battle-side side-b">
          <span class="side-label">EQUIPO ROJO</span>
          <label for="team-b">Rival</label>
          <select id="team-b" v-model.number="equipoB" @change="resultado = null">
            <option disabled value="">Elegir equipo rival</option>
            <option v-for="equipo in equipos" :key="equipo.id" :value="equipo.id" :disabled="equipo.id === equipoA">{{ equipo.nombre }} · {{ equipo.pokemones.length }} Pokémon</option>
          </select>
          <div v-if="equipoSeleccionadoB" class="picker-roster">
            <div v-for="pokemon in equipoSeleccionadoB.pokemones" :key="pokemon.id" class="picker-pokemon">
              <img :src="pokemon.image" :alt="pokemon.name" />
              <div><strong>{{ pokemon.name }}</strong><span>{{ pokemon.ability?.name || 'Habilidad pendiente' }}</span></div>
              <div class="type-list"><span v-for="tipo in pokemon.types" :key="tipo.id" class="type-badge" :class="tipoClase(tipo.id)">{{ tipo.name }}</span></div>
            </div>
          </div>
        </article>
      </div>

      <div class="battle-launch">
        <p>La ventaja de tipo duplica el daño; las resistencias lo reducen y las inmunidades lo anulan.</p>
        <button class="button button-primary battle-button" :disabled="!equipoA || !equipoB || equipoA === equipoB || combatiendo" @click="iniciarCombate">
          {{ combatiendo ? 'Combate en curso…' : '¡Luchar!' }}
        </button>
      </div>
      <p v-if="error" class="notice notice-error" role="alert">{{ error }}</p>

      <section v-if="resultado" class="battle-result" aria-live="polite">
        <div class="winner-banner">
          <p class="eyebrow">{{ resultado.ganador ? 'VICTORIA' : 'EMPATE' }} · COMBATE #{{ resultado.combateId }}</p>
          <h2>{{ resultado.ganador ? `${resultado.ganador.nombre} gana el combate` : '¡Combate empatado!' }}</h2>
          <p>{{ resultado.turnos }} rondas · Se aplicaron efectividad, inmunidades, STAB, precisión, velocidad y estadísticas base.</p>
        </div>
        <div class="result-rosters">
          <article v-for="(equipo, index) in [resultado.equipoA, resultado.equipoB]" :key="equipo.id" class="result-roster" :class="index === 0 ? 'side-a' : 'side-b'">
            <h3>{{ equipo.nombre }} <span v-if="resultado.ganador?.id === equipo.id">🏆</span></h3>
            <div class="result-pokemon-list">
              <div v-for="pokemon in equipo.pokemones" :key="pokemon.id" class="result-pokemon">
                <img :src="pokemon.image" :alt="pokemon.name" />
                <div><strong>{{ pokemon.name }}</strong><span>{{ pokemon.ability.name }} · {{ pokemon.ability.typeEs }}</span></div>
                <div class="type-list"><span v-for="tipo in pokemon.types" :key="tipo.id" class="type-badge" :class="tipoClase(tipo.id)">{{ tipo.name }}</span></div>
              </div>
            </div>
          </article>
        </div>
        <div class="battle-log-panel">
          <div class="section-heading"><h3>Registro del combate</h3><span class="team-count">{{ resultado.registro.length }} eventos</span></div>
          <ol class="battle-log">
            <li v-for="(evento, index) in resultado.registro" :key="`${index}-${evento.round}`" :class="{ 'log-knockout': evento.text?.includes('fuera de combate'), 'log-super': evento.effectiveness >= 2 }">
              <span class="log-round">R{{ evento.round }}</span>
              <span>{{ evento.text }}</span>
              <span v-if="evento.damage > 0" class="log-damage">-{{ evento.damage }} HP</span>
            </li>
          </ol>
        </div>
      </section>
    </template>
  </section>
</template>
