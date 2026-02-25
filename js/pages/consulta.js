// ==========================================
// SISTEMA LC - CONSULTA (NUEVO CON MODAL REDISEÑADO)
// ==========================================

let causas = [];
let causaEditando = null;
let causaActualDetalle = null;
let tabActual = 'extrajudicial';
let movimientosMostrados = 5; // Cantidad inicial de movimientos a mostrar

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
// VER DETALLE (NUEVO MODAL REDISEÑADO)
// ==========================================

function verDetalle(id) {
  const causa = causas.find(c => c.id === id);
  if (!causa) return;
  
  causaActualDetalle = causa;
  movimientosMostrados = 5; // Resetear contador
  
  // Llenar resumen (sección verde)
  llenarResumen(causa);
  
  // Llenar datos completos (sección expandible)
  llenarDatosCompletos(causa);
  
  // Resetear estado del expandible
  const detalleCompleto = document.getElementById('detalleCompleto');
  const btnExpandir = document.querySelector('.btn-expandir');
  if (detalleCompleto) {
    detalleCompleto.classList.remove('expandido');
  }
  if (btnExpandir) {
    btnExpandir.classList.remove('expandido');
    btnExpandir.innerHTML = '+';
  }
  
  // Cargar movimientos de la pestaña activa
  cargarMovimientos();
  
  // Mostrar modal
  const modal = document.getElementById('modalDetalle');
  if (modal) {
    modal.style.display = 'block';
  }
}

function llenarResumen(causa) {
  // Procurador
  const procuradorEl = document.getElementById('resumenProcurador');
  if (procuradorEl) {
    procuradorEl.textContent = 'Procurador: Lucia Mercedes';
  }
  
  // Grid de resumen
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
  
  // Lista de todos los campos disponibles
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
// TABS Y MOVIMIENTOS
// ==========================================

function cambiarTab(tab) {
  tabActual = tab;
  
  // Actualizar botones
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('activo');
  });
  event.target.classList.add('activo');
  
  // Recargar movimientos
  movimientosMostrados = 5;
  cargarMovimientos();
}

function cargarMovimientos() {
  const timeline = document.getElementById('timelineMovimientos');
  if (!timeline || !causaActualDetalle) return;
  
  // Por ahora solo trabajamos con observaciones_fusion
  // En el futuro, cada tab usará su propia columna
  let observaciones = '';
  
  switch(tabActual) {
    case 'extrajudicial':
      observaciones = causaActualDetalle.observaciones_fusion || '';
      break;
    case 'wsp':
      // observaciones = causaActualDetalle.mensajes_wsp || '';
      observaciones = ''; // Por ahora vacío hasta crear columna
      break;
    case 'mail':
      // observaciones = causaActualDetalle.mensajes_mail || '';
      observaciones = ''; // Por ahora vacío hasta crear columna
      break;
    case 'expte':
      // observaciones = causaActualDetalle.mov_expte || '';
      observaciones = ''; // Por ahora vacío hasta crear columna
      break;
    case 'mas':
      observaciones = causaActualDetalle.observaciones || '';
      break;
  }
  
  if (!observaciones || observaciones.trim() === '') {
    timeline.innerHTML = '<div class="sin-movimientos">No hay movimientos registrados</div>';
    return;
  }
  
  // Parsear movimientos (formato: fecha##texto##usuario/otra_fecha##otro_texto##otro_usuario/)
  const movimientos = parsearMovimientos(observaciones);
  
  // Mostrar solo los últimos N movimientos
  const movimientosAMostrar = movimientos.slice(0, movimientosMostrados);
  
  let html = '';
  movimientosAMostrar.forEach((mov, index) => {
    html += crearHtmlMovimiento(mov, index);
  });
  
  timeline.innerHTML = html;
}

