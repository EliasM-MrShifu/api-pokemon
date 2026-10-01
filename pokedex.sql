CREATE DATABASE IF NOT EXISTS pokedex
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pokedex;

CREATE TABLE IF NOT EXISTS pokemones (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipo_pokemon (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  UNIQUE KEY uq_equipo_pokemon (equipo_id, pokemon_id),
  CONSTRAINT fk_equipo FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tipos_pokemon (
  id VARCHAR(20) NOT NULL PRIMARY KEY,
  nombre_es VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habilidades (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  tipo_id VARCHAR(20) NOT NULL,
  poder INT NOT NULL,
  precision_pct INT NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  CONSTRAINT fk_habilidad_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_pokemon(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pokemon_tipos (
  pokemon_id INT NOT NULL,
  tipo_id VARCHAR(20) NOT NULL,
  slot TINYINT NOT NULL,
  PRIMARY KEY (pokemon_id, tipo_id),
  UNIQUE KEY uq_pokemon_tipo_slot (pokemon_id, slot),
  CONSTRAINT fk_pokemon_tipo_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE,
  CONSTRAINT fk_pokemon_tipo_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_pokemon(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pokemon_habilidad (
  pokemon_id INT NOT NULL PRIMARY KEY,
  habilidad_id INT NOT NULL,
  CONSTRAINT fk_pokemon_habilidad_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE,
  CONSTRAINT fk_pokemon_habilidad_habilidad FOREIGN KEY (habilidad_id) REFERENCES habilidades(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pokemon_estadisticas (
  pokemon_id INT NOT NULL PRIMARY KEY,
  hp INT NOT NULL,
  ataque INT NOT NULL,
  defensa INT NOT NULL,
  velocidad INT NOT NULL,
  CONSTRAINT fk_estadisticas_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS efectividad_tipos (
  tipo_atacante VARCHAR(20) NOT NULL,
  tipo_defensor VARCHAR(20) NOT NULL,
  multiplicador DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (tipo_atacante, tipo_defensor),
  CONSTRAINT fk_efectividad_atacante FOREIGN KEY (tipo_atacante) REFERENCES tipos_pokemon(id),
  CONSTRAINT fk_efectividad_defensor FOREIGN KEY (tipo_defensor) REFERENCES tipos_pokemon(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tipos_pokemon (id, nombre_es) VALUES
  ('steel', 'Acero'), ('water', 'Agua'), ('bug', 'Bicho'), ('dragon', 'Dragón'),
  ('electric', 'Eléctrico'), ('ghost', 'Fantasma'), ('fire', 'Fuego'), ('fairy', 'Hada'),
  ('ice', 'Hielo'), ('fighting', 'Lucha'), ('normal', 'Normal'), ('grass', 'Planta'),
  ('psychic', 'Psíquico'), ('rock', 'Roca'), ('dark', 'Siniestro'), ('ground', 'Tierra'),
  ('poison', 'Veneno'), ('flying', 'Volador')
ON DUPLICATE KEY UPDATE nombre_es = VALUES(nombre_es);

INSERT INTO habilidades (nombre, tipo_id, poder, precision_pct, descripcion) VALUES
  ('Garra Metal', 'steel', 50, 95, 'Un zarpazo metálico preciso.'),
  ('Rayo Burbuja', 'water', 60, 95, 'Una ráfaga de burbujas a presión.'),
  ('Tijera X', 'bug', 65, 90, 'Corta al rival con pinzas cruzadas.'),
  ('Garra Dragón', 'dragon', 70, 90, 'Un golpe cargado de energía dracónica.'),
  ('Chispa', 'electric', 60, 95, 'Una descarga eléctrica veloz.'),
  ('Bola Sombra', 'ghost', 65, 90, 'Una esfera de energía fantasmal.'),
  ('Lanzallamas', 'fire', 70, 90, 'Una llamarada intensa.'),
  ('Brillo Mágico', 'fairy', 60, 100, 'Una ráfaga de luz feérica.'),
  ('Rayo Hielo', 'ice', 65, 90, 'Un haz gélido que congela el aire.'),
  ('Golpe Karate', 'fighting', 60, 95, 'Un ataque marcial directo.'),
  ('Golpe Cuerpo', 'normal', 55, 100, 'Un potente impacto físico.'),
  ('Energibola', 'grass', 65, 90, 'Una esfera de energía vegetal.'),
  ('Psíquico', 'psychic', 65, 90, 'Un potente ataque mental.'),
  ('Avalancha', 'rock', 60, 90, 'Una lluvia de rocas golpea al rival.'),
  ('Triturar', 'dark', 65, 90, 'Un mordisco cargado de energía oscura.'),
  ('Terremoto', 'ground', 75, 90, 'Sacude el terreno bajo el rival.'),
  ('Bomba Lodo', 'poison', 60, 90, 'Lanza un proyectil de lodo tóxico.'),
  ('Tajo Aéreo', 'flying', 60, 95, 'Un corte de aire a gran velocidad.')
ON DUPLICATE KEY UPDATE tipo_id = VALUES(tipo_id), poder = VALUES(poder), precision_pct = VALUES(precision_pct), descripcion = VALUES(descripcion);
