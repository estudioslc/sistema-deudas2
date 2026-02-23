// ==========================================
// SISTEMA LC - CONSULTA
// ==========================================

let causas = [];
let causaEditando = null;
let causaActualDetalle = null;

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

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').style.display = 'none';
  causaActualDetalle = null;
}

function editarDesdeDetalle() {
  if (!causaActualDetalle) return;
  const idGuardado = causaActualDetalle.id;
  
  // Cerrar modal detalle manualmente sin usar la función
  document.getElementById('modalDetalle').style.display = 'none';
  causaActualDetalle = null;
  
  // Abrir modal edición con delay suficiente
  setTimeout(() => {
    editarCausa(idGuardado);
  }, 300);
}

// ==========================================
// EDICIÓN
// ==========================================

function editarCausa(id) {
  // Convertir a número por si viene como string
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
    
    // Solo cerrar si el modal está visible Y se clickeó el fondo
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
