// Seed script — agrega 10 personas a la vez
// Uso: node scripts/seed.js
// Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer .env manualmente
const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const SUPABASE_URL = getEnv('EXPO_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Agrega SUPABASE_SERVICE_ROLE_KEY al archivo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Datos de prueba
const NOMBRES = ['Carlos', 'María', 'Luis', 'Ana', 'Pedro', 'Laura', 'Juan', 'Sofía', 'Diego', 'Valentina',
  'Andrés', 'Camila', 'Felipe', 'Isabella', 'Mateo', 'Daniela', 'Sebastián', 'Gabriela', 'Nicolás', 'Paola'];
const APELLIDOS = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
const TIPOS = ['chicas', 'chicos', 'mixto_solteros', 'casados'];
const MODALIDADES = ['online', 'presencial'];
const GENEROS = ['masculino', 'femenino'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const STATUSES = ['en_proceso', 'integrado', 'desinteresado', 'error'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDias = () => DIAS.filter(() => Math.random() > 0.6).slice(0, randInt(1, 4));

function generarPersona() {
  const genero = rand(GENEROS);
  const nombre = rand(NOMBRES);
  return {
    nombre,
    apellido: rand(APELLIDOS),
    edad: randInt(18, 55),
    celular: `+57 3${randInt(10, 99)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
    email: `${nombre.toLowerCase()}.${randInt(1, 999)}@ejemplo.com`,
    genero,
    dias_disponibles: randDias().length ? randDias() : ['Sábado'],
    tipo_grupo: rand(TIPOS),
    modalidad: rand(MODALIDADES),
    status: rand(STATUSES),
  };
}

async function seed() {
  const batch = Array.from({ length: 10 }, generarPersona);

  console.log(`Insertando ${batch.length} personas...`);
  const { data, error } = await supabase.from('personas').insert(batch).select('id, nombre, apellido');

  if (error) {
    console.error('❌  Error:', error.message);
    process.exit(1);
  }

  console.log(`✅  Insertadas ${data.length} personas:`);
  data.forEach((p) => console.log(`   - ${p.nombre} ${p.apellido} (${p.id.slice(0, 8)}...)`));
}

seed();
