// src/stores/PokemonPinia.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePokemonStore = defineStore('pokemon', () => {
    const seleccionados = ref([])
    const MAX_POKEMONS = 5

    const puedeElegir = computed(() => seleccionados.value.length < MAX_POKEMONS)

    function elegirPokemon(pokemon) {
        if (puedeElegir.value && !seleccionados.value.some(p => p.id === pokemon.id)) {
            seleccionados.value.push(pokemon)
            console.log(`Elegido: ${pokemon.name}. Total: ${seleccionados.value.length}`)
        } else if (!puedeElegir.value) {
            alert(`Tu equipo ya tiene ${MAX_POKEMONS} Pokémon.`)
        } else {
            alert(`${pokemon.name} ya está en tu equipo.`)
        }
    }

    function removerPokemon(pokemon) {
        seleccionados.value = seleccionados.value.filter(p => p.id !== pokemon.id)
        console.log(`Removido: ${pokemon.name}. Total: ${seleccionados.value.length}`)
    }

    function limpiarEquipo() {
        seleccionados.value = []
    }

    return { seleccionados, puedeElegir, elegirPokemon, removerPokemon, limpiarEquipo }
})

