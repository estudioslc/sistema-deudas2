// ==========================================
// SISTEMA LC - CONSULTA (CON MOV/EXPTE)
// ==========================================

let causas = [];
let causaEditando = null;
let causaActualDetalle = null;
let tabActual = 'expte'; // Por defecto mov/expte
let movimientosMostrados = 5;
let movimientoEditandoId = null; // Variable global para saber qué movimiento se está editando

// ==========================================
// CARGAR CAUSAS
// ==========================================

async function cargarCausas(filtro = null) {
  const container = document.getElementById('resultados');
  if (!container) return;
  if (!supabaseClient) initSupabase();
  
  showLoading('resultados', 'Cargando causas...');
  
  try {
    const { data: testData, error: testError } = await supabaseClient
      .from('deudas')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Error de conexión:', testError);
      container.innerHTML = '<div class="error">Error de conexión con la base de datos</div>';
      return;
    }
    
    let query = supabaseClient
      .from('deudas')
      .select('*');

    if (filtro && filtro !== 'todos') {
      query = query.eq('estado', filtro);
    }

    query = query.order('fecha_carga', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    causas = data || [];
    
    if (causas.length === 0) {
      container.innerHTML = '<div class="info">No hay causas cargadas. <a href="carga.html">Cargar causas</a></div>';
      return;
    }
    
    mostrarCausas(causas);
    
  } catch (err) {
    console.error('Error al cargar causas:', err);
    container.innerHTML = '<div class="error">Error al consultar las causas: ' + err.message + '</div>';
  }
}

// ==========================================
// MOSTRAR CAUSAS
// ==========================================

function mostrarCausas(lista) {
  const container = document.getElementById('resultados');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = '<div class="info">No se encontraron causas</div>';
    return;
  }

  let html = `
    <div class="preview">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:85px">
          <col style="width:135px">
          <col style="width:185px">
          <col style="width:118px">
          <col style="width:110px">
          <col style="width:175px">
          <col style="width:155px">
          <col style="width:70px">
        </colgroup>
        <thead>
          <tr>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Jud ID</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Expediente</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Titular</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">CUIT</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Teléfono</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Mail</th>
            <th style="font-size:11px;font-weight:500;color:#444;text-transform:uppercase;letter-spacing:0.04em;padding:10px 16px;text-align:left;border-bottom:1px solid #ddd;background:#f0f0f0;">Estado</th>
            <th style="border-bottom:1px solid #ddd;background:#f0f0f0;"></th>
          </tr>
        </thead>
        <tbody id="tbody-causas"></tbody>
      </table>
    </div>
    <div id="toast-copia" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2E7D52;color:white;font-size:12px;padding:7px 18px;border-radius:20px;opacity:0;transition:opacity 0.2s;pointer-events:none;z-index:9999;">Copiado al portapapeles</div>
  `;

  container.innerHTML = html;

  const tbody = document.getElementById('tbody-causas');

  lista.forEach((causa, i) => {
    const tr = document.createElement('tr');
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
    tr.style.cssText = `background:${bgColor};border-bottom:0.5px solid #eee;transition:background 0.15s;`;
    tr.onmouseenter = () => tr.style.background = '#E4F4ED';
    tr.onmouseleave = () => tr.style.background = bgColor;

    const tels = parsearLista(causa.telefono);
    const mails = parsearLista(causa.mail);

    tr.innerHTML = `
      <td style="padding:11px 16px;font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${causa.jud_id || '—'}</td>
      <td style="padding:11px 16px;font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${causa.expediente || '—'}</td>
      <td style="padding:11px 16px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${causa.titular || '—'}</td>
      <td style="padding:11px 16px;font-size:12px;color:#666;white-space:nowrap;">${causa.cuit || '—'}</td>
      <td style="padding:11px 16px;cursor:copy;overflow:hidden;max-width:110px;">${renderChips(tels, 1)}</td>
      <td style="padding:11px 16px;cursor:copy;overflow:hidden;max-width:175px;">${renderChips(mails, 1)}</td>
      <td style="padding:11px 16px;">${createEstadoBadge(causa.estado)}${causa.no_intimar ? ' <span title="No intimar" style="color:#cc0000;font-size:13px;">🚫</span>' : ''}</td>
      <td style="padding:11px 16px;"><button onclick="verDetalle(${causa.id})" class="btn btn-sm btn-primario">👁️ Ver</button></td>
    `;

    const tdTel = tr.children[4];
    const tdMail = tr.children[5];
    tdTel.ondblclick = () => copiarAlPortapapeles(tels.join(' / '));
    tdMail.ondblclick = () => copiarAlPortapapeles(mails.join(' / '));

    tbody.appendChild(tr);
  });
}

// ==========================================
// BÚSQUEDA
// ==========================================

async function buscarCausas() {
  const termino = document.getElementById('busqueda')?.value?.trim();
  const container = document.getElementById('resultados');

  if (!termino) {
    cargarCausas();
    return;
  }

  if (!supabaseClient) initSupabase();
  showLoading('resultados', 'Buscando...');

  try {
    const { data, error } = await supabaseClient
      .from('deudas')
      .select('*')
      .or(`jud_id.ilike.%${termino}%,cuit.ilike.%${termino}%,expediente.ilike.%${termino}%,caratula.ilike.%${termino}%,titular.ilike.%${termino}%,expte_judicial.ilike.%${termino}%`)
      .order('fecha_carga', { ascending: false })
      .limit(100);

    if (error) throw error;

    causas = data || [];
    mostrarCausas(causas);

  } catch (err) {
    console.error('Error al buscar:', err);
    container.innerHTML = '<div class="error">Error al buscar: ' + err.message + '</div>';
  }
}

