// ==========================================
// SISTEMA LC - CARGA MASIVA
// ==========================================

let datosExcel = [];
let columnasExcel = [];

// Mapeo de columnas esperadas
const MAPEO_COLUMNAS = {
  'expediente': ['expediente', 'exp', 'nro expediente', 'numero expediente'],
  'caratula': ['caratula', 'carátula', 'titulo', 'título'],
  'deudor': ['deudor', 'deudores', 'nombre', 'apellido'],
  'documento': ['documento', 'dni', 'cuit', 'cuil', 'cuit/cuil'],
  'monto': ['monto', 'capital', 'deuda', 'importe', 'total'],
  'estado': ['estado', 'situacion', 'situación', 'etapa'],
  'observaciones': ['observaciones', 'obs', 'notas', 'comentarios']
};

// ==========================================
// FUNCIONES DE EXCEL
// ==========================================

/**
 * Procesar archivo Excel seleccionado
 */
function procesarExcel() {
  const input = document.getElementById('archivoExcel');
  const infoDiv = document.getElementById('infoColumnas');
  const previewDiv = document.getElementById('previewDatos');
  const btnProcesar = document.getElementById('btnProcesar');
  
  if (!input.files || input.files.length === 0) {
    showError('Por favor selecciona un archivo Excel');
    return;
  }
  
  const file = input.files[0];
  const reader = new FileReader();
  
  showInfo('Leyendo archivo...');
  
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(primeraHoja, { header: 1 });
      
      if (jsonData.length < 2) {
        showError('El archivo parece estar vacío o no tiene el formato correcto');
        return;
      }
      
      // Primera fila = encabezados
      columnasExcel = jsonData[0].map(col => String(col).toLowerCase().trim());
      datosExcel = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
      
      // Mostrar columnas encontradas
      mostrarColumnasEncontradas(columnasExcel);
      
      // Mostrar preview
      mostrarPreview(datosExcel.slice(0, 10));
      
      // Habilitar botón
      if (btnProcesar) btnProcesar.disabled = false;
      
      showSuccess(`Archivo leído correctamente. ${datosExcel.length} registros encontrados.`);
      
    } catch (err) {
      console.error('Error al procesar Excel:', err);
      showError('Error al leer el archivo. Asegúrate de que sea un Excel válido.');
    }
  };
  
  reader.onerror = () => {
    showError('Error al leer el archivo');
  };
  
  reader.readAsArrayBuffer(file);
}

/**
 * Mostrar columnas encontradas
 */
function mostrarColumnasEncontradas(columnas) {
  const container = document.getElementById('infoColumnas');
  if (!container) return;
  
  const mapeo = detectarColumnas(columnas);
  
  let html = '<div class="columnas-encontradas">';
  html += '<strong>Columnas detectadas:</strong><br>';
  
  for (const [campo, columna] of Object.entries(mapeo)) {
    const estado = columna ? '✅' : '❌';
    html += `${estado} <strong>${campo}:</strong> ${columna || 'No detectado'}<br>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Detectar qué columnas corresponden a qué campos
 */
function detectarColumnas(columnas) {
  const mapeo = {};
  
  for (const [campo, posiblesNombres] of Object.entries(MAPEO_COLUMNAS)) {
    const columnaEncontrada = columnas.find(col => 
      posiblesNombres.some(nombre => col.includes(nombre))
    );
    mapeo[campo] = columnaEncontrada || null;
  }
  
  return mapeo;
}

/**
 * Mostrar preview de datos
 */
function mostrarPreview(datos) {
  const container = document.getElementById('previewDatos');
  if (!container) return;
  
  if (datos.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  let html = '<div class="preview"><table><thead><tr>';
  columnasExcel.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  datos.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${cell !== null && cell !== undefined ? cell : ''}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ==========================================
// CARGA A BASE DE DATOS
// ==========================================

/**
 * Cargar datos a Supabase
 */
async function cargarDatos() {
  if (datosExcel.length === 0) {
    showError('No hay datos para cargar');
    return;
  }
  
  const mapeo = detectarColumnas(columnasExcel);
  const btnCargar = document.getElementById('btnCargar');
  
  if (btnCargar) {
    btnCargar.disabled = true;
    btnCargar.innerHTML = '<span class="loading"></span> Cargando...';
  }
  
  showInfo(`Procesando ${datosExcel.length} registros...`);
  
  const exitosos = [];
  const fallidos = [];
  
  for (let i = 0; i < datosExcel.length; i++) {
    const row = datosExcel[i];
    const registro = construirRegistro(row, mapeo);
    
    try {
      const { error } = await supabaseClient
        .from('deudas')
        .insert([registro]);
      
      if (error) {
        fallidos.push({ fila: i + 2, error: error.message });
      } else {
        exitosos.push(i);
      }
    } catch (err) {
      fallidos.push({ fila: i + 2, error: err.message });
    }
    
    // Actualizar progreso cada 10 registros
    if ((i + 1) % 10 === 0) {
      showInfo(`Procesados ${i + 1} de ${datosExcel.length}... (${exitosos.length} exitosos)`);
    }
  }
  
  // Mostrar resultado
  mostrarResultadoCarga(exitosos.length, fallidos);
  
  if (btnCargar) {
    btnCargar.disabled = false;
    btnCargar.innerHTML = '📤 Cargar a Base de Datos';
  }
}

/**
 * Construir objeto registro desde fila de Excel
 */
function construirRegistro(row, mapeo) {
  const registro = {};
  
  // Mapear cada campo
  for (const [campo, columna] of Object.entries(mapeo)) {
    if (columna) {
      const indice = columnasExcel.indexOf(columna);
      if (indice !== -1) {
        let valor = row[indice];
        
        // Normalizar estado
        if (campo === 'estado' && valor) {
          valor = String(valor).toUpperCase().charAt(0);
          if (!['X', 'D', 'S', 'E', 'C', 'P', 'B'].includes(valor)) {
            valor = 'X'; // Default
          }
        }
        
        // Normalizar monto
        if (campo === 'monto' && valor) {
          valor = parseFloat(String(valor).replace(/[$,\s]/g, '')) || 0;
        }
        
        registro[campo] = valor;
      }
    }
  }
  
  // Valores por defecto
  if (!registro.estado) registro.estado = 'X';
  if (!registro.fecha_carga) registro.fecha_carga = new Date().toISOString();
  
  return registro;
}

/**
 * Mostrar resultado de la carga
 */
function mostrarResultadoCarga(exitosos, fallidos) {
  const container = document.getElementById('mensaje');
  if (!container) return;
  
  let html = '';
  
  if (exitosos > 0) {
    html += `<div class="exito">✅ ${exitosos} registros cargados exitosamente</div>`;
  }
  
  if (fallidos.length > 0) {
    html += `<div class="error">❌ ${fallidos.length} registros fallidos</div>`;
    html += '<details><summary>Ver detalles de errores</summary><ul>';
    fallidos.slice(0, 10).forEach(f => {
      html += `<li>Fila ${f.fila}: ${f.error}</li>`;
    });
    if (fallidos.length > 10) {
      html += `<li>... y ${fallidos.length - 10} errores más</li>`;
    }
    html += '</ul></details>';
  }
  
  container.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Configurar event listeners
  const inputExcel = document.getElementById('archivoExcel');
  if (inputExcel) {
    inputExcel.addEventListener('change', procesarExcel);
  }
});
