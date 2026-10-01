<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink to="/listado" class="brand" aria-label="Pokédex, inicio">
        <span class="brand-mark">P</span>
        <span>Pokédex<span class="brand-subtitle">CREA TU EQUIPO</span></span>
      </RouterLink>
      <nav class="site-nav" aria-label="Navegación principal">
        <RouterLink to="/listado">Pokémon</RouterLink>
        <RouterLink to="/pokemon">Mi equipo <span class="nav-dot"></span></RouterLink>
        <RouterLink to="/batalla">Combates</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
    <footer class="site-footer">Pokédex personal <span>·</span> Datos de Pokémon gracias a PokéAPI</footer>
  </div>
</template>

