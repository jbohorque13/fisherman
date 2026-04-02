-- Tabla de grupos (debe crearse primero)
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Tabla de contactos pendientes de integración
create table pending_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'assigned', 'exception')),
  group_id uuid references groups(id),
  created_at timestamptz default now()
);

-- Tabla de excepciones
create table exceptions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references pending_contacts(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now()
);

-- RLS
alter table pending_contacts enable row level security;
alter table groups enable row level security;
alter table exceptions enable row level security;

create policy "integradores leen contactos"
  on pending_contacts for all using (auth.role() = 'authenticated');

create policy "integradores leen grupos"
  on groups for select using (auth.role() = 'authenticated');

create policy "integradores gestionan excepciones"
  on exceptions for all using (auth.role() = 'authenticated');

-- Datos de prueba
insert into groups (name) values
  ('Grupo Jóvenes Lunes'),
  ('Grupo Mujeres Miércoles'),
  ('Grupo Mixto Viernes'),
  ('Grupo Casados Sábado');

insert into pending_contacts (name, phone) values
  ('María García', '573001234567'),
  ('Carlos López', '573009876543'),
  ('Ana Martínez', '573001112233'),
  ('Pedro Rodríguez', '573004445566');
