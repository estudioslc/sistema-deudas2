// ==========================================
// SISTEMA LC - CONSULTA
// ==========================================

let causas = [];
let causaEditando = null;
let causaActualDetalle = null;

// ==========================================
// CARGAR CAUSAS
// ==========================================

/**
 * Cargar causas desde Supabase
 */
async function cargarCausas(filtro = null) {
  const container = document.getElementById('resultados');
  if (!container) return;
    if (!supabaseClient) initSupabase();
  
  showLoading('resultados', 'Cargando causas...');
  
  try {
    // Verificar conexión primero
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

/**
 * Mostrar causas en tabla
 */
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

/**
 * Buscar causas
 */
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

/**
 * Abrir modal con detalle completo de la causa
 */
function verDetalle(id) {
  const causa = causas.find(c => c.id === id);
  if (!causa) return;
  
  causaActualDetalle = causa;
  
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
    { label: 'Domicilio', valor: causa.domicilio_postal },
    { label: 'Observaciones', valor: causa.observaciones || causa.observaciones_fusion },
    { label: 'Expediente Judicial', valor: causa.expte_judicial },
    { label: 'Dominio/Objeto', valor: causa.dominio_objeto || causa.identificador },
    { label: 'Infracción', valor: causa.infraccion },
    { label: 'Fecha Infracción', valor: causa.fch_infrac },
    { label: 'Vehículo', valor: causa.vehiculo },
    { label: 'Creado', valor: causa.created_at ? new Date(causa.created_at).toLocaleString() : '-' },
    { label: 'Última Actualización', valor: causa.fecha_ultima_actualizacion ? new Date(causa.fecha_ultima_actualizacion).toLocaleString() : '-' }
  ];
  
  let html = '<div class="detalle-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
  
  campos.forEach(campo => {
    if (campo.valor) {
      html += `
        <div style="padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <div style="font-size: 12px; color: #666; text-transform: uppercase;">${campo.label}</div>
          <div style="font-weight: bold; color: #333;">${campo.valor}</div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  
  document.getElementById('detalleContenido').innerHTML = html;
  document.getElementById('modalDetalle').style.display = 'block';
}

/**
 * Cerrar modal de detalle
 */
function cerrarModalDetalle() {
  document.getElementById('modalDetalle').style.display = 'none';
  causaActualDetalle = null;
}

/**
 * Editar desde el modal de detalle
 */
function editarDesdeDetalle() {
  if (!causaActualDetalle) return;
  
  cerrarModalDetalle();
  editarCausa(causaActualDetalle.id);
}

// ==========================================
// EDICIÓN
// ==========================================

/**
 * Abrir modal para editar causa
 */
function editarCausa(id) {
  const causa = causas.find(c => c.id === id);
  if (!causa) return;
  
  causaEditando = causa;
  
  // Llenar formulario
  document.getElementById('editId').value = causa.id;
  document.getElementById('editExpediente').value = causa.expediente || '';
  document.getElementById('editCaratula').value = causa.caratula || '';
  document.getElementById('editDeudor').value = causa.deudor || '';
  document.getElementById('editDocumento').value = causa.documento || '';
  document.getElementById('editMonto').value = causa.monto || '';
  document.getElementById('editEstado').value = causa.estado || 'X';
  document.getElementById('editObservaciones').value = causa.observaciones || '';
  
  // Mostrar modal
  document.getElementById('modalEdicion').style.display = 'block';
}

/**
 * Guardar cambios de edición
 */
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

/**
 * Cerrar modal
 */
function cerrarModal() {
  document.getElementById('modalEdicion').style.display = 'none';
  causaEditando = null;
}

// ==========================================
// ELIMINACIÓN
// ==========================================

/**
 * Eliminar causa
 */
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

/**
 * Filtrar por estado
 */
function filtrarPorEstado(estado) {
  if (!supabaseClient) initSupabase();
  cargarCausas(estado);
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si hay filtro en URL
  const params = new URLSearchParams(window.location.search);
  const filtro = params.get('filtro');
  
  // Cargar causas
  cargarCausas(filtro);
  
  // Configurar búsqueda
  const inputBusqueda = document.getElementById('busqueda');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', debounce(buscarCausas, 300));
  }
  
  // Cerrar modal al hacer click fuera
  window.onclick = function(event) {
    const modalEdicion = document.getElementById('modalEdicion');
    const modalDetalle = document.getElementById('modalDetalle');
    if (event.target === modalEdicion) {
      cerrarModal();
    }
    if (event.target === modalDetalle) {
      cerrarModalDetalle();
    }
  };
});

/**
 * Debounce para búsqueda
 */
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

/**
 * Limpiar TODAS las causas de Supabase
 */
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
