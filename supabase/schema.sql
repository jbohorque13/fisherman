-- ============================================================
-- Fisherman - Schema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Tipos enumerados
create type tipo_grupo as enum ('chicas', 'chicos', 'mixto_solteros', 'mixto_casados');
create type modalidad   as enum ('online', 'presencial');

-- ============================================================
-- Tabla: profiles
-- Un perfil por usuario (creado al completar el formulario)
-- ============================================================
create table profiles (
  id               uuid references auth.users on delete cascade primary key,
  nombre           text        not null,
  apellido         text        not null,
  edad             int         not null,
  celular          text        not null,
  dias_disponibles text[]      not null default '{}',
  tipo_grupo       tipo_grupo  not null,
  modalidad        modalidad   not null,
  created_at       timestamptz default now()
);

-- ============================================================
-- Tabla: grupos
-- Grupos disponibles (cargados por admin / seed)
-- ============================================================
create table grupos (
  id          uuid        default gen_random_uuid() primary key,
  nombre      text        not null,
  tipo_grupo  tipo_grupo  not null,
  modalidad   modalidad   not null,
  edad_min    int         not null,
  edad_max    int         not null,
  capacidad   int         not null default 10,
  descripcion text,
  created_at  timestamptz default now()
);

-- ============================================================
-- Tabla: asignaciones
-- Un usuario pertenece a un solo grupo
-- ============================================================
create table asignaciones (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users on delete cascade not null unique,
  grupo_id   uuid        references grupos on delete cascade not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles    enable row level security;
alter table grupos      enable row level security;
alter table asignaciones enable row level security;

-- Profiles: solo el propio usuario
create policy "Ver propio perfil"     on profiles for select using (auth.uid() = id);
create policy "Crear propio perfil"   on profiles for insert with check (auth.uid() = id);
create policy "Actualizar propio perfil" on profiles for update using (auth.uid() = id);

-- Grupos: cualquier usuario autenticado puede ver
create policy "Ver grupos"            on grupos for select using (auth.role() = 'authenticated');

-- Asignaciones: solo el propio usuario
create policy "Ver propia asignacion"   on asignaciones for select using (auth.uid() = user_id);
create policy "Crear propia asignacion" on asignaciones for insert with check (auth.uid() = user_id);

-- ============================================================
-- Seed: grupos de ejemplo
-- ============================================================
insert into grupos (nombre, tipo_grupo, modalidad, edad_min, edad_max, descripcion) values
  ('Grupo Alpha',   'chicos',         'presencial', 18, 30, 'Grupo de chicos jóvenes presencial'),
  ('Grupo Beta',    'chicas',         'online',     25, 40, 'Grupo de chicas online'),
  ('Grupo Gamma',   'mixto_solteros', 'presencial', 20, 35, 'Mixto solteros presencial'),
  ('Grupo Delta',   'mixto_casados',  'online',     30, 50, 'Mixto casados online'),
  ('Grupo Epsilon', 'chicos',         'online',     35, 55, 'Chicos maduros online'),
  ('Grupo Zeta',    'chicas',         'presencial', 18, 28, 'Chicas jóvenes presencial'),
  ('Grupo Eta',     'mixto_solteros', 'online',     18, 30, 'Mixto solteros jóvenes online'),
  ('Grupo Theta',   'mixto_casados',  'presencial', 25, 45, 'Mixto casados presencial');
