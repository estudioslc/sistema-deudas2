// ==========================================
// SISTEMA LC - CONSULTA (CON MOV/EXPTE)
// ==========================================

let causas = [];
let causaEditando = null;
let causaActualDetalle = null;
let tabActual = 'expte'; // Por defecto mov/expte
let movimientosMostrados = 5;

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
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filtro && filtro !== 'todos') {
      query = query.eq('estado', filtro);
    }
    
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
      <table>
        <thead>
          <tr>
            <th>Jud ID</th>
            <th>Expediente</th>
            <th>Carátula</th>
            <th>Deudor/Titular</th>
            <th>Documento/CUIT</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  lista.forEach(causa => {
    const nombre = causa.deudor || causa.titular || '-';
    const doc = causa.documento || causa.cuit || '-';
    
    html += `
      <tr>
        <td>${causa.jud_id || '-'}</td>
        <td>${causa.expediente || '-'}</td>
        <td>${causa.caratula || '-'}</td>
        <td>${nombre}</td>
        <td>${doc}</td>
        <td>${formatCurrency(causa.monto)}</td>
        <td>${createEstadoBadge(causa.estado)}</td>
        <td>
          <button onclick="verDetalle(${causa.id})" class="btn btn-sm btn-primario">👁️ Ver</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table></div>';
  html += `<div class="info">Total: ${lista.length} causas</div>`;
  
  container.innerHTML = html;
}

// ==========================================
// BÚSQUEDA
// ==========================================

function buscarCausas() {
  const termino = document.getElementById('busqueda')?.value?.toLowerCase()?.trim();
  
  if (!termino) {
    mostrarCausas(causas);
    return;
  }
  
  const filtradas = causas.filter(c => 
    (c.jud_id && String(c.jud_id).toLowerCase().includes(termino)) ||
    (c.cuit && String(c.cuit).toLowerCase().includes(termino)) ||
    (c.expediente && String(c.expediente).toLowerCase().includes(termino)) ||
    (c.caratula && String(c.caratula).toLowerCase().includes(termino)) ||
    (c.deudor && String(c.deudor).toLowerCase().includes(termino)) ||
    (c.documento && String(c.documento).toLowerCase().includes(termino)) ||
    (c.titular && String(c.titular).toLowerCase().includes(termino))
  );
  
  mostrarCausas(filtradas);
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
  
  // Por defecto mostrar mov/expte
  tabActual = 'expte';
  mostrarContenidoTab('expte');
  
  // Cargar movimientos expte
  cargarMovimientosExpte();
  
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
  
  const nombre = causa.titular || causa.deudor || '-';
  const doc = causa.cuit || causa.documento || '-';
  const estadoNombre = NOMBRES_ESTADO[causa.estado] || causa.estado || '-';
  const monto = formatCurrency(causa.monto);
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
      <span class="resumen-label">Monto deuda</span>
      <span class="resumen-value">${monto}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Cuit</span>
      <span class="resumen-value">${doc}</span>
    </div>
    <div class="resumen-item">
      <span class="resumen-label">Expediente</span>
      <span class="resumen-value">${expediente}</span>
    </div>
  `;
}

function llenarDatosCompletos(causa) {
  const contenedor = document.getElementById('detalleCompletoContenido');
  if (!contenedor) return;
  
  const campos = [
    { label: 'ID', valor: causa.id },
    { label: 'Jud ID', valor: causa.jud_id },
    { label: 'Expediente', valor: causa.expediente },
    { label: 'Carátula', valor: causa.caratula },
    { label: 'Deudor', valor: causa.deudor },
    { label: 'Titular', valor: causa.titular },
    { label: 'Documento', valor: causa.documento },
    { label: 'CUIT', valor: causa.cuit },
    { label: 'Monto', valor: formatCurrency(causa.monto) },
    { label: 'Estado', valor: causa.estado },
    { label: 'Teléfono', valor: causa.telefono || causa.telefono_fusion },
    { label: 'Email', valor: causa.mail || causa.email_fusion },
    { label: 'Domicilio Postal', valor: causa.domicilio_postal },
    { label: 'Domicilio Inmueble', valor: causa.domicilio_inmueble },
    { label: 'Barrio Inmueble', valor: causa.barrio_inmueble },
    { label: 'Domicilio Juzgado', valor: causa.domicilio_juzgado },
    { label: 'Observaciones', valor: causa.observaciones },
    { label: 'Observaciones Fusión', valor: causa.observaciones_fusion },
    { label: 'Expediente Judicial', valor: causa.expte_judicial },
    { label: 'Dominio/Objeto', valor: causa.dominio_objeto || causa.identificador },
    { label: 'Infracción', valor: causa.infraccion },
    { label: 'Fecha Infracción', valor: causa.fch_infrac },
    { label: 'Hora Infracción', valor: causa.hora_infrac },
    { label: 'Vehículo', valor: causa.vehiculo },
    { label: 'Causa', valor: causa.causa },
    { label: 'Objeto ID', valor: causa.obj_id },
    { label: 'Tipo Objeto', valor: causa.tipo_obj },
    { label: 'Régimen', valor: causa.regimen },
    { label: 'Año Fabricación', valor: causa.anio_fab },
    { label: 'Valor Rodado', valor: causa.valor_rodado },
    { label: 'Carpeta', valor: causa.carpeta },
    { label: 'Notas Seguimiento', valor: causa.notas_seguimiento },
    { label: 'Creado', valor: causa.created_at ? new Date(causa.created_at).toLocaleString() : '-' },
    { label: 'Última Actualización', valor: causa.fecha_ultima_actualizacion ? new Date(causa.fecha_ultima_actualizacion).toLocaleString() : '-' }
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
    let archivoUrl = null;
    let nombreArchivo = null;
    
    // Subir archivo si hay
    if (archivoInput.files.length > 0) {
      const archivo = archivoInput.files[0];
      nombreArchivo = archivo.name;
      
      // Validar tipo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(archivo.type)) {
        alert('Solo se permiten archivos PDF, JPG o PNG');
        return;
      }
      
      // Validar tamaño (máx 10MB)
      if (archivo.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        return;
      }
      
      // Subir a Storage
      const fileName = Date.now() + '_' + archivo.name;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('documentos-judiciales')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      // Obtener URL pública
      const { data: urlData } = supabaseClient
        .storage
        .from('documentos-judiciales')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
    }
    
    // Guardar en tabla
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .insert({
        causa_id: causaActualDetalle.id,
        tipo_movimiento: tipo,
        fecha: fecha,
        notificado: notificado,
        observaciones: observaciones || null,
        archivo_url: archivoUrl,
        nombre_archivo: nombreArchivo,
        usuario: 'Lucia'
      });
    
    if (error) throw error;
    
    // Cerrar formulario y recargar
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
        ${mov.archivo_url ? `
          <a href="${mov.archivo_url}" target="_blank" class="mov-expte-archivo" id="arch-link-${mov.id}">
            📎 ${mov.nombre_archivo || 'Ver archivo'}
          </a>
        ` : ''}
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
  
  let valorActual = causaActualDetalle.observaciones_fusion || '';
  
  if (valorActual.endsWith('/')) {
    valorActual = valorActual.replace(/\//g, '||');
  }
  
  const nuevoValor = valorActual + nuevoRegistro;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ observaciones_fusion: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.observaciones_fusion = nuevoValor;
    
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
  
  const observaciones = causaActualDetalle.observaciones_fusion || '';
  
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
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return [{
      fecha: dia + '/' + mes + '/' + anio,
      texto: texto,
      usuario: 'Histórico',
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
  
  let observaciones = causaActualDetalle.observaciones_fusion || '';
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
      .update({ observaciones_fusion: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.observaciones_fusion = nuevoValor;
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
  
  let observaciones = causaActualDetalle.observaciones_fusion || '';
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
      .update({ observaciones_fusion: nuevoValor || null })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    causaActualDetalle.observaciones_fusion = nuevoValor || null;
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
  document.getElementById('editDeudor').value = causa.deudor || causa.titular || '';
  document.getElementById('editDocumento').value = causa.documento || causa.cuit || '';
  document.getElementById('editMonto').value = causa.monto || '';
  document.getElementById('editEstado').value = causa.estado || 'X';
  document.getElementById('editObservaciones').value = causa.observaciones || causa.observaciones_fusion || '';
  
  document.getElementById('modalEdicion').style.display = 'block';
}

async function guardarEdicion() {
  if (!causaEditando) return;
  
  const datos = {
    expediente: document.getElementById('editExpediente').value,
    caratula: document.getElementById('editCaratula').value,
    deudor: document.getElementById('editDeudor').value,
    documento: document.getElementById('editDocumento').value,
    monto: parseFloat(document.getElementById('editMonto').value) || 0,
    estado: document.getElementById('editEstado').value,
    observaciones: document.getElementById('editObservaciones').value,
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
  if (!supabaseClient) initSupabase();
  cargarCausas(estado);
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
  // Ocultar contenido y mostrar formulario
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'none';
  if (form) form.style.display = 'block';
  
  // Limpiar el input de archivo al abrir edición
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

function cancelarEdicionMovExpte(id) {
  // Mostrar contenido y ocultar formulario
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'block';
  if (form) form.style.display = 'none';
  
  // Limpiar input de archivo al cancelar
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

async function guardarEdicionMovExpte(id) {
  const notificado = document.getElementById('edit-notif-' + id).checked;
  const observaciones = document.getElementById('edit-obs-' + id).value.trim();
  const archivoInput = document.getElementById('edit-arch-' + id);
  
  // Mostrar indicador de carga
  const btnGuardar = document.querySelector(`#form-edit-${id} .btn-guardar-edicion`);
  const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '💾';
  if (btnGuardar) {
    btnGuardar.innerHTML = '⏳';
    btnGuardar.disabled = true;
  }
  
  try {
    let archivoUrl = null;
    let nombreArchivo = null;
    
    // Si hay nuevo archivo, subirlo
    if (archivoInput && archivoInput.files.length > 0) {
      const archivo = archivoInput.files[0];
      
      // Validar tipo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(archivo.type)) {
        alert('Solo se permiten archivos PDF, JPG o PNG');
        if (btnGuardar) {
          btnGuardar.innerHTML = textoOriginal;
          btnGuardar.disabled = false;
        }
        return;
      }
      
      // Validar tamaño (máx 10MB)
      if (archivo.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        if (btnGuardar) {
          btnGuardar.innerHTML = textoOriginal;
          btnGuardar.disabled = false;
        }
        return;
      }
      
      // Subir a Storage
      const fileName = Date.now() + '_' + archivo.name;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('documentos-judiciales')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      // Obtener URL pública
      const { data: urlData } = supabaseClient
        .storage
        .from('documentos-judiciales')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
      nombreArchivo = archivo.name;
    }
    
    // Preparar datos a actualizar
    const datosActualizar = {
      notificado: notificado,
      observaciones: observaciones || null
    };
    
    // Si hay nuevo archivo, agregarlo (reemplaza el anterior por ahora)
    if (archivoUrl) {
      datosActualizar.archivo_url = archivoUrl;
      datosActualizar.nombre_archivo = nombreArchivo;
    }
    
    // Actualizar en la base de datos
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .update(datosActualizar)
      .eq('id', id);
    
    if (error) throw error;
    
    // Cerrar formulario de edición ANTES de recargar
    cancelarEdicionMovExpte(id);
    
    // Recargar movimientos
    await cargarMovimientosExpte();
    
    showSuccess('Movimiento actualizado correctamente');
    
  } catch (err) {
    console.error('Error al actualizar:', err);
    showError('Error al actualizar el movimiento: ' + err.message);
  } finally {
    // Restaurar botón
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
    
    cargarMovimientosExpte();
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
