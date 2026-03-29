// ==========================================
// IMPORTAR CSV A SUPABASE - Procurador_394.csv
// ==========================================
// Uso: node importar-csv.js [ruta-al-csv]
// Default: ./Procurador_394.csv

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Configuración ──────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://jigyfagcxaifgdogaduf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3lmYWdjeGFpZmdkb2dhZHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ5NDU0NywiZXhwIjoyMDg3MDcwNTQ3fQ.TTL5nmP1F45UEAY7_g492CQYLISBuOvHpi0trOuB6N0';
const BATCH_SIZE = 50;
const CSV_PATH = process.argv[2] || path.join(__dirname, 'Procurador_394.csv');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parsea un número con coma decimal (ej: "1.234,56" → 1234.56).
 * Devuelve null si está vacío.
 */
function parseNumero(valor) {
  if (!valor || valor.trim() === '') return null;
  // Quitar puntos de miles, reemplazar coma decimal por punto
  const limpio = valor.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
}

/**
 * Parsea fecha en formato que traiga el CSV y la normaliza a YYYY-MM-DD.
 * Si está vacía devuelve null.
 */
function parseFecha(valor) {
  if (!valor || valor.trim() === '') return null;
  const s = valor.trim();

  // Ya viene YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  return null;
}

/**
 * Limpia string: trim y convierte vacío a null.
 */
function str(valor) {
  if (valor === undefined || valor === null) return null;
  const s = valor.trim();
  return s === '' ? null : s;
}

/**
 * Parsea el CSV respetando campos entre comillas que contienen el separador.
 */
function parsearCSV(contenido) {
  // Quitar BOM si existe
  const texto = contenido.replace(/^\uFEFF/, '');
  const lineas = texto.split(/\r?\n/);

  const encabezados = splitLinea(lineas[0]);
  const filas = [];

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    const celdas = splitLinea(linea);
    const obj = {};
    encabezados.forEach((col, idx) => {
      obj[col.trim()] = celdas[idx] !== undefined ? celdas[idx] : '';
    });
    filas.push(obj);
  }

  return filas;
}

/**
 * Divide una línea CSV por punto y coma respetando comillas dobles.
 */
function splitLinea(linea) {
  const resultado = [];
  let campo = '';
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (dentroComillas && linea[i + 1] === '"') {
        campo += '"';
        i++;
      } else {
        dentroComillas = !dentroComillas;
      }
    } else if (c === ';' && !dentroComillas) {
      resultado.push(campo);
      campo = '';
    } else {
      campo += c;
    }
  }
  resultado.push(campo);
  return resultado;
}

/**
 * Mapea una fila del CSV al objeto que espera Supabase.
 */
