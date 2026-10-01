import { createRouter, createWebHistory } from 'vue-router'
import ListadoDePokemons from './ListadoDePokemons.vue'
import PokemonDetalle from './PokemonDetalle.vue'
import ArenaDeCombate from './ArenaDeCombate.vue'


const routes = [
  { path: '/', redirect: '/listado' },
  { path: '/listado',
    name: 'listado',
    component: ListadoDePokemons },

  { path: '/pokemon',
  name: 'detalle',
  component: PokemonDetalle },
  { path: '/batalla', name: 'batalla', component: ArenaDeCombate },
  { path: '/equipos-guardados', redirect: '/pokemon' },
  { path: '/:pathMatch(.*)*', redirect: '/listado' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router


