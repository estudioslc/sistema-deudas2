// ==========================================
// SISTEMA LC - JAVASCRIPT PRINCIPAL
// ==========================================

// Configuración de Supabase
const SUPABASE_CONFIG = {
  URL: 'https://jigyfagcxaifgdogaduf.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3lmYWdjeGFpZmdkb2dhZHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQ1NDcsImV4cCI6MjA4NzA3MDU0N30.zreu5LPBTgmITGiAGrwEAky6RvIaXjFr3E6sXcK0Olw'
};

// Inicializar cliente Supabase
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
    return supabaseClient;
  }
  console.error('Supabase library not loaded');
  return null;
}

// Nombres de estados
const NOMBRES_ESTADO = {
  'X': 'Extrajudicial',
  'D': 'Con Demanda',
  'S': 'Con Sentencia',
  'E': 'Ejecución',
  'C': 'Con Convenio',
  'P': 'Pagadas',
  'B': 'Baja'
};

// Orden de estados para mostrar
const ORDEN_ESTADOS = ['X', 'D', 'S', 'E', 'C', 'P', 'B'];

// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================

/**
 * Formatear número como moneda
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '$ 0,00';
  return '$ ' + Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
}

/**
 * Mostrar mensaje de éxito
 */
function showSuccess(message, containerId = 'mensaje') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="exito">${message}</div>`;
    container.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Mostrar mensaje de error
 */
function showError(message, containerId = 'mensaje') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error">${message}</div>`;
    container.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Mostrar mensaje informativo
 */
function showInfo(message, containerId = 'mensaje') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="info">${message}</div>`;
  }
}

/**
 * Mostrar loading
 */
function showLoading(containerId, text = 'Cargando...') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="stats-dashboard">
        <div class="stat-box total">
          <div class="loading"></div>
          <div class="cargando-texto">${text}</div>
        </div>
      </div>
    `;
  }
}

/**
 * Crear badge de estado
 */
function createEstadoBadge(estado) {
  const nombre = NOMBRES_ESTADO[estado] || 'Sin Estado';
  return `<span class="estado-badge estado-${estado}">${nombre} (${estado})</span>`;
}

// ==========================================
// FUNCIONES DE ESTADÍSTICAS
// ==========================================

/**
 * Contar causas por estado
 */
async function contarPorEstado() {
  if (!supabaseClient) initSupabase();
  
  try {
    // Obtener conteo total
    const { count: total, error: countError } = await supabaseClient
      .from('deudas')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Cargar estados en lotes
    let todosLosEstados = [];
    let desde = 0;
    const batchSize = 1000;
    let hayMas = true;
    
    while (hayMas && desde < 10000) {
      const { data, error } = await supabaseClient
        .from('deudas')
        .select('estado')
        .range(desde, desde + batchSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        todosLosEstados = todosLosEstados.concat(data);
        if (data.length < batchSize) {
          hayMas = false;
        } else {
          desde += batchSize;
        }
      } else {
        hayMas = false;
      }
    }
    
    // Contar por estado
    const porEstado = {};
    todosLosEstados.forEach(d => {
      const est = d.estado || 'Sin';
      porEstado[est] = (porEstado[est] || 0) + 1;
    });
    
    return { total: total || todosLosEstados.length, porEstado };
  } catch (err) {
    console.error('Error al contar causas:', err);
    throw err;
  }
}

/**
 * Generar HTML de estadísticas
 */
function renderStatsDashboard({ total, porEstado }, containerId = 'statsContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = '';
  
  // Total
  html += `
    <a href="consulta.html?filtro=todos" class="stat-box total">
      <div class="stat-number">${total}</div>
      <div class="stat-label">TOTAL CAUSAS (todas las categorías)<br><small>Click para ver todas</small></div>
    </a>
  `;
  
  // Por estado
  ORDEN_ESTADOS.forEach(est => {
    if (porEstado[est]) {
      const nombre = NOMBRES_ESTADO[est];
      const esBaja = est === 'B';
      html += `
        <a href="consulta.html?filtro=${est}" class="stat-box ${esBaja ? 'baja' : ''}">
          <div class="stat-number">${porEstado[est]}</div>
          <div class="stat-label">${nombre} (${est})<br><small>Click para ver</small></div>
        </a>
      `;
    }
  });
  
  container.innerHTML = `<div class="stats-dashboard">${html}</div>`;
}

/**
 * Cargar y mostrar estadísticas
 */
async function cargarEstadisticas(containerId = 'statsContainer') {
  showLoading(containerId, 'Contando causas...');
  
  try {
    const data = await contarPorEstado();
    renderStatsDashboard(data, containerId);
  } catch (err) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="stats-dashboard">
          <div class="stat-box total" style="background: #dc3545;">
            <div class="stat-number">Error</div>
            <div class="stat-label">No se pudieron cargar las estadísticas</div>
          </div>
        </div>
      `;
    }
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
});