// ==========================================
// VER DETALLE
// ==========================================

function verDetalle(id) {
  const causa = causas.find(c => c.id === id);
  if (!causa) return;
  
  causaActualDetalle = causa;
  movimientosMostrados = 5;
  
  llenarResumen(causa);
  llenarDatosCompletos(causa);
  
  // Resetear expandible
  const detalleCompleto = document.getElementById('detalleCompleto');
  const btnExpandir = document.querySelector('.btn-expandir');
  if (detalleCompleto) {
    detalleCompleto.classList.remove('expandido');
  }
  if (btnExpandir) {
    btnExpandir.classList.remove('expandido');
    btnExpandir.innerHTML = '+';
  }
  
  tabActual = 'extrajudicial';
  document.querySelectorAll('.contenido-tab').forEach(t => t.style.display = 'none');
  const tabExt = document.getElementById('contenido-extrajudicial');
  if (tabExt) tabExt.style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
  const btnExt = document.querySelector('.tab-btn[onclick*="extrajudicial"]');
  if (btnExt) btnExt.classList.add('activo');
  cargarMovimientos();
  
  const modal = document.getElementById('modalDetalle');
  if (modal) {
    modal.style.display = 'block';
  }
}

function llenarResumen(causa) {
  const procuradorEl = document.getElementById('resumenProcurador');
  if (procuradorEl) {
    procuradorEl.textContent = 'Procurador: Lucia Mercedes';
  }
  
  const grid = document.getElementById('resumenGrid');
  if (!grid) return;
  
  const nombre = causa.titular || '-';
  const doc = causa.cuit || '-';
  const estadoNombre = NOMBRES_ESTADO[causa.estado] || causa.estado || '-';
  const totalDeuda = formatCurrency((causa.nominal || 0) + (causa.accesorios || 0) + (causa.multa || 0));
  const expediente = causa.expediente || '-';

  grid.innerHTML = `
    <div class="resumen-item">
      <span class="resumen-label">Titular</span>
      <span class="resumen-value">${nombre}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Jud Id</span>
      <span class="resumen-value">${causa.jud_id || '-'}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Instancia</span>
      <span class="resumen-value">${estadoNombre}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Total deuda</span>
      <span class="resumen-value">${totalDeuda}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">CUIT</span>
      <span class="resumen-value">${doc}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Expediente</span>
      <span class="resumen-value">${expediente}</span>
    </div>
    ${causa.no_intimar ? `
    <div class="resumen-item" style="grid-column:1/-1;">
      <span style="background:#fff0f0;color:#cc0000;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">🚫 No intimar</span>
    </div>` : ''}
    ${(causa.estado === 'P' || causa.estado === 'C') && causa.fecha_pago ? `
    <div class="resumen-item">
      <span class="resumen-label">Último Pago</span>
      <span class="resumen-value" style="color:#2E7D52;">${new Date(causa.fecha_pago).toLocaleDateString('es-AR')}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Monto Pagado</span>
      <span class="resumen-value" style="color:#2E7D52;">${formatCurrency(causa.monto_pagado || 0)}</span>
    </div>` : ''}
  `;
}