function parsearMovimientos(texto) {
  if (!texto) return [];
  
  const movimientos = [];
  
  // Si el texto no tiene el formato nuevo (##), tratarlo como una sola observación
  if (!texto.includes('##')) {
    // Es una observación antigua, mostrarla como un solo movimiento
    const hoy = new Date().toLocaleDateString('es-AR');
    return [{
      fecha: hoy,
      texto: texto,
      usuario: 'Histórico',
      index: 0
    }];
  }
  
  const partes = texto.split('/').filter(p => p.trim() !== '');
  
  partes.forEach((parte, index) => {
    const datos = parte.split('##');
    movimientos.push({
      fecha: datos[0] || '-',
      texto: datos[1] || parte, // Si no hay texto, mostrar la parte completa
      usuario: datos[2] || 'Sistema',
      index: index
    });
  });
  
  // Ordenar por fecha descendente (más reciente primero)
  return movimientos.reverse();
}

function crearHtmlMovimiento(mov, index) {
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

// ==========================================
// NUEVO MOVIMIENTO
// ==========================================

function mostrarFormNuevo() {
  const form = document.getElementById('formNuevoMovimiento');
  const fechaEl = document.getElementById('fechaActual');
  const textarea = document.getElementById('textoNuevoMovimiento');
  
  if (form && fechaEl) {
    // Fecha automática - formato DD/MM/YYYY
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    const fechaFormateada = dia + '/' + mes + '/' + anio;
    
    fechaEl.textContent = fechaFormateada;
    
    // Limpiar textarea
    if (textarea) textarea.value = '';
    
    // Mostrar formulario
    form.classList.add('visible');
    if (textarea) textarea.focus();
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
  
  // Crear nuevo registro con formato correcto
  const nuevoRegistro = fecha + '##' + texto + '##' + usuario + '/';
  
  // Obtener valor actual (limpiar si es null o undefined)
  let valorActual = causaActualDetalle.observaciones_fusion || '';
  
  // Agregar nuevo registro
  const nuevoValor = valorActual + nuevoRegistro;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ observaciones_fusion: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    // Actualizar objeto local
    causaActualDetalle.observaciones_fusion = nuevoValor;
    
    // Ocultar formulario
    cancelarNuevo();
    
    // Recargar movimientos
    cargarMovimientos();
    
    showSuccess('Movimiento guardado correctamente');
    
  } catch (err) {
    console.error('Error al guardar:', err);
    showError('Error al guardar el movimiento: ' + err.message);
  }
}

function parsearMovimientos(texto) {
  if (!texto || texto.trim() === '') return [];
  
  const movimientos = [];
  
  // Si el texto no tiene el formato nuevo (##), tratarlo como observación antigua
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
  
  // Dividir por "/" para separar movimientos
  const partes = texto.split('/').filter(function(p) { return p.trim() !== ''; });
  
  partes.forEach(function(parte, index) {
    const datos = parte.split('##');
    movimientos.push({
      fecha: datos[0] || '-',
      texto: datos[1] || parte,
      usuario: datos[2] || 'Sistema',
      index: index
    });
  });
  
  // Ordenar por fecha descendente (más reciente primero)
  return movimientos.reverse();
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
  
  const fecha = fechaEl.textContent; // Ya está en formato DD/MM/YYYY
  const usuario = 'Lucia'; // Podés cambiar esto o hacerlo dinámico
  
  // Crear nuevo registro
  const nuevoRegistro = `${fecha}##${texto}##${usuario}`;
  
  // Obtener valor actual
  let valorActual = causaActualDetalle.observaciones_fusion || '';
  
  // Agregar nuevo registro al final
  const nuevoValor = valorActual ? `${valorActual}${nuevoRegistro}/` : `${nuevoRegistro}/`;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ observaciones_fusion: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    // Actualizar objeto local
    causaActualDetalle.observaciones_fusion = nuevoValor;
    
    // Ocultar formulario
    cancelarNuevo();
    
    // Recargar movimientos
    cargarMovimientos();
    
    showSuccess('Movimiento guardado correctamente');
    
  } catch (err) {
    console.error('Error al guardar:', err);
    showError('Error al guardar el movimiento: ' + err.message);
  }
}

// ==========================================
// EDITAR Y ELIMINAR MOVIMIENTOS
// ==========================================

