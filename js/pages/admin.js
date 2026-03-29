// SISTEMA LC - ADMINISTRACIÓN

async function exportarExcel() {
  const btn = document.getElementById('btnExportar');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Exportando...'; }
  showInfo('Obteniendo datos...');
  try {
    let todas = []; let desde = 0; const batch = 1000; let hayMas = true;
    while (hayMas && desde < 50000) {
      const { data, error } = await supabaseClient.from('deudas').select('*').order('fecha_carga', { ascending: false }).range(desde, desde + batch - 1);
      if (error) throw error;
      if (data && data.length > 0) { todas = todas.concat(data); hayMas = data.length === batch; desde += batch; } else { hayMas = false; }
    }
    if (todas.length === 0) { showError('No hay datos para exportar'); return; }
    const datosExcel = todas.map(c => ({ 'Jud ID': c.jud_id||'', 'Expediente': c.expediente||'', 'Tipo': c.tipo||'', 'Carátula': c.caratula||'', 'Titular': c.titular||'', 'CUIT': c.cuit||'', 'Teléfono': c.telefono||'', 'Mail': c.mail||'', 'Nominal': c.nominal||0, 'Accesorios': c.accesorios||0, 'Multa': c.multa||0, 'Estado': c.estado||'', 'Obs. Municipal': c.obs_muni||'', 'Obs. Propia': c.obs_propia||'', 'Expte. Judicial': c.expte_judicial||'', 'Fecha Carga': c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : '' }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Causas');
    XLSX.writeFile(wb, `SistemaLC_Causas_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Exportadas ${todas.length} causas`);
  } catch (err) { console.error(err); showError('Error al exportar'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '📥 Exportar Todo'; } }
}

async function exportarPorEstado(estado) {
  const btn = document.getElementById(`btnExportar${estado}`);
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳'; }
  try {
    const { data, error } = await supabaseClient.from('deudas').select('*').eq('estado', estado).order('fecha_carga', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) { showError(`No hay causas en estado ${NOMBRES_ESTADO[estado]}`); return; }
    const datosExcel = data.map(c => ({ 'Jud ID': c.jud_id||'', 'Expediente': c.expediente||'', 'Carátula': c.caratula||'', 'Titular': c.titular||'', 'CUIT': c.cuit||'', 'Teléfono': c.telefono||'', 'Mail': c.mail||'', 'Nominal': c.nominal||0, 'Accesorios': c.accesorios||0, 'Multa': c.multa||0, 'Obs. Municipal': c.obs_muni||'', 'Obs. Propia': c.obs_propia||'', 'Expte. Judicial': c.expte_judicial||'', 'Fecha Carga': c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : '' }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, NOMBRES_ESTADO[estado]);
    XLSX.writeFile(wb, `SistemaLC_${NOMBRES_ESTADO[estado]}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Exportadas ${data.length} causas de ${NOMBRES_ESTADO[estado]}`);
  } catch (err) { console.error(err); showError('Error al exportar'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = NOMBRES_ESTADO[estado]; } }
}

const CIDI_CONFIG = {
  AUT: { ref1: 'TITULAR', ref3: 'EXP:AUTO/ORDEN/AÑO', ref5: 'ID AUTOMOTOR:', nombre: 'Automotor' },
  INM: { ref1: 'TITULAR DEL INMUEBLE', ref3: 'EXP:INMUEBLE/ORDEN/AÑO', ref5: 'ID INMUEBLE:', nombre: 'Inmueble' },
  CI:  { ref1: 'TITULAR', ref3: 'EXP: CI/ORDEN/AÑO', ref5: 'ID COMERCIO E INDUSTRIA', nombre: 'Comercio_e_Industria' },
  TA:  { ref1: 'TITULAR', ref3: 'EXP:TA/ORDEN/AÑO', ref5: 'ID TASA:', nombre: 'Tasa_Administrativa' },
  CEM: { ref1: 'TITULAR', ref3: 'EXP: CEM/ORDEN/AÑO', ref5: 'ID CEMENTERIO:', nombre: 'Cementerio' },
  TF:  { ref1: 'TITULAR', ref3: 'EXP:FALTA/ORDEN/AÑO', ref5: 'ID:', nombre: 'Tribunal_de_Faltas' }
};

const CIDI_FILAS_TESTIGO = {
  AUT: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR', 20363564748, 'EXP:AUTO/ORDEN/AÑO', 'AUT/100091/2024', 'ID AUTOMOTOR:', 'EYD121', null, null],
    [20319471252, null, 'Dario',  null, null, 'TITULAR', 20319471252, 'EXP:AUTO/ORDEN/AÑO', 'AUT/100091/2025', 'ID AUTOMOTOR:', 'EYD122', null, null]
  ],
  INM: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR DEL INMUEBLE', 20363564748, 'EXP:INMUEBLE/ORDEN/AÑO', 'INM/167253/2022', 'ID INMUEBLE:', 631001094000000, 12489672.42, null],
    [20319471252, null, 'Dario',  null, null, 'TITULAR DEL INMUEBLE', 20319471252, 'EXP:INMUEBLE/ORDEN/AÑO', 'INM/167253/2023', 'ID INMUEBLE:', 631001094000000, 12489672.42, null]
  ],
  CI: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR', 20363564748, 'EXP: CI/ORDEN/AÑO', 'CI/ 2511 2020', 'ID COMERCIO E INDUSTRIA', 27048557428, 12489672.42, null],
    [20319471252, null, 'Dario',  null, null, 'TITULAR', 20319471252, 'EXP: CI/ORDEN/AÑO', 'CI/ 2511 2021', 'ID COMERCIO E INDUSTRIA', 20319471252, 12489672.42, null]
  ],
  TA: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR', 20363564748, 'EXP:TA/ORDEN/AÑO', 'TA/2222/2025', 'ID TASA:', 'xxx', 473696.12, null],
    [20319471252, null, 'Dario',  null, null, 'TITULAR', 20319471252, 'EXP:TA/ORDEN/AÑO', 'TA/2222/2026', 'ID TASA:', 'xxx', 473696.12, null]
  ],
  CEM: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR', 20363564748, 'EXP: CEM/ORDEN/AÑO', 'CEM/ 108391 2022', 'ID CEMENTERIO:', '18000002042671', 12489672.42, null],
    [20319471252, null, 'Dario',  null, null, 'TITULAR', 20319471252, 'EXP: CEM/ORDEN/AÑO', 'CEM/ 108391 2023', 'ID CEMENTERIO:', '18000002042671', 12489672.42, null]
  ],
  TF: [
    [20363564748, null, 'Adrian', null, null, 'TITULAR', 473696.12, 'EXP:FALTA/ORDEN/AÑO', 'TF/5051/2024', 'ID:', '780EEN', 'INFRACCION:', 'NO ABONAR ESTACIONAMIENTO TARIFADO'],
    [20319471252, null, 'Dario',  null, null, 'TITULAR', 473696.12, 'EXP:FALTA/ORDEN/AÑO', 'TF/5052/2025', 'ID:', '780EEN', 'INFRACCION:', 'NO ABONAR ESTACIONAMIENTO TARIFADO']
  ]
};

const CIDI_CUITS_EXCLUIDOS = ['30999074843', '30708187123'];

async function exportarCIDI(tipo, instancia) {
  const config = CIDI_CONFIG[tipo];
  if (!config) return;
  const instanciaNombre = instancia === 'X' ? 'Extrajudicial' : 'Judicial';
  showInfo(`Generando archivo CIDI ${config.nombre} - ${instanciaNombre}...`);
  try {
    let query = supabaseClient.from('deudas').select('*').eq('tipo', tipo).order('expediente', { ascending: true });
    if (instancia === 'X') { query = query.eq('estado', 'X'); } else { query = query.in('estado', ['D', 'S', 'E']); }
    let todas = []; let desde = 0; const batch = 1000; let hayMas = true;
    while (hayMas) {
      const { data, error } = await query.range(desde, desde + batch - 1);
      if (error) throw error;
      if (data && data.length > 0) { todas = todas.concat(data); hayMas = data.length === batch; desde += batch; } else { hayMas = false; }
    }
    if (todas.length === 0) { showError(`No hay causas ${instanciaNombre} de tipo ${config.nombre}`); return; }
    const headers = ['cuil','apellido','nombre','correoelectronico','celular','referencia1','referencia2','referencia3','referencia4','referencia5','referencia6','referencia7','referencia8'];
    const filas = todas.filter(c => {
      if (!c.cuit) return false;
      const cuit = String(c.cuit).trim();
      if (CIDI_CUITS_EXCLUIDOS.includes(cuit)) return false;
      const nombre = (c.titular || '').toLowerCase();
      if (nombre.includes('coop')) return false;
      if (nombre.includes('ipv') || (nombre.includes('inst') && nombre.includes('vivienda'))) return false;
      if (nombre.includes('municipalidad') || nombre.includes('provincia de c')) return false;
      return true;
    }).map(c => {
      let ref6 = c.obs_muni || '';
      if (tipo === 'AUT') ref6 = ref6.replace(/^81-/i, '');
      if (tipo === 'TF') { return [c.cuit||'', '', c.titular||'', '', '', config.ref1, '', config.ref3, c.expediente||'', config.ref5, ref6, 'INFRACCION:', c.obs_propia||'']; }
      else { return [c.cuit||'', '', c.titular||'', '', '', config.ref1, c.cuit||'', config.ref3, c.expediente||'', config.ref5, ref6, '', '']; }
    });
    const wsData = [headers, ...CIDI_FILAS_TESTIGO[tipo], ...filas];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, `CIDI_${config.nombre}_${instanciaNombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Exportadas ${todas.length} causas para CIDI`);
  } catch (err) { console.error(err); showError('Error al generar archivo CIDI'); }
}

async function procesarArchivoPagos(input) {
  const file = input.files[0];
  if (!file) return;
  const container = document.getElementById('resultadoPagos');
  container.innerHTML = '<div class="loading"></div> Procesando archivo...';
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (filas.length === 0) { container.innerHTML = '<p style="color:red">Archivo vacío o formato incorrecto.</p>'; return; }
    const pagosMap = {};
    for (const fila of filas) {
      const judId = String(fila['Id Juicio'] || '').trim();
      if (!judId) continue;
      const fecha = fila['Fecha'] ? new Date(fila['Fecha']).toISOString().split('T')[0] : null;
      const monto = (parseFloat(fila['H Extrajudicial']||0) + parseFloat(fila['H Demanda']||0) + parseFloat(fila['H Sentencia']||0) + parseFloat(fila['Gasto jud']||0));
      if (pagosMap[judId]) { pagosMap[judId].monto += monto; if (fecha > pagosMap[judId].fecha) pagosMap[judId].fecha = fecha; }
      else { pagosMap[judId] = { judId, fecha, monto, expediente: fila['Nro Jucio']||'' }; }
    }
    const pagos = Object.values(pagosMap);
    if (pagos.length === 0) { container.innerHTML = '<p style="color:red">No se encontraron registros válidos.</p>'; return; }
    container.innerHTML = `<p>Encontrados <strong>${pagos.length}</strong> juicios. Actualizando...</p>`;
    let actualizados = 0; const noEncontrados = [];
    for (const pago of pagos) {
      const { data, error } = await supabaseClient.from('deudas').select('id, expediente, titular, estado').eq('jud_id', pago.judId);
      if (error) throw error;
      if (!data || data.length === 0) { noEncontrados.push(pago); continue; }
      for (const causa of data) {
        const esConvenio = causa.estado === 'C';
        const { error: errUpdate } = await supabaseClient.from('deudas').update({ ...(esConvenio ? {} : { estado: 'P' }), fecha_pago: pago.fecha, monto_pagado: pago.monto, fecha_actualizacion: new Date().toISOString() }).eq('id', causa.id);
        if (errUpdate) throw errUpdate;
        actualizados++;
      }
    }
    let html = `<div class="exito">✅ Actualizados: <strong>${actualizados}</strong> registros</div>`;
    if (noEncontrados.length > 0) { html += `<div class="warning-box">⚠️ No encontrados: ${noEncontrados.length}</div>`; }
    container.innerHTML = html;
    input.value = '';
    cargarEstadisticasDetalladas();
  } catch (err) { console.error(err); container.innerHTML = '<p style="color:red">Error al procesar el archivo.</p>'; input.value = ''; }
}


// ==========================================
// EXPORTAR CIDI DESDE DDT
// ==========================================

let ddtDatos = [];      // filas del DDT
let ddtColores = {};    // jud_id -> tiene color?

async function cargarDDT(input) {
  const file = input.files[0];
  if (!file) return;

  document.getElementById('ddtNombre').textContent = file.name;
  ddtDatos = [];
  ddtColores = {};

  try {
    const buffer = await file.arrayBuffer();

    // Leer el xlsx como zip para acceder al XML y detectar colores
    const JSZip = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').catch(() => null);

    // Leer datos con SheetJS
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const datos = XLSX.utils.sheet_to_json(ws, { defval: null });
    ddtDatos = datos;

    // Detectar colores leyendo el XML del xlsx directamente
    try {
      const uint8 = new Uint8Array(buffer);
      const blob = new Blob([uint8], { type: 'application/zip' });

      // Leer el sharedStrings y styles del xlsx (es un zip)
      const zipBuffer = await blob.arrayBuffer();
      const view = new DataView(zipBuffer);

      // Buscar el archivo xl/styles.xml dentro del zip
      // Usamos una regex sobre el texto del archivo para encontrar fills con color
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(uint8);

      // Buscar patrones de color en el XML del xlsx
      // Los xlsx tienen colores en xl/styles.xml como <fgColor rgb="FFFF9900"/>
      const colorRegex = /(?:fgColor|bgColor|color)[^>]*rgb="([0-9A-Fa-f]{6,8})"/g;
      const coloresEncontrados = new Set();
      let match;
      while ((match = colorRegex.exec(text)) !== null) {
        const rgb = match[1].toUpperCase();
        const blancos = ['00000000', 'FF000000', 'FFFFFFFF', 'FFFFFF', '000000'];
        if (!blancos.includes(rgb) && !blancos.includes('FF' + rgb)) {
          coloresEncontrados.add(rgb);
        }
      }

      // Si hay colores en el archivo, leer fila por fila con SheetJS + XML
      // Leer el sheet1.xml para mapear filas con estilos
      const sheetXmlStart = text.indexOf('<worksheet');
      const sheetXmlEnd = text.indexOf('</worksheet>');
      if (sheetXmlStart > -1 && sheetXmlEnd > -1) {
        const sheetXml = text.substring(sheetXmlStart, sheetXmlEnd);
        // Buscar filas con atributo s= (estilo) en las celdas
        const rowRegex = /<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs;
        const cellStyleRegex = /<c[^>]*\sr="([A-Z]+\d+)"[^>]*s="(\d+)"/g;

        // Leer estilos: obtener qué índices de estilo tienen color
        const stylesStart = text.indexOf('<fills>');
        const stylesEnd = text.indexOf('</fills>');
        const stylesWithColor = new Set();

        if (stylesStart > -1) {
          const fillsXml = text.substring(stylesStart, stylesEnd);
          const fillRegex = /<fill>(.*?)<\/fill>/gs;
          let fillIdx = 0;
          let fillMatch;
          while ((fillMatch = fillRegex.exec(fillsXml)) !== null) {
            const fillContent = fillMatch[1];
            const colorMatch = /(?:fgColor|bgColor)\s+rgb="([0-9A-Fa-f]{6,8})"/.exec(fillContent);
            if (colorMatch) {
              const rgb = colorMatch[1].toUpperCase();
              const blancos = ['00000000', 'FF000000', 'FFFFFFFF'];
              if (!blancos.includes(rgb)) stylesWithColor.add(fillIdx);
            }
            fillIdx++;
          }
        }

        // Mapear estilo de celda a número de fila del sheet
        let rowMatch;
        while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
          const rowNum = parseInt(rowMatch[1]);
          if (rowNum <= 1) continue; // saltar header
          const rowContent = rowMatch[2];
          let cellMatch;
          cellStyleRegex.lastIndex = 0;
          while ((cellMatch = cellStyleRegex.exec(rowContent)) !== null) {
            const styleIdx = parseInt(cellMatch[2]);
            if (stylesWithColor.has(styleIdx)) {
              // Fila rowNum-2 en ddtDatos (0-indexed, sin header)
              const filaObj = ddtDatos[rowNum - 2];
              if (filaObj) {
                const judId = filaObj['Jud'] ? String(filaObj['Jud']).trim() : null;
                if (judId) ddtColores[judId] = true;
              }
              break;
            }
          }
        }
      }
    } catch (colorErr) {
      console.warn('No se pudieron leer colores:', colorErr);
    }

    // Mapear judId para todas las filas
    for (const fila of ddtDatos) {
      const judId = fila['Jud'] ? String(fila['Jud']).trim() : null;
      if (judId && ddtColores[judId] === undefined) ddtColores[judId] = false;
    }

    document.getElementById('ddtFilas').textContent = ddtDatos.length;
    document.getElementById('ddtListo').style.display = 'block';

    const nColoreadas = Object.values(ddtColores).filter(v => v).length;
    if (nColoreadas > 0) {
      document.getElementById('ddtFilas').textContent += ` (${nColoreadas} con color → se excluirán)`;
    }

  } catch (err) {
    console.error('Error al cargar DDT:', err);
    showError('Error al leer el archivo DDT');
  }

  input.value = '';
}

async function exportarCIDI_DDT(tipo, instancia) {
  if (ddtDatos.length === 0) { showError('Primero cargá el DDT'); return; }

  const config = CIDI_CONFIG[tipo];
  const instanciaNombre = instancia === 'X' ? 'Extrajudicial' : 'Judicial';
  const container = document.getElementById('resultadoCIDI_DDT');
  container.innerHTML = '<div class="loading"></div> Generando...';

  // Estados válidos según instancia
  const estadosJudicial = ['D', 'S', 'E'];

  // CUITs y términos excluidos
  const cuitsExcluidos = ['30999074843', '30708187123'];

  const headers = ['cuil','apellido','nombre','correoelectronico','celular',
                   'referencia1','referencia2','referencia3','referencia4',
                   'referencia5','referencia6','referencia7','referencia8'];

  const filas = [];
  const excluidas = [];

  for (const fila of ddtDatos) {
    const judId = fila['Jud'] ? String(fila['Jud']).trim() : null;
    const causaTipo = (fila['Causa'] || '').trim().toUpperCase();
    const estado = (fila['Estadoletra'] || '').trim().toUpperCase();
    const nombre = (fila['Contribuyente'] || '').toLowerCase();

    // Filtro por tipo e instancia
    if (causaTipo !== tipo) continue;
    if (instancia === 'X' && estado !== 'X') continue;
    if (instancia === 'J' && !estadosJudicial.includes(estado)) continue;

    // Excluir coloreadas
    if (judId && ddtColores[judId]) {
      excluidas.push({ judId, contribuyente: fila['Contribuyente'], motivo: 'Color' });
      continue;
    }

    // Excluir por nombre
    if (nombre.includes('coop')) { excluidas.push({ judId, contribuyente: fila['Contribuyente'], motivo: 'Cooperativa' }); continue; }
    if (nombre.includes('ipv') || (nombre.includes('inst') && nombre.includes('vivienda'))) { excluidas.push({ judId, contribuyente: fila['Contribuyente'], motivo: 'IPV' }); continue; }
    if (nombre.includes('municipalidad') || nombre.includes('provincia de c')) { excluidas.push({ judId, contribuyente: fila['Contribuyente'], motivo: 'Muni/Pcia' }); continue; }

    // Obtener CUITs (puede haber varios separados por " / ")
    const cuitRaw = fila['CUIT/CUIL'] ? String(fila['CUIT/CUIL']).trim() : '';
    const cuits = cuitRaw.split('/').map(c => c.trim()).filter(c => c && !cuitsExcluidos.includes(c));

    if (cuits.length === 0) continue;

    const expediente = fila['CausaOdenAño'] || `${fila['Causa']}/${fila['Orden']}/${fila['Año']}` || '';
    const ref6 = tipo === 'AUT' ? (fila['Dominio/Objeto'] || '').replace(/^81-/i, '') : (fila['Dominio/Objeto'] || '');

    // Una fila por CUIT
    for (const cuil of cuits) {
      if (tipo === 'TF') {
        filas.push([cuil, '', fila['Contribuyente'] || '', '', '',
          config.ref1, '', config.ref3, expediente,
          config.ref5, ref6, 'INFRACCION:', fila['Infracción'] || '']);
      } else {
        filas.push([cuil, '', fila['Contribuyente'] || '', '', '',
          config.ref1, cuil, config.ref3, expediente,
          config.ref5, ref6, '', '']);
      }
    }
  }

  if (filas.length === 0) {
    container.innerHTML = `<div class="error">No hay causas ${instanciaNombre} de tipo ${config.nombre} en el DDT.</div>`;
    return;
  }

  // Generar Excel
  const wsData = [headers, ...CIDI_FILAS_TESTIGO[tipo], ...filas];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wbOut = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbOut, ws, 'Hoja1');
  XLSX.writeFile(wbOut, `CIDI_DDT_${config.nombre}_${instanciaNombre}_${new Date().toISOString().split('T')[0]}.xlsx`);

  // Mostrar resultado
  let html = `<div class="exito">✅ Exportadas <strong>${filas.length}</strong> filas para CIDI - ${config.nombre} ${instanciaNombre}</div>`;
  if (excluidas.length > 0) {
    html += `<div class="warning-box" style="margin-top:10px;">
      <strong>⚠️ ${excluidas.length} causa(s) excluidas:</strong>
      <table style="width:100%;margin-top:8px;font-size:12px;border-collapse:collapse;">
        <tr style="background:#f8f9fa;"><th style="padding:5px;text-align:left;">Jud ID</th><th style="padding:5px;text-align:left;">Contribuyente</th><th style="padding:5px;text-align:left;">Motivo</th></tr>
        ${excluidas.map(e => `<tr><td style="padding:5px;border-bottom:1px solid #eee;">${e.judId||'-'}</td><td style="padding:5px;border-bottom:1px solid #eee;">${e.contribuyente||'-'}</td><td style="padding:5px;border-bottom:1px solid #eee;">${e.motivo}</td></tr>`).join('')}
      </table>
    </div>`;
  }
  container.innerHTML = html;
}

async function limpiarDatosPrueba() {
  if (!confirm('¿Eliminar todas las causas de prueba (estado X sin nominal)?')) return;
  try {
    const { error } = await supabaseClient.from('deudas').delete().eq('estado', 'X').is('nominal', null);
    if (error) throw error;
    showSuccess('Datos de prueba eliminados');
    cargarEstadisticasDetalladas();
  } catch (err) { console.error(err); showError('Error al eliminar datos de prueba'); }
}

async function cargarEstadisticasDetalladas() {
  const container = document.getElementById('estadisticas');
  if (!container) return;
  container.innerHTML = '<div class="loading"></div>';
  try {
    const { data: pagadas, error } = await supabaseClient.from('deudas').select('nominal, accesorios, multa, fecha_actualizacion').eq('estado', 'P');
    if (error) throw error;
    const total = pagadas ? pagadas.length : 0;
    const montoTotal = pagadas ? pagadas.reduce((sum, c) => sum + (c.nominal||0) + (c.accesorios||0) + (c.multa||0), 0) : 0;
    const hoy = new Date();
    const esteMes = pagadas ? pagadas.filter(c => { if (!c.fecha_actualizacion) return false; const f = new Date(c.fecha_actualizacion); return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear(); }).length : 0;
    container.innerHTML = `
      <div class="stats" style="grid-template-columns: repeat(3, 1fr); margin: 12px 0 0;">
        <div class="stat-box" style="background:#f8f8f8;border-left:4px solid #2E7D52;">
          <div class="stat-number" style="color:#2E7D52;font-size:32px;">${total}</div>
          <div class="stat-label" style="color:#555;">Total pagadas</div>
        </div>
        <div class="stat-box" style="background:#f8f8f8;border-left:4px solid #2E7D52;">
          <div class="stat-number" style="color:#2E7D52;font-size:32px;">${esteMes}</div>
          <div class="stat-label" style="color:#555;">Pagadas este mes</div>
        </div>
        <div class="stat-box" style="background:#f8f8f8;border-left:4px solid #2E7D52;">
          <div class="stat-number" style="color:#2E7D52;font-size:22px;">${formatCurrency(montoTotal)}</div>
          <div class="stat-label" style="color:#555;">Monto total recuperado</div>
        </div>
      </div>
    `;
  } catch (err) { console.error(err); container.innerHTML = '<div class="error">Error al cargar estadísticas</div>'; }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarEstadisticasDetalladas();
});