function mapearFila(fila) {
  return {
    jud_id:              str(fila['Jud_id']),
    expediente:          str(fila['Expediente']),
    tipo:                str(fila['Tipo']),
    orden:               str(fila['Orden']),
    anio:                str(fila['Año']),
    caratula:            str(fila['Caratula']),
    nominal:             parseNumero(fila['Nominal']),
    accesorios:          parseNumero(fila['Accesorios']),
    multa:               parseNumero(fila['Multa']),
    obj_id:              str(fila['Obj_id']),
    tipo_obj:            str(fila['Tipo_Obj']),
    identificador:       str(fila['Identificador']),
    titular:             str(fila['Titular']),
    cuit:                str(fila['CUIT']),
    telefono:            str(fila['Telefono']),
    mail:                str(fila['Mail']),
    regimen:             str(fila['Regimen']),
    anio_fab:            str(fila['Anio_Fab']),
    valor_rodado:        str(fila['Valor_Rodado']),
    causa:               str(fila['Causa']),
    fch_infrac:          parseFecha(fila['FchInfrac']),
    hora_infrac:         str(fila['Hora_Infrac']),
    infraccion:          str(fila['Infraccion']),
    vehiculo:            str(fila['Vehiculo']),
    domicilio_postal:    str(fila['Domicilio_Postal']),
    domicilio_inmueble:  str(fila['Domicilio_Inmueble']),
    barrio_inmueble:     str(fila['Barrio_Inmueble']),
    domicilio_juzgado:   str(fila['Domicilio_Juzgado']),
    obs_muni:            str(fila['Obs']),
    carpeta:             str(fila['Carpeta']),
    estado:              str(fila['Estado']) ?? 'X',
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // Verificar que el CSV existe
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ No se encontró el archivo: ${CSV_PATH}`);
    console.error('   Uso: node importar-csv.js [ruta-al-csv]');
    process.exit(1);
  }

  console.log(`📂 Leyendo: ${CSV_PATH}`);
  const contenido = fs.readFileSync(CSV_PATH, 'utf-8');
  const filas = parsearCSV(contenido);

  console.log(`📊 Registros encontrados: ${filas.length}`);

  if (filas.length === 0) {
    console.error('❌ El CSV no contiene datos.');
    process.exit(1);
  }

  // Verificar que haya jud_id en la primera fila
  const primeraFila = filas[0];
  if (!('Jud_id' in primeraFila)) {
    const cols = Object.keys(primeraFila).join(', ');
    console.error(`❌ No se encontró la columna "Jud_id". Columnas detectadas:\n   ${cols}`);
    process.exit(1);
  }

  // Conectar a Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('🔌 Conectando a Supabase...\n');

  // Limpiar tabla antes de importar
  console.log('🗑️  Limpiando tabla deudas...');
  const { error: deleteError } = await supabase
    .from('deudas')
    .delete()
    .neq('jud_id', '');  // condición siempre verdadera para borrar todo
  if (deleteError) {
    console.error('❌ Error al limpiar la tabla:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ Tabla limpiada.\n');

  // Deduplicar globalmente antes de lotear: merge (gana el primer valor no-null de cada campo)
  const todosLosRegistros = filas.map(mapearFila);
  const sinIdGlobal = todosLosRegistros.filter(r => !r.jud_id).length;
  if (sinIdGlobal > 0) {
    console.warn(`  ⚠️  ${sinIdGlobal} fila(s) sin jud_id en todo el CSV, se omiten.`);
  }

  const mapaGlobal = new Map();
  for (const r of todosLosRegistros) {
    if (!r.jud_id) continue;
    if (!mapaGlobal.has(r.jud_id)) {
      mapaGlobal.set(r.jud_id, { ...r });
    } else {
      const existente = mapaGlobal.get(r.jud_id);
      for (const [campo, valor] of Object.entries(r)) {
        if (existente[campo] === null && valor !== null) {
          existente[campo] = valor;
        }
      }
    }
  }
  const registrosUnicos = Array.from(mapaGlobal.values());
  const duplicadosGlobal = todosLosRegistros.length - sinIdGlobal - registrosUnicos.length;
  if (duplicadosGlobal > 0) {
    console.warn(`  ⚠️  ${duplicadosGlobal} fila(s) duplicada(s) mergeadas. Únicos a importar: ${registrosUnicos.length}\n`);
  } else {
    console.log(`  ✅ Sin duplicados. Registros a importar: ${registrosUnicos.length}\n`);
  }

  // Contadores
  let insertados = 0;
  let errores = 0;
  const detallesErrores = [];

  // Procesar en lotes
  const totalLotes = Math.ceil(registrosUnicos.length / BATCH_SIZE);

  for (let lote = 0; lote < totalLotes; lote++) {
    const inicio = lote * BATCH_SIZE;
    const fin = Math.min(inicio + BATCH_SIZE, registrosUnicos.length);
    const validos = registrosUnicos.slice(inicio, fin);

    if (validos.length === 0) continue;

    const { data, error } = await supabase
      .from('deudas')
      .upsert(validos, {
        onConflict: 'jud_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      errores += validos.length;
      const msg = `Lote ${lote + 1} (registros ${inicio + 1}–${fin}): ${error.message}`;
      detallesErrores.push(msg);
      console.error(`  ❌ ${msg}`);
    } else {
      // Supabase upsert devuelve todos los afectados; no distingue insert/update
      // Para dar feedback útil contamos ambos como "procesados"
      insertados += data ? data.length : validos.length;
    }

    // Progreso
    const pct = Math.round(((lote + 1) / totalLotes) * 100);
    const barra = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${barra}] ${pct}% — Lote ${lote + 1}/${totalLotes}`);
  }

  // Resumen final
  console.log('\n');
  console.log('══════════════════════════════════════');
  console.log('  RESULTADO DE LA IMPORTACIÓN');
  console.log('══════════════════════════════════════');
  console.log(`  ✅ Procesados (insert/update): ${insertados}`);
  console.log(`  ❌ Errores:                    ${errores}`);
  console.log(`  📋 Filas en CSV:               ${filas.length}`);
  console.log(`  🔑 jud_ids únicos importados:  ${registrosUnicos.length}`);

  if (detallesErrores.length > 0) {
    console.log('\n  Detalle de errores:');
    detallesErrores.forEach(e => console.log(`    • ${e}`));
  }

  console.log('══════════════════════════════════════');

  if (errores > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n❌ Error inesperado:', err.message);
  process.exit(1);
});