function editarMovimiento(index) {
  const movimientoItem = document.querySelector(`.movimiento-item[data-index="${index}"]`);
  if (!movimientoItem) return;
  
  const textoDiv = movimientoItem.querySelector('.movimiento-texto');
  const accionesDiv = movimientoItem.querySelector('.movimiento-acciones');
  
  if (!textoDiv || !accionesDiv) return;
  
  const textoActual = textoDiv.textContent;
  
  // Reemplazar por textarea
  textoDiv.innerHTML = `<textarea class="movimiento-texto-edit" id="edit-mov-${index}">${textoActual}</textarea>`;
  
  // Cambiar botones
  accionesDiv.innerHTML = `
    <button class="btn-icono btn-guardar-edicion" onclick="guardarEdicionMovimiento(${index})" title="Guardar">💾</button>
    <button class="btn-icono btn-cancelar" onclick="cancelarEdicionMovimiento(${index}, '${textoActual.replace(/'/g, "\\'")}')" title="Cancelar">❌</button>
  `;
}

function cancelarEdicionMovimiento(index, textoOriginal) {
  cargarMovimientos(); // Recarga todo, más simple
}

async function guardarEdicionMovimiento(index) {
  const textarea = document.getElementById(`edit-mov-${index}`);
  if (!textarea || !causaActualDetalle) return;
  
  const nuevoTexto = textarea.value.trim();
  
  // Parsear movimientos actuales
  let observaciones = causaActualDetalle.observaciones_fusion || '';
  const movimientos = parsearMovimientos(observaciones);
  
  // Encontrar y actualizar el movimiento correcto
  // Como reverseamos en parsear, necesitamos encontrar el índice original
  const movimientoAEditar = movimientos.find(m => m.index === index);
  if (!movimientoAEditar) {
    showError('No se encontró el movimiento a editar');
    return;
  }
  
  movimientoAEditar.texto = nuevoTexto;
  
  // Reconstruir el string
  const nuevoValor = movimientos.reverse().map(m => `${m.fecha}##${m.texto}##${m.usuario}`).join('/') + '/';
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ observaciones_fusion: nuevoValor })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    // Actualizar objeto local
    causaActualDetalle.observaciones_fusion = nuevoValor;
    
    // Recargar
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
  
  // Parsear movimientos
  let observaciones = causaActualDetalle.observaciones_fusion || '';
  const movimientos = parsearMovimientos(observaciones);
  
  // Filtrar el que queremos eliminar
  const movimientosFiltrados = movimientos.filter(m => m.index !== index);
  
  if (movimientosFiltrados.length === movimientos.length) {
    showError('No se encontró el movimiento a eliminar');
    return;
  }
  
  // Reconstruir
  const nuevoValor = movimientosFiltrados.reverse().map(m => `${m.fecha}##${m.texto}##${m.usuario}`).join('/') + '/';
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .update({ observaciones_fusion: nuevoValor || null })
      .eq('id', causaActualDetalle.id);
    
    if (error) throw error;
    
    // Actualizar objeto local
    causaActualDetalle.observaciones_fusion = nuevoValor || null;
    
    // Recargar
    cargarMovimientos();
    
    showSuccess('Movimiento eliminado correctamente');
    
  } catch (err) {
    console.error('Error al eliminar:', err);
    showError('Error al eliminar el movimiento: ' + err.message);
  }
}

function cargarMasMovimientos() {
  movimientosMostrados += 5;
  cargarMovimientos();
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
  
  // Ocultar formulario si quedó abierto
  cancelarNuevo();
}

function editarDesdeDetalle() {
  if (!causaActualDetalle) return;
  const idGuardado = causaActualDetalle.id;
  
  // Cerrar modal detalle
  cerrarModalDetalle();
  
  // Abrir modal edición con delay
  setTimeout(() => {
    editarCausa(idGuardado);
  }, 300);
}

// ==========================================
// EDICIÓN DE CAUSA (ORIGINAL)
// ==========================================

function editarCausa(id) {
  const idNum = Number(id);
  const causa = causas.find(c => Number(c.id) === idNum);
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

document.addEventListener('DOMContentLoaded', () => {
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
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
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
