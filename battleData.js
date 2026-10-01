export const TYPES = [
  { id: 'steel', es: 'Acero' },
  { id: 'water', es: 'Agua' },
  { id: 'bug', es: 'Bicho' },
  { id: 'dragon', es: 'Dragón' },
  { id: 'electric', es: 'Eléctrico' },
  { id: 'ghost', es: 'Fantasma' },
  { id: 'fire', es: 'Fuego' },
  { id: 'fairy', es: 'Hada' },
  { id: 'ice', es: 'Hielo' },
  { id: 'fighting', es: 'Lucha' },
  { id: 'normal', es: 'Normal' },
  { id: 'grass', es: 'Planta' },
  { id: 'psychic', es: 'Psíquico' },
  { id: 'rock', es: 'Roca' },
  { id: 'dark', es: 'Siniestro' },
  { id: 'ground', es: 'Tierra' },
  { id: 'poison', es: 'Veneno' },
  { id: 'flying', es: 'Volador' }
]

export const MOVES = [
  { name: 'Garra Metal', type: 'steel', power: 50, accuracy: 95, description: 'Un zarpazo metálico preciso.' },
  { name: 'Rayo Burbuja', type: 'water', power: 60, accuracy: 95, description: 'Una ráfaga de burbujas a presión.' },
  { name: 'Tijera X', type: 'bug', power: 65, accuracy: 90, description: 'Corta al rival con pinzas cruzadas.' },
  { name: 'Garra Dragón', type: 'dragon', power: 70, accuracy: 90, description: 'Un golpe cargado de energía dracónica.' },
  { name: 'Chispa', type: 'electric', power: 60, accuracy: 95, description: 'Una descarga eléctrica veloz.' },
  { name: 'Bola Sombra', type: 'ghost', power: 65, accuracy: 90, description: 'Una esfera de energía fantasmal.' },
  { name: 'Lanzallamas', type: 'fire', power: 70, accuracy: 90, description: 'Una llamarada intensa.' },
  { name: 'Brillo Mágico', type: 'fairy', power: 60, accuracy: 100, description: 'Una ráfaga de luz feérica.' },
  { name: 'Rayo Hielo', type: 'ice', power: 65, accuracy: 90, description: 'Un haz gélido que congela el aire.' },
  { name: 'Golpe Karate', type: 'fighting', power: 60, accuracy: 95, description: 'Un ataque marcial directo.' },
  { name: 'Golpe Cuerpo', type: 'normal', power: 55, accuracy: 100, description: 'Un potente impacto físico.' },
  { name: 'Energibola', type: 'grass', power: 65, accuracy: 90, description: 'Una esfera de energía vegetal.' },
  { name: 'Psíquico', type: 'psychic', power: 65, accuracy: 90, description: 'Un potente ataque mental.' },
  { name: 'Avalancha', type: 'rock', power: 60, accuracy: 90, description: 'Una lluvia de rocas golpea al rival.' },
  { name: 'Triturar', type: 'dark', power: 65, accuracy: 90, description: 'Un mordisco cargado de energía oscura.' },
  { name: 'Terremoto', type: 'ground', power: 75, accuracy: 90, description: 'Sacude el terreno bajo el rival.' },
  { name: 'Bomba Lodo', type: 'poison', power: 60, accuracy: 90, description: 'Lanza un proyectil de lodo tóxico.' },
  { name: 'Tajo Aéreo', type: 'flying', power: 60, accuracy: 95, description: 'Un corte de aire a gran velocidad.' }
]

export const TYPE_NAME_ES = new Map(TYPES.map(({ id, es }) => [id, es]))