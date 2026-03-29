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

const CIDI_FILAS_TESTIGO = [
  [20363564748, null, 'Adrian', null, null, 'TITULAR', 20363564748, 'EXP:AUTO/ORDEN/AÑO', 'AUT/100091/2024', 'ID AUTOMOTOR:', 'EYD121', null, null],
  [20319471252, null, 'Dario', null, null, 'TITULAR', 20319471252, 'EXP:AUTO/ORDEN/AÑO', 'AUT/100091/2025', 'ID AUTOMOTOR:', 'EYD122', null, null]
];

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
    const filas = todas.filter(c => c.cuit).map(c => {
      let ref6 = c.obs_muni || '';
      if (tipo === 'AUT') ref6 = ref6.replace(/^81-/i, '');
      if (tipo === 'TF') { return [c.cuit||'', '', c.titular||'', '', '', config.ref1, '', config.ref3, c.expediente||'', config.ref5, ref6, 'INFRACCION:', c.obs_propia||'']; }
      else { return [c.cuit||'', '', c.titular||'', '', '', config.ref1, c.cuit||'', config.ref3, c.expediente||'', config.ref5, ref6, '', '']; }
    });
    const wsData = [headers, ...CIDI_FILAS_TESTIGO, ...filas];
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