function llenarDatosCompletos(causa) {
  const contenedor = document.getElementById('detalleCompletoContenido');
  if (!contenedor) return;
  
  const campos = [
    { label: 'ID', valor: causa.id },
    { label: 'Jud ID', valor: causa.jud_id },
    { label: 'Expediente', valor: causa.expediente },
    { label: 'Tipo', valor: causa.tipo },
    { label: 'Orden', valor: causa.orden },
    { label: 'Año', valor: causa.anio },
    { label: 'Carátula', valor: causa.caratula },
    { label: 'Titular', valor: causa.titular },
    { label: 'CUIT', valor: causa.cuit },
    { label: 'Nominal', valor: formatCurrency(causa.nominal) },
    { label: 'Accesorios', valor: formatCurrency(causa.accesorios) },
    { label: 'Multa', valor: formatCurrency(causa.multa) },
    { label: 'Estado', valor: causa.estado },
    { label: 'Teléfono', valor: causa.telefono },
    { label: 'Mail', valor: causa.mail },
    { label: 'Domicilio Postal', valor: causa.domicilio_postal },
    { label: 'Domicilio Inmueble', valor: causa.domicilio_inmueble },
    { label: 'Barrio Inmueble', valor: causa.barrio_inmueble },
    { label: 'Domicilio Juzgado', valor: causa.domicilio_juzgado },
    { label: 'Obs. Municipal', valor: causa.obs_muni },
    { label: 'Obs. Propia', valor: causa.obs_propia },
    { label: 'Expediente Judicial', valor: causa.expte_judicial },
    { label: 'Identificador', valor: causa.identificador },
    { label: 'Obj ID', valor: causa.obj_id },
    { label: 'Tipo Objeto', valor: causa.tipo_obj },
    { label: 'Régimen', valor: causa.regimen },
    { label: 'Año Fabricación', valor: causa.anio_fab },
    { label: 'Valor Rodado', valor: causa.valor_rodado },
    { label: 'Causa', valor: causa.causa },
    { label: 'Fecha Infracción', valor: causa.fch_infrac },
    { label: 'Hora Infracción', valor: causa.hora_infrac },
    { label: 'Infracción', valor: causa.infraccion },
    { label: 'Vehículo', valor: causa.vehiculo },
    { label: 'Carpeta', valor: causa.carpeta },
    { label: 'Fecha Carga', valor: causa.fecha_carga ? new Date(causa.fecha_carga).toLocaleString() : '-' },
    { label: 'Última Actualización', valor: causa.fecha_actualizacion ? new Date(causa.fecha_actualizacion).toLocaleString() : '-' },
    { label: 'No Intimar', valor: causa.no_intimar ? '🚫 Sí — excluida de CIDI' : null },
    { label: 'Fecha de Pago', valor: causa.fecha_pago ? new Date(causa.fecha_pago).toLocaleDateString('es-AR') : null },
    { label: 'Monto Pagado', valor: causa.monto_pagado ? formatCurrency(causa.monto_pagado) : null }
  ];
  
  let html = '';
  campos.forEach(campo => {
    if (campo.valor && campo.valor !== '-' && campo.valor !== '$ 0,00') {
      html += `
        <div class="campo-completo">
          <div class="campo-completo-label">${campo.label}</div>
          <div class="campo-completo-value">${campo.valor}</div>
        </div>
      `;
    }
  });
  
  contenedor.innerHTML = html || '<div style="grid-column: 1/-1; text-align: center; color: #999;">No hay datos adicionales</div>';
}

function toggleExpandirDetalle() {
  const detalleCompleto = document.getElementById('detalleCompleto');
  const btnExpandir = document.querySelector('.btn-expandir');
  
  if (detalleCompleto && btnExpandir) {
    const estaExpandido = detalleCompleto.classList.contains('expandido');
    
    if (estaExpandido) {
      detalleCompleto.classList.remove('expandido');
      btnExpandir.classList.remove('expandido');
      btnExpandir.innerHTML = '+';
      btnExpandir.title = 'Ver todos los datos';
    } else {
      detalleCompleto.classList.add('expandido');
      btnExpandir.classList.add('expandido');
      btnExpandir.innerHTML = '−';
      btnExpandir.title = 'Ocultar datos';
    }
  }
}

// ==========================================
// TABS
// ==========================================

function cambiarTab(tab, btn) {
  tabActual = tab;
  
  // Actualizar botones
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('activo');
  });
  if (btn) btn.classList.add('activo');
  
  // Mostrar contenido correspondiente
  mostrarContenidoTab(tab);
  
  // Cargar datos según la pestaña
  if (tab === 'expte') {
    cargarMovimientosExpte();
  } else if (tab === 'extrajudicial') {
    cargarMovimientos();
  }
}

function mostrarContenidoTab(tab) {
  // Ocultar todos los contenidos
  document.querySelectorAll('.contenido-tab').forEach(c => {
    c.style.display = 'none';
  });
  
  // Mostrar el seleccionado
  const contenido = document.getElementById('contenido-' + tab);
  if (contenido) {
    contenido.style.display = 'block';
  }
}

// ==========================================
// MOV/EXPTE - NUEVO SISTEMA
// ==========================================

function mostrarFormExpte() {
  const form = document.getElementById('formNuevoExpte');
  if (!form) return;
  
  // Setear fecha actual
  const fechaInput = document.getElementById('fechaMovExpte');
  if (fechaInput) {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = yyyy + '-' + mm + '-' + dd;
  }
  
  // Limpiar campos
  document.getElementById('tipoMovExpte').value = '';
  document.getElementById('archivoMovExpte').value = '';
  document.getElementById('notificadoMovExpte').checked = false;
  document.getElementById('observacionesMovExpte').value = '';
  
  form.style.display = 'block';
}

function cancelarFormExpte() {
  const form = document.getElementById('formNuevoExpte');
  if (form) {
    form.style.display = 'none';
  }
}

async function guardarMovExpte() {
  if (!causaActualDetalle) return;
  
  const tipo = document.getElementById('tipoMovExpte').value;
  const fecha = document.getElementById('fechaMovExpte').value;
  const archivoInput = document.getElementById('archivoMovExpte');
  const notificado = document.getElementById('notificadoMovExpte').checked;
  const observaciones = document.getElementById('observacionesMovExpte').value.trim();
  
  if (!tipo) {
    alert('Por favor selecciona un tipo de movimiento');
    return;
  }
  
  if (!fecha) {
    alert('Por favor selecciona una fecha');
    return;
  }
  
  try {
    let archivosArray = [];
    
    if (archivoInput.files.length > 0) {
      const archivo = archivoInput.files[0];
      
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(archivo.type)) {
        alert('Solo se permiten archivos PDF, JPG o PNG');
        return;
      }
      
      if (archivo.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        return;
      }
      
      const fileName = Date.now() + '_' + archivo.name;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('documentos-judiciales')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient
        .storage
        .from('documentos-judiciales')
        .getPublicUrl(fileName);
      
      archivosArray.push({
        url: urlData.publicUrl,
        nombre: archivo.name
      });
    }
    
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .insert({
        causa_id: causaActualDetalle.id,
        tipo_movimiento: tipo,
        fecha: fecha,
        notificado: notificado,
        observaciones: observaciones || null,
        archivo_url: archivosArray,
        usuario: 'Lucia'
      });
    
    if (error) throw error;
    
    cancelarFormExpte();
    cargarMovimientosExpte();
    
    showSuccess('Movimiento guardado correctamente');
    
  } catch (err) {
    console.error('Error al guardar:', err);
    showError('Error al guardar el movimiento: ' + err.message);
  }
}

