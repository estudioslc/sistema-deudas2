// ==========================================
// SISTEMA LC - CONSULTA Y EDICIÓN
// ==========================================

let causas = [];
let causaEditando = null;

// ==========================================
// CARGAR CAUSAS
// ==========================================

/**
 * Cargar causas desde Supabase
 */
async function cargarCausas(filtro = null) {
  const container = document.getElementById('resultados');;
  if (!container) return;
  
  showLoading('resultados', 'Cargando causas...');
  
  try {
    let query = supabaseClient
      .from('deudas')
      .select('*')
      .order('fecha_carga', { ascending: false });
    
    // Aplicar filtro si existe
    if (filtro && filtro !== 'todos') {
      query = query.eq('estado', filtro);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    causas = data || [];
    mostrarCausas(causas);
    
  } catch (err) {
    console.error('Error al cargar causas:', err);
    container.innerHTML = '<div class="error">Error al cargar las causas</div>';
  }
}

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
            <th>Expediente</th>
            <th>Carátula</th>
            <th>Deudor</th>
            <th>Documento</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  lista.forEach(causa => {
    html += `
      <tr>
        <td>${causa.expediente || '-'}</td>
        <td>${causa.caratula || '-'}</td>
        <td>${causa.deudor || '-'}</td>
        <td>${causa.documento || '-'}</td>
        <td>${formatCurrency(causa.monto)}</td>
        <td>${createEstadoBadge(causa.estado)}</td>
        <td>
          <button onclick="editarCausa(${causa.id})" class="btn btn-sm btn-primario">✏️</button>
          <button onclick="eliminarCausa(${causa.id})" class="btn btn-sm btn-peligro">🗑️</button>
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
    (c.expediente && String(c.expediente).toLowerCase().includes(termino)) ||
    (c.caratula && String(c.caratula).toLowerCase().includes(termino)) ||
    (c.deudor && String(c.deudor).toLowerCase().includes(termino)) ||
    (c.documento && String(c.documento).toLowerCase().includes(termino))
  );
  
  mostrarCausas(filtradas);
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
    const modal = document.getElementById('modalEdicion');
    if (event.target === modal) {
      cerrarModal();
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
      .neq('id', 0); // Elimina todos los registros
    
    if (error) throw error;
    
    showSuccess('Todas las causas han sido eliminadas');
    causas = [];
    mostrarCausas([]);
    
  } catch (err) {
    console.error('Error al limpiar:', err);
    showError('Error al eliminar las causas: ' + err.message);
  }
}
