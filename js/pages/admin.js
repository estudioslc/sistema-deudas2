// ==========================================
// SISTEMA LC - ADMINISTRACIÓN
// ==========================================

// ==========================================
// EXPORTAR DATOS
// ==========================================

/**
 * Exportar todas las causas a Excel
 */
async function exportarExcel() {
  const btn = document.getElementById('btnExportar');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Exportando...';
  }
  
  showInfo('Obteniendo datos de la base de datos...');
  
  try {
    // Obtener todas las causas
    let todasLasCausas = [];
    let desde = 0;
    const batchSize = 1000;
    let hayMas = true;
    
    while (hayMas && desde < 50000) {
      const { data, error } = await supabaseClient
        .from('deudas')
        .select('*')
        .order('fecha_carga', { ascending: false })
        .range(desde, desde + batchSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        todasLasCausas = todasLasCausas.concat(data);
        if (data.length < batchSize) {
          hayMas = false;
        } else {
          desde += batchSize;
        }
      } else {
        hayMas = false;
      }
    }
    
    if (todasLasCausas.length === 0) {
      showError('No hay datos para exportar');
      return;
    }
    
    // Preparar datos para Excel
    const datosExcel = todasLasCausas.map(c => ({
      'Expediente': c.expediente || '',
      'Carátula': c.caratula || '',
      'Deudor': c.deudor || '',
      'Documento': c.documento || '',
      'Monto': c.monto || 0,
      'Estado': c.estado || '',
      'Observaciones': c.observaciones || '',
      'Fecha Carga': c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : '',
      'Fecha Actualización': c.fecha_actualizacion ? new Date(c.fecha_actualizacion).toLocaleDateString('es-AR') : ''
    }));
    
    // Crear libro Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Causas');
    
    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SistemaLC_Causas_${fecha}.xlsx`);
    
    showSuccess(`Exportadas ${todasLasCausas.length} causas correctamente`);
    
  } catch (err) {
    console.error('Error al exportar:', err);
    showError('Error al exportar los datos');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '📥 Exportar a Excel';
    }
  }
}

/**
 * Exportar causas por estado
 */
async function exportarPorEstado(estado) {
  const btn = document.getElementById(`btnExportar${estado}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span>';
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('deudas')
      .select('*')
      .eq('estado', estado)
      .order('fecha_carga', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      showError(`No hay causas en estado ${NOMBRES_ESTADO[estado]}`);
      return;
    }
    
    // Preparar datos
    const datosExcel = data.map(c => ({
      'Expediente': c.expediente || '',
      'Carátula': c.caratula || '',
      'Deudor': c.deudor || '',
      'Documento': c.documento || '',
      'Monto': c.monto || 0,
      'Observaciones': c.observaciones || '',
      'Fecha Carga': c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : ''
    }));
    
    // Crear y descargar Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, NOMBRES_ESTADO[estado]);
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SistemaLC_${NOMBRES_ESTADO[estado]}_${fecha}.xlsx`);
    
    showSuccess(`Exportadas ${data.length} causas de ${NOMBRES_ESTADO[estado]}`);
    
  } catch (err) {
    console.error('Error al exportar:', err);
    showError('Error al exportar');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `📥 ${NOMBRES_ESTADO[estado]}`;
    }
  }
}

// ==========================================
// ESTADÍSTICAS DETALLADAS
// ==========================================

/**
 * Cargar estadísticas detalladas
 */
async function cargarEstadisticasDetalladas() {
  const container = document.getElementById('estadisticas');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const { total, porEstado } = await contarPorEstado();
    
    // Calcular montos por estado
    const montosPorEstado = await calcularMontosPorEstado();
    
    let html = '<div class="stats">';
    
    // Total
    html += `
      <div class="stat-box">
        <div class="stat-number">${total}</div>
        <div class="stat-label">Total Causas</div>
      </div>
    `;
    
    // Por estado con montos
    ORDEN_ESTADOS.forEach(est => {
      if (porEstado[est]) {
        html += `
          <div class="stat-box">
            <div class="stat-number">${porEstado[est]}</div>
            <div class="stat-label">${NOMBRES_ESTADO[est]}</div>
            ${montosPorEstado[est] ? `<small>${formatCurrency(montosPorEstado[est])}</small>` : ''}
          </div>
        `;
      }
    });
    
    html += '</div>';
    container.innerHTML = html;
    
  } catch (err) {
    console.error('Error al cargar estadísticas:', err);
    container.innerHTML = '<div class="error">Error al cargar estadísticas</div>';
  }
}

/**
 * Calcular montos totales por estado
 */
async function calcularMontosPorEstado() {
  const montos = {};
  
  try {
    for (const estado of ORDEN_ESTADOS) {
      const { data, error } = await supabaseClient
        .from('deudas')
        .select('monto')
        .eq('estado', estado);
      
      if (!error && data) {
        montos[estado] = data.reduce((sum, c) => sum + (c.monto || 0), 0);
      }
    }
  } catch (err) {
    console.error('Error al calcular montos:', err);
  }
  
  return montos;
}

// ==========================================
// LIMPIAR DATOS
// ==========================================

/**
 * Limpiar datos de prueba (estado X con monto 0)
 */
async function limpiarDatosPrueba() {
  if (!confirm('¿Eliminar todas las causas de prueba (estado X con monto 0)?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('deudas')
      .delete()
      .eq('estado', 'X')
      .eq('monto', 0);
    
    if (error) throw error;
    
    showSuccess('Datos de prueba eliminados');
    cargarEstadisticasDetalladas();
    
  } catch (err) {
    console.error('Error al limpiar:', err);
    showError('Error al eliminar datos de prueba');
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  cargarEstadisticasDetalladas();
});