async function cargarMovimientosExpte() {
  const timeline = document.getElementById('timelineExpte');
  if (!timeline || !causaActualDetalle) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('movimientos_judiciales')
      .select('*')
      .eq('causa_id', causaActualDetalle.id)
      .order('fecha', { ascending: false })
      .limit(movimientosMostrados);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      timeline.innerHTML = '<div class="sin-movimientos">No hay movimientos registrados</div>';
      return;
    }
    
    let html = '';
    data.forEach(mov => {
      html += crearHtmlMovExpte(mov);
    });
    
    timeline.innerHTML = html;
    
  } catch (err) {
    console.error('Error al cargar movimientos:', err);
    timeline.innerHTML = '<div class="error">Error al cargar movimientos</div>';
  }
}

// Función auxiliar para obtener array de archivos desde cualquier formato
function obtenerArchivosArray(mov) {
  if (!mov.archivo_url) return [];
  
  if (Array.isArray(mov.archivo_url)) {
    return mov.archivo_url;
  }
  
  if (typeof mov.archivo_url === 'string' && mov.archivo_url.trim() !== '') {
    return [{
      url: mov.archivo_url,
      nombre: mov.nombre_archivo || 'Archivo'
    }];
  }
  
  if (typeof mov.archivo_url === 'object') {
    if (mov.archivo_url.url) {
      return [mov.archivo_url];
    }
    return Object.values(mov.archivo_url);
  }
  
  return [];
}

// ==========================================
// FIX: Eliminar archivo adjunto individual
// ==========================================

async function eliminarArchivoAdjunto(movId, archivoIndex) {
  if (!confirm('¿Estás seguro de eliminar este archivo adjunto?')) return;
  
  try {
    // Obtener registro actual
    const { data: movActual, error: errorConsulta } = await supabaseClient
      .from('movimientos_judiciales')
      .select('archivo_url')
      .eq('id', movId)
      .single();
    
    if (errorConsulta) throw errorConsulta;
    
    let archivos = obtenerArchivosArray(movActual);
    
    // Quitar el archivo en el índice indicado
    archivos.splice(archivoIndex, 1);
    
    // Guardar array actualizado
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .update({ archivo_url: archivos })
      .eq('id', movId);
    
    if (error) throw error;
    
    // Recargar sin cerrar el formulario de edición si está abierto
    await cargarMovimientosExpte();
    
    // Si el formulario de edición estaba abierto, reabrirlo
    if (movimientoEditandoId === movId) {
      editarMovExpte(movId);
    }
    
    showSuccess('Archivo eliminado correctamente');
    
  } catch (err) {
    console.error('Error al eliminar archivo:', err);
    showError('Error al eliminar el archivo: ' + err.message);
  }
}

function crearHtmlMovExpte(mov) {
  const nombresTipos = {
    'demanda_iniciada': 'Demanda iniciada',
    'primer_decreto': 'Primer decreto',
    'certificado_no_oposicion': 'Certificado de no oposición de excepciones',
    'sentencia': 'Sentencia',
    'ejecucion': 'Ejecución'
  };
  
  const tipoNombre = nombresTipos[mov.tipo_movimiento] || mov.tipo_movimiento;
  const fechaFormateada = new Date(mov.fecha).toLocaleDateString('es-AR');
  
  const archivos = obtenerArchivosArray(mov);
  
  // FIX: Archivos con botón de eliminación
  let archivosHtml = '';
  if (archivos.length > 0) {
    archivosHtml = '<div class="archivos-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">';
    archivos.forEach((arch, index) => {
      archivosHtml += `
        <div style="display: inline-flex; align-items: center; gap: 4px; background: #E3F2FD; border-radius: 4px; padding: 4px 8px;">
          <a href="${arch.url}" target="_blank" class="mov-expte-archivo" style="margin: 0; padding: 0; background: none;" title="${arch.nombre || 'Ver archivo'}">
            📎 ${arch.nombre || 'Archivo ' + (index + 1)}
          </a>
          <button 
            onclick="eliminarArchivoAdjunto(${mov.id}, ${index})" 
            title="Eliminar este archivo"
            style="background: none; border: none; cursor: pointer; color: #f44336; font-size: 14px; padding: 0 2px; line-height: 1;"
          >✕</button>
        </div>
      `;
    });
    archivosHtml += '</div>';
  }

  // FIX: En el formulario de edición también mostramos archivos con botón eliminar
  let archivosEnFormHtml = '';
  if (archivos.length > 0) {
    archivosEnFormHtml = `
      <div style="margin-bottom: 8px;">
        <label style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Archivos adjuntos actuales:</label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
    `;
    archivos.forEach((arch, index) => {
      archivosEnFormHtml += `
        <div style="display: inline-flex; align-items: center; gap: 4px; background: #E3F2FD; border-radius: 4px; padding: 4px 8px;">
          <a href="${arch.url}" target="_blank" style="font-size: 12px; color: #1976D2; text-decoration: none;">
            📎 ${arch.nombre || 'Archivo ' + (index + 1)}
          </a>
          <button 
            onclick="eliminarArchivoAdjunto(${mov.id}, ${index})" 
            title="Eliminar este archivo"
            style="background: none; border: none; cursor: pointer; color: #f44336; font-size: 14px; padding: 0 2px; line-height: 1;"
          >✕</button>
        </div>
      `;
    });
    archivosEnFormHtml += '</div></div>';
  }
  
  let html = `
    <div class="mov-expte-item" id="mov-expte-${mov.id}">
      <div class="mov-expte-header">
        <div>
          <span class="mov-expte-tipo">${tipoNombre}</span>
          <span class="mov-expte-notificado ${mov.notificado ? 'notificado-si' : 'notificado-no'}" id="notif-badge-${mov.id}">
            ${mov.notificado ? 'Notificado' : 'No notificado'}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="mov-expte-fecha">${fechaFormateada}</span>
          <button class="btn-icono btn-editar" onclick="editarMovExpte(${mov.id})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarMovExpte(${mov.id})" title="Eliminar">🗑️</button>
        </div>
      </div>
      
      <div id="contenido-mov-${mov.id}">
        ${mov.observaciones ? `<div class="mov-expte-observaciones" id="obs-text-${mov.id}">${mov.observaciones}</div>` : ''}
        ${archivosHtml}
      </div>
      
      <div id="form-edit-${mov.id}" style="display: none; margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
        <div style="margin-bottom: 8px;">
          <label style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Notificado:</label>
          <input type="checkbox" id="edit-notif-${mov.id}" ${mov.notificado ? 'checked' : ''} style="margin-left: 8px;">
        </div>
        <div style="margin-bottom: 8px;">
          <label style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Observaciones:</label>
          <textarea id="edit-obs-${mov.id}" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; min-height: 50px; resize: vertical;">${mov.observaciones || ''}</textarea>
        </div>
        ${archivosEnFormHtml}
        <div style="margin-bottom: 8px;">
          <label style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Agregar documento adicional:</label>
          <input type="file" id="edit-arch-${mov.id}" accept=".pdf,.jpg,.jpeg,.png" style="margin-top: 4px; font-size: 12px;">
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-icono btn-guardar-edicion" onclick="guardarEdicionMovExpte(${mov.id})" title="Guardar">💾</button>
          <button class="btn-icono btn-cancelar" onclick="cancelarEdicionMovExpte(${mov.id})" title="Cancelar">❌</button>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// ==========================================
// MOV. EXTRAJUDICIAL (SISTEMA ANTERIOR)
// ==========================================

function mostrarFormNuevo() {
  const form = document.getElementById('formNuevoMovimiento');
  const fechaEl = document.getElementById('fechaActual');
  const textarea = document.getElementById('textoNuevoMovimiento');
  
  if (form && fechaEl) {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    const fechaFormateada = dia + '/' + mes + '/' + anio;
    
    fechaEl.textContent = fechaFormateada;
    
    if (textarea) textarea.value = '';
    
    form.classList.add('visible');
    if (textarea) textarea.focus();
  }
}

function cancelarNuevo() {
  const form = document.getElementById('formNuevoMovimiento');
  if (form) {
    form.classList.remove('visible');
  }
}

async function guardarNuevoMovimiento() {
  const textarea = document.getElementById('textoNuevoMovimiento');
  const fechaEl = document.getElementById('fechaActual');
  
  if (!textarea || !fechaEl || !causaActualDetalle) return;
  
  const texto = textarea.value.trim();
  if (!texto) {
    alert('Por favor escribe una observación');
    return;
  }
  
  const fecha = fechaEl.textContent;
  const usuario = 'Lucia';
  
  const nuevoRegistro = fecha + '##' + texto + '##' + usuario + '||';
  
  let valorActual = causaActualDetalle.obs_propia || '';
  
  if (valorActual.endsWith('/')) {
    valorActual = valorActual.replace(/\//g, '||');
  }
  
  const nuevoValor = valorActual + nuevoRegistro;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ obs_propia: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.obs_propia = nuevoValor;
    
    cancelarNuevo();
    cargarMovimientos();
    
    showSuccess('Movimiento guardado correctamente');
    
  } catch (err) {
    console.error('Error al guardar:', err);
    showError('Error al guardar el movimiento: ' + err.message);
  }
}

function cargarMovimientos() {
  const timeline = document.getElementById('timelineMovimientos');
  if (!timeline || !causaActualDetalle) return;
  
  const observaciones = causaActualDetalle.obs_propia || '';
  
  if (!observaciones.trim()) {
    timeline.innerHTML = '<div class="sin-movimientos">No hay movimientos registrados</div>';
    return;
  }
  
  const movimientos = parsearMovimientos(observaciones);
  const movimientosAMostrar = movimientos.slice(0, movimientosMostrados);
  
  let html = '';
  movimientosAMostrar.forEach((mov) => {
    html += crearHtmlMovimiento(mov);
  });
  
  timeline.innerHTML = html;
}

function parsearMovimientos(texto) {
  if (!texto || texto.trim() === '') return [];
  
  if (!texto.includes('##')) {
    return [{
      fecha: 'Sin fecha',
      texto: texto,
      usuario: 'DDT',
      index: 0
    }];
  }
  
  const movimientos = [];
  const partes = texto.split('||').filter(function(p) { 
    return p.trim() !== ''; 
  });
  
  partes.forEach(function(parte, index) {
    if (!parte.includes('##')) return;
    
    const datos = parte.split('##');
    movimientos.push({
      fecha: datos[0] || '-',
      texto: datos[1] || '',
      usuario: datos[2] || 'Sistema',
      index: index
    });
  });
  
  return movimientos.reverse();
}

function crearHtmlMovimiento(mov) {
  return `
    <div class="movimiento-item" data-index="${mov.index}">
      <div class="movimiento-header">
        <span class="movimiento-fecha">${mov.fecha}</span>
        <div class="movimiento-acciones">
          <button class="btn-icono btn-editar" onclick="editarMovimiento(${mov.index})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarMovimiento(${mov.index})" title="Eliminar">🗑️</button>
        </div>
      </div>
      <div class="movimiento-texto" id="texto-mov-${mov.index}">${mov.texto}</div>
    </div>
  `;
}

function editarMovimiento(index) {
  const movimientoItem = document.querySelector('.movimiento-item[data-index="' + index + '"]');
  if (!movimientoItem) return;
  
  const textoDiv = movimientoItem.querySelector('.movimiento-texto');
  const accionesDiv = movimientoItem.querySelector('.movimiento-acciones');
  
  if (!textoDiv || !accionesDiv) return;
  
  const textoActual = textoDiv.textContent;
  
  textoDiv.innerHTML = '<textarea class="movimiento-texto-edit" id="edit-mov-' + index + '">' + textoActual + '</textarea>';
  
  accionesDiv.innerHTML = `
    <button class="btn-icono btn-guardar-edicion" onclick="guardarEdicionMovimiento(${index})" title="Guardar">💾</button>
    <button class="btn-icono btn-cancelar" onclick="cancelarEdicionMovimiento(${index})" title="Cancelar">❌</button>
  `;
}

function cancelarEdicionMovimiento(index) {
  cargarMovimientos();
}

async function guardarEdicionMovimiento(index) {
  const textarea = document.getElementById('edit-mov-' + index);
  if (!textarea || !causaActualDetalle) return;
  
  const nuevoTexto = textarea.value.trim();
  
  let observaciones = causaActualDetalle.obs_propia || '';
  const movimientos = parsearMovimientos(observaciones);
  
  const movIndex = movimientos.findIndex(function(m) { 
    return m.index === index; 
  });
  
  if (movIndex === -1) {
    showError('No se encontró el movimiento a editar');
    return;
  }
  
  movimientos[movIndex].texto = nuevoTexto;
  
  const nuevoValor = movimientos.reverse().map(function(m) {
    return m.fecha + '##' + m.texto + '##' + m.usuario;
  }).join('||') + '||';
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ obs_propia: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.obs_propia = nuevoValor;
    cargarMovimientos();
    
    showSuccess('Movimiento actualizado correctamente');
    
  } catch (err) {
    console.error('Error al actualizar:', err);
    showError('Error al actualizar el movimiento: ' + err.message);
  }
}

async function eliminarMovimiento(index) {
  if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
  
  if (!causaActualDetalle) return;
  
  let observaciones = causaActualDetalle.obs_propia || '';
  const movimientos = parsearMovimientos(observaciones);
  
  const movimientosFiltrados = movimientos.filter(function(m) { 
    return m.index !== index; 
  });
  
  if (movimientosFiltrados.length === movimientos.length) {
    showError('No se encontró el movimiento a eliminar');
    return;
  }
  
  let nuevoValor = '';
  if (movimientosFiltrados.length > 0) {
    nuevoValor = movimientosFiltrados.reverse().map(function(m) {
      return m.fecha + '##' + m.texto + '##' + m.usuario;
    }).join('||') + '||';
  }
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ obs_propia: nuevoValor || null })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.obs_propia = nuevoValor || null;
    cargarMovimientos();
    
    showSuccess('Movimiento eliminado correctamente');
    
  } catch (err) {
    console.error('Error al eliminar:', err);
    showError('Error al eliminar el movimiento: ' + err.message);
  }
}

function cargarMasMovimientos() {
  movimientosMostrados += 5;
  if (tabActual === 'expte') {
    cargarMovimientosExpte();
  } else if (tabActual === 'extrajudicial') {
    cargarMovimientos();
  }
}

// ==========================================
// CERRAR MODAL
// ==========================================

function cerrarModalDetalle() {
  const modal = document.getElementById('modalDetalle');
  if (modal) {
    modal.style.display = 'none';
  }
  causaActualDetalle = null;
  movimientoEditandoId = null;
  cancelarNuevo();
  cancelarFormExpte();
}

function editarDesdeDetalle() {
  if (!causaActualDetalle) return;
  const idGuardado = causaActualDetalle.id;
  
  cerrarModalDetalle();
  
  setTimeout(function() {
    editarCausa(idGuardado);
  }, 300);
}

// ==========================================
// EDICIÓN DE CAUSA
// ==========================================

function editarCausa(id) {
  const idNum = Number(id);
  const causa = causas.find(function(c) { 
    return Number(c.id) === idNum; 
  });
  
  if (!causa) {
    console.error('No se encontró la causa con id:', id);
    return;
  }
  
  causaEditando = causa;
  
  document.getElementById('editId').value = causa.id;
  document.getElementById('editExpediente').value = causa.expediente || '';
  document.getElementById('editCaratula').value = causa.caratula || '';
  document.getElementById('editDeudor').value = causa.titular || '';
  document.getElementById('editDocumento').value = causa.cuit || '';
  document.getElementById('editMonto').value = causa.nominal || '';
  document.getElementById('editEstado').value = causa.estado || 'X';
  document.getElementById('editObservaciones').value = causa.obs_propia || '';
  document.getElementById('editNoIntimar').checked = causa.no_intimar || false;
  
  document.getElementById('modalEdicion').style.display = 'block';
}

async function guardarEdicion() {
  if (!causaEditando) return;
  
  const datos = {
    expediente: document.getElementById('editExpediente').value,
    caratula: document.getElementById('editCaratula').value,
    titular: document.getElementById('editDeudor').value,
    cuit: document.getElementById('editDocumento').value,
    nominal: parseFloat(document.getElementById('editMonto').value) || null,
    estado: document.getElementById('editEstado').value,
    obs_propia: document.getElementById('editObservaciones').value,
    no_intimar: document.getElementById('editNoIntimar').checked,
    fecha_actualizacion: new Date().toISOString()
  };
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update(datos)
      .eq('id', causaEditando.id);
    
    if (error) throw error;
    
    showSuccess('Causa actualizada correctamente');
    cerrarModal();
    cargarCausas();
    
  } catch (err) {
    console.error('Error al actualizar:', err);
    showError('Error al guardar los cambios');
  }
}

function cerrarModal() {
  document.getElementById('modalEdicion').style.display = 'none';
  causaEditando = null;
}

// ==========================================
// ELIMINACIÓN
// ==========================================

async function eliminarCausa(id) {
  if (!confirm('¿Estás seguro de eliminar esta causa?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showSuccess('Causa eliminada correctamente');
    cargarCausas();
    
  } catch (err) {
    console.error('Error al eliminar:', err);
    showError('Error al eliminar la causa');
  }
}

// ==========================================
// FILTROS
// ==========================================

function filtrarPorEstado(estado) {
  document.querySelectorAll('.btn-filtro-estado').forEach(btn => {
    btn.classList.remove('btn-secundario');
  });
  const btnActivo = document.querySelector(`.btn-filtro-estado[data-estado="${estado}"]`);
  if (btnActivo) btnActivo.classList.add('btn-secundario');
  if (!supabaseClient) initSupabase();
  cargarCausas(estado);
}

function seleccionarTextoCelda(celda) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(celda);
  selection.removeAllRanges();
  selection.addRange(range);
}

function parsearLista(valor) {
  if (!valor) return [];
  return valor.toString().split('/').map(v => v.trim()).filter(Boolean);
}

function renderChips(items, maxShow) {
  if (!items || items.length === 0) return '<span style="color:#bbb;font-size:12px;">—</span>';
  const shown = items.slice(0, maxShow);
  const rest = items.length - maxShow;
  let html = '<div style="display:flex;flex-wrap:nowrap;align-items:center;gap:3px;overflow:hidden;">';
  shown.forEach(v => {
    html += `<span style="display:inline-block;background:#f0f0f0;border-radius:4px;padding:2px 6px;font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;vertical-align:middle;" title="${v}">${v}</span>`;
  });
  if (rest > 0) html += `<span style="font-size:11px;color:#aaa;">+${rest}</span>`;
  html += '</div>';
  return html;
}

function copiarAlPortapapeles(texto) {
  if (!texto) return;
  navigator.clipboard.writeText(texto).catch(() => {});
  const toast = document.getElementById('toast-copia');
  if (toast) {
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 1800);
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  const filtro = params.get('filtro');
  
  cargarCausas(filtro);
  
  const inputBusqueda = document.getElementById('busqueda');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', debounce(buscarCausas, 300));
  }
  
  window.onclick = function(event) {
    const modalEdicion = document.getElementById('modalEdicion');
    const modalDetalle = document.getElementById('modalDetalle');
    
    if (modalEdicion && modalEdicion.style.display === 'block' && event.target === modalEdicion) {
      cerrarModal();
    }
    if (modalDetalle && modalDetalle.style.display === 'block' && event.target === modalDetalle) {
      cerrarModalDetalle();
    }
  };
});

// ==========================================
// UTILIDADES
// ==========================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction() {
    const args = arguments;
    const later = function() {
      clearTimeout(timeout);
      func.apply(null, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function limpiarTodasLasCausas() {
  if (!confirm('¿ESTÁS SEGURO de eliminar TODAS las causas? Esta acción no se puede deshacer.')) return;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .delete()
      .neq('id', 0);
    
    if (error) throw error;
    
    showSuccess('Todas las causas han sido eliminadas');
    causas = [];
    mostrarCausas([]);
    
  } catch (err) {
    console.error('Error al limpiar:', err);
    showError('Error al eliminar las causas: ' + err.message);
  }
}

// ==========================================
// EDITAR Y ELIMINAR MOV/EXPTE
// ==========================================

function editarMovExpte(id) {
  movimientoEditandoId = id;
  
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'none';
  if (form) form.style.display = 'block';
  
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

function cancelarEdicionMovExpte(id) {
  movimientoEditandoId = null;
  
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'block';
  if (form) form.style.display = 'none';
  
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

async function guardarEdicionMovExpte(id) {
  const movId = id || movimientoEditandoId;
  
  if (!movId) {
    showError('Error: No se pudo identificar el movimiento');
    return;
  }
  
  const notifCheckbox = document.getElementById('edit-notif-' + movId);
  const obsTextarea = document.getElementById('edit-obs-' + movId);
  const archivoInput = document.getElementById('edit-arch-' + movId);
  
  if (!notifCheckbox || !obsTextarea) {
    showError('Error: No se pudo acceder al formulario');
    return;
  }
  
  const notificado = notifCheckbox.checked;
  const observaciones = obsTextarea.value.trim();
  
  const btnGuardar = document.querySelector(`#form-edit-${movId} .btn-guardar-edicion`);
  const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '💾';
  if (btnGuardar) {
    btnGuardar.innerHTML = '⏳';
    btnGuardar.disabled = true;
  }
  
  try {
    const { data: movActual, error: errorConsulta } = await supabaseClient
      .from('movimientos_judiciales')
      .select('*')
      .eq('id', movId)
      .single();
    
    if (errorConsulta) throw errorConsulta;
    
    let archivosArray = obtenerArchivosArray(movActual);
    
    if (archivoInput && archivoInput.files.length > 0) {
      const archivo = archivoInput.files[0];
      
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(archivo.type)) {
        alert('Solo se permiten archivos PDF, JPG o PNG');
        if (btnGuardar) { btnGuardar.innerHTML = textoOriginal; btnGuardar.disabled = false; }
        return;
      }
      
      if (archivo.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        if (btnGuardar) { btnGuardar.innerHTML = textoOriginal; btnGuardar.disabled = false; }
        return;
      }
      
      const fileName = Date.now() + '_' + archivo.name;
      const { error: uploadError } = await supabaseClient
        .storage
        .from('documentos-judiciales')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient
        .storage
        .from('documentos-judiciales')
        .getPublicUrl(fileName);
      
      archivosArray.push({
        url: urlData.publicUrl,
        nombre: archivo.name
      });
    }
    
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .update({
        notificado: notificado,
        observaciones: observaciones || null,
        archivo_url: archivosArray
      })
      .eq('id', movId);
    
    if (error) throw error;
    
    movimientoEditandoId = null;
    
    await cargarMovimientosExpte();
    
    showSuccess('Movimiento actualizado correctamente');
    
  } catch (err) {
    console.error('Error:', err);
    showError('Error al actualizar el movimiento: ' + err.message);
  } finally {
    if (btnGuardar) {
      btnGuardar.innerHTML = textoOriginal;
      btnGuardar.disabled = false;
    }
  }
}

async function eliminarMovExpte(id) {
  if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    await cargarMovimientosExpte();
    showSuccess('Movimiento eliminado correctamente');
    
  } catch (err) {
    console.error('Error al eliminar:', err);
    showError('Error al eliminar el movimiento: ' + err.message);
  }
}

// ==========================================
// EXPONER FUNCIONES AL SCOPE GLOBAL
// ==========================================

window.verDetalle = verDetalle;
window.buscarCausas = buscarCausas;
window.filtrarPorEstado = filtrarPorEstado;
window.cerrarModal = cerrarModal;
window.cerrarModalDetalle = cerrarModalDetalle;
window.editarDesdeDetalle = editarDesdeDetalle;
window.guardarEdicion = guardarEdicion;
window.limpiarTodasLasCausas = limpiarTodasLasCausas;
window.editarCausa = editarCausa;
window.eliminarCausa = eliminarCausa;
window.toggleExpandirDetalle = toggleExpandirDetalle;
window.cambiarTab = cambiarTab;
window.mostrarFormNuevo = mostrarFormNuevo;
window.cancelarNuevo = cancelarNuevo;
window.guardarNuevoMovimiento = guardarNuevoMovimiento;
window.editarMovimiento = editarMovimiento;
window.cancelarEdicionMovimiento = cancelarEdicionMovimiento;
window.guardarEdicionMovimiento = guardarEdicionMovimiento;
window.eliminarMovimiento = eliminarMovimiento;
window.cargarMasMovimientos = cargarMasMovimientos;
window.mostrarFormExpte = mostrarFormExpte;
window.cancelarFormExpte = cancelarFormExpte;
window.guardarMovExpte = guardarMovExpte;
window.editarMovExpte = editarMovExpte;
window.cancelarEdicionMovExpte = cancelarEdicionMovExpte;
window.guardarEdicionMovExpte = guardarEdicionMovExpte;
window.eliminarMovExpte = eliminarMovExpte;
window.eliminarArchivoAdjunto = eliminarArchivoAdjunto;
