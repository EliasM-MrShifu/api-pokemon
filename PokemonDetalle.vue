<script setup>
import { computed, ref, onMounted } from 'vue'
import { usePokemonStore } from './PokemonPinia.js'
import axios from './axios.js'

const store = usePokemonStore()
const equipoSeleccionado = computed(() => store.seleccionados)
const nombreEquipo = ref('Mi equipo Pokémon')
const nuevoNombre = ref(nombreEquipo.value)
const equiposGuardados = ref([])
const cargandoHistorial = ref(false)
const guardando = ref(false)
const errorHistorial = ref('')
const mensaje = ref('')

async function cargarHistorial() {
    cargandoHistorial.value = true
    errorHistorial.value = ''
    try {
        const respuesta = await axios.get('/listado')
        equiposGuardados.value = respuesta.data.equipos || []
    } catch (err) {
        console.error('Error al cargar los equipos:', err)
        errorHistorial.value = err.response?.data?.error || 'No se pudo conectar con la API. Comprueba que el servidor y MySQL estén iniciados.'
    } finally {
        cargandoHistorial.value = false
    }
}

onMounted(cargarHistorial)

function renombrarEquipo() {
    const nombre = nuevoNombre.value.trim()
    if (nombre) {
        nombreEquipo.value = nombre
        mensaje.value = ''
    }
}

async function guardarEquipoSQL() {
    if (equipoSeleccionado.value.length === 0) {
        mensaje.value = 'Añade al menos un Pokémon antes de guardar.'
        return
    }
    if (!nombreEquipo.value.trim()) {
        mensaje.value = 'Escribe un nombre para el equipo.'
        return
    }

    try {
        guardando.value = true
        mensaje.value = ''
        await axios.post("/equipos", {
            nombre: nombreEquipo.value.trim(),
            pokemones: equipoSeleccionado.value.map(({ id, name, image }) => ({ id, name, image }))
        })
        mensaje.value = '¡Equipo guardado correctamente en la base de datos!'
        await cargarHistorial()
    } catch (err) {
        console.error('Error al guardar el equipo:', err)
        mensaje.value = err.response?.data?.error || 'No se pudo guardar el equipo. Comprueba que la API y MySQL estén activos.'
    } finally {
        guardando.value = false
    }
}
</script>

<template>
    <section class="page team-page">
        <div class="page-heading">
            <div>
                <p class="eyebrow">TU SELECCIÓN</p>
                <h1>{{ nombreEquipo }}</h1>
                <p class="page-description">Puedes elegir hasta 5 Pokémon. Guarda el equipo para conservarlo en MySQL.</p>
            </div>
        </div>

        <form class="rename-form" @submit.prevent="renombrarEquipo">
            <label for="team-name">Nombre del equipo</label>
            <input id="team-name" v-model="nuevoNombre" maxlength="100" placeholder="Mi equipo Pokémon" />
            <button class="button button-secondary" type="submit">Cambiar nombre</button>
        </form>

        <div class="selection-panel">
            <div class="section-heading">
                <h2>Equipo actual</h2>
                <span class="team-count">{{ equipoSeleccionado.length }}/5</span>
            </div>
            <div v-if="equipoSeleccionado.length" class="selected-grid">
                <article v-for="p in equipoSeleccionado" :key="p.id" class="selected-card">
                    <img :src="p.image" :alt="p.name" />
                    <span>#{{ String(p.id).padStart(3, '0') }}</span>
                    <h3>{{ p.name }}</h3>
                    <div v-if="p.types?.length" class="type-list">
                        <span v-for="tipo in p.types" :key="tipo.id" class="type-badge" :class="`type-${tipo.id}`">{{ tipo.name }}</span>
                    </div>
                    <p v-if="p.ability" class="pokemon-ability"><strong>{{ p.ability.name }}</strong><span>{{ p.ability.typeEs }} · {{ p.ability.power }} potencia</span></p>
                    <button class="remove-button" :aria-label="`Quitar a ${p.name}`" @click="store.removerPokemon(p)">Quitar</button>
                </article>
            </div>
            <p v-else class="empty-state">Todavía no elegiste Pokémon. <RouterLink to="/listado">Explora la Pokédex</RouterLink>.</p>
            <div class="save-row">
                <button class="button button-primary" :disabled="guardando || !equipoSeleccionado.length" @click="guardarEquipoSQL">
                    {{ guardando ? 'Guardando…' : 'Guardar equipo en MySQL' }}
                </button>
                <p v-if="mensaje" class="status-message" role="status">{{ mensaje }}</p>
            </div>
        </div>

        <section class="history-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">GUARDADOS EN MYSQL</p>
                    <h2>Equipos anteriores</h2>
                </div>
                <button class="button button-secondary" :disabled="cargandoHistorial" @click="cargarHistorial">Actualizar</button>
            </div>
            <p v-if="cargandoHistorial" class="notice">Cargando equipos guardados…</p>
            <p v-else-if="errorHistorial" class="notice notice-error" role="alert">{{ errorHistorial }}</p>
            <p v-else-if="!equiposGuardados.length" class="empty-state">Todavía no hay equipos guardados.</p>
            <div v-else class="history-grid">
                <article v-for="equipo in equiposGuardados" :key="equipo.id" class="history-card">
                    <div class="history-title">
                        <h3>{{ equipo.nombre }}</h3>
                        <time>{{ new Date(equipo.fecha_creacion).toLocaleDateString('es-AR') }}</time>
                    </div>
                    <div class="history-pokemon">
                        <div v-for="p in equipo.pokemones" :key="p.id" class="history-pokemon-item">
                            <img :src="p.image" :alt="p.name" loading="lazy" />
                            <span>{{ p.name }}<small v-if="p.ability"> · {{ p.ability.name }}</small></span>
                        </div>
                    </div>
                    <RouterLink class="button button-secondary history-battle-link" to="/batalla">Enfrentar equipos</RouterLink>
                </article>
            </div>
        </section>
    </section>
</template>
