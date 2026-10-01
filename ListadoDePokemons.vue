  <script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { usePokemonStore } from './PokemonPinia.js'
import api from './axios.js'

const listado = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const errorBaseDatos = ref('')
const store = usePokemonStore()

async function obtenerPokemons() {
    cargando.value = true
    errorCarga.value = ''
    try {
      const respuesta = await api.get('/pokemones')
      listado.value = respuesta.data.pokemones
    } catch (error) {
      console.error('No se pudo cargar el catálogo del servidor:', error)
      try {
        const respuesta = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151')
        listado.value = respuesta.data.results.map((pokemon) => {
          const id = Number(pokemon.url.split('/').filter(Boolean).at(-1))
          return {
            id,
            name: pokemon.name,
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
            types: [],
            ability: null
          }
        })
        void sincronizarCatalogo(listado.value)
      } catch (fallbackError) {
        console.error('No se pudo cargar PokéAPI:', fallbackError)
        errorCarga.value = 'No pudimos cargar los Pokémon. Comprueba que la API esté activa y que haya conexión a internet.'
      }
    } finally {
      cargando.value = false
    }
}

async function sincronizarCatalogo(pokemones) {
  errorBaseDatos.value = ''
  try {
    await api.post('/pokemones', { pokemones })
  } catch (error) {
    console.error('No se pudo sincronizar el catálogo con MySQL:', error)
    errorBaseDatos.value = 'Los Pokémon cargaron, pero no pudimos sincronizar el catálogo con MySQL. Revisa que la API y la base estén activas.'
  }
}

function elegir(pokemon) {
  store.elegirPokemon(pokemon)
}

function estaElegido(id) {
  return store.seleccionados.some((pokemon) => pokemon.id === id)
}

onMounted(obtenerPokemons)
</script>

<template>
  <section class="page listing-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">TU AVENTURA EMPIEZA AQUÍ</p>
          <h1>Elige a tus Pokémon</h1>
          <p class="page-description">Explora la primera generación y arma un equipo a tu medida.</p>
      </div>
        <RouterLink class="button button-primary team-link" to="/pokemon">
          Mi equipo <span class="team-count">{{ store.seleccionados.length }}/5</span>
        </RouterLink>
    </div>

    <div v-if="cargando" class="notice">Cargando Pokémon…</div>
    <div v-else-if="errorCarga" class="notice notice-error" role="alert">
      {{ errorCarga }}
      <button class="button button-secondary" @click="obtenerPokemons">Reintentar</button>
    </div>
    <template v-else>
      <div v-if="errorBaseDatos" class="notice notice-error" role="status">{{ errorBaseDatos }}</div>
      <div class="pokemon-grid">
        <article v-for="p in listado" :key="p.id" class="pokemon-card">
          <span class="pokemon-number">#{{ String(p.id).padStart(3, '0') }}</span>
          <img :src="p.image" :alt="p.name" loading="lazy" />
          <h2>{{ p.name }}</h2>
          <div class="type-list">
            <span v-for="tipo in p.types" :key="tipo.id" class="type-badge" :class="`type-${tipo.id}`">{{ tipo.name }}</span>
          </div>
          <p v-if="p.ability" class="pokemon-ability"><strong>{{ p.ability.name }}</strong><span>{{ p.ability.typeEs }} · {{ p.ability.power }} potencia</span></p>
          <button
            class="button"
            :class="estaElegido(p.id) ? 'button-selected' : 'button-secondary'"
            :disabled="estaElegido(p.id) || !store.puedeElegir"
            @click="elegir(p)"
          >
            {{ estaElegido(p.id) ? 'En tu equipo' : 'Añadir al equipo' }}
          </button>
        </article>
      </div>
    </template>
  </section>
</template>

