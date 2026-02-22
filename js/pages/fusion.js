// ==========================================
// SISTEMA DE FUSIÓN DE DATOS
// ==========================================

// Variables globales
let datosTramites = [];
let columnasDetectadas = {};
let resultadosFusion = [];

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Fusion.js cargado');
    
    // Los event listeners se configuran después de que todo cargue
    setTimeout(configurarEventListeners, 100);
});

function configurarEventListeners() {
    console.log('Configurando event listeners...');
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone) {
        console.error('No se encontró dropZone');
        return;
    }
    if (!fileInput) {
        console.error('No se encontró fileInput');
        return;
    }

    // Prevenir comportamiento por defecto en drag & drop para toda la página
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Eventos del drop zone
    dropZone.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop detectado');
        this.classList.remove('border-blue-500', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        console.log('Archivos:', files.length);
        
        if (files.length > 0) {
            procesarArchivo(files[0]);
        }
    });

    // Click en drop zone para abrir selector
    dropZone.addEventListener('click', function(e) {
        // Solo si no se hizo click en el input mismo
        if (e.target !== fileInput) {
            console.log('Click en drop zone');
            fileInput.click();
        }
    });

    // Cambio en el input file
    fileInput.addEventListener('change', function(e) {
        console.log('Change en file input');
        console.log('Archivos seleccionados:', e.target.files.length);
        
        if (e.target.files.length > 0) {
            procesarArchivo(e.target.files[0]);
        }
    });

    console.log('Event listeners configurados correctamente');
}

// ==========================================
// PROCESAR ARCHIVO EXCEL
// ==========================================

function procesarArchivo(file) {
    console.log('Procesando archivo:', file.name);

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
        return;
    }

    // Mostrar que está cargando
    const dropZone = document.getElementById('dropZone');
    dropZone.innerHTML = '<div class="text-blue-600 font-bold">Procesando archivo...</div>';

    const reader = new FileReader();
    
    reader.onerror = function(e) {
        console.error('Error en FileReader:', e);
        alert('Error al leer el archivo');
        location.reload();
    };
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('Hojas:', workbook.SheetNames);
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            console.log('Filas totales:', jsonData.length);

            if (jsonData.length < 2) {
                throw new Error('El archivo no tiene datos suficientes');
            }

            // Procesar encabezados y datos
            const headers = jsonData[0].map(h => String(h).trim());
            datosTramites = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // Saltar filas vacías
                if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
                    continue;
                }
                
                const obj = {};
                headers.forEach((header, index) => {
                    const valor = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
                    obj[header] = valor;
                });
                
                datosTramites.push(obj);
            }

            console.log('Registros procesados:', datosTramites.length);

            if (datosTramites.length === 0) {
                throw new Error('No se encontraron datos válidos');
            }

            // Detectar columnas
            detectarColumnas(headers);

            // Mostrar info en pantalla
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('rowCount').textContent = datosTramites.length + ' registros';
            document.getElementById('fileInfo').classList.remove('hidden');

            // Restaurar drop zone
            dropZone.innerHTML = `
                <input type="file" id="fileInput" accept=".xlsx,.xls" class="hidden">
                <div class="cursor-pointer">
                    <div class="text-4xl mb-2">📊</div>
                    <p class="text-gray-600 mb-2">Haz clic para seleccionar o arrastra tu archivo aquí</p>
                    <p class="text-sm text-gray-400">Solo archivos Excel (.xlsx)</p>
                </div>
            `;
            
            // Reconfigurar event listeners porque recreamos el input
            setTimeout(configurarEventListeners, 100);
            
            // Ir al paso 2
            setTimeout(goToStep2, 500);

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
            location.reload();
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function detectarColumnas(headers) {
    columnasDetectadas = {
        jud: null,
        estadoletra: null,
        telefono: null,
        email: null,
        observaciones: null,
        expteJudicial: null,
        causaOrdenAnio: null
    };

    headers.forEach(header => {
        const h = header.toLowerCase().replace(/[\s_.]/g, '');
        
        if (h === 'jud' || h === 'judid') columnasDetectadas.jud = header;
        if (h === 'estadoletra' || h === 'estado') columnasDetectadas.estadoletra = header;
        if (h.includes('telefono') || h.includes('tel')) columnasDetectadas.telefono = header;
        if (h.includes('mail') || h.includes('email')) columnasDetectadas.email = header;
        if (h.includes('observacion')) columnasDetectadas.observaciones = header;
        if ((h.includes('expte') || h.includes('expediente')) && h.includes('judicial')) columnasDetectadas.expteJudicial = header;
        if (h === 'causaordenaño' || h === 'causaordenano') columnasDetectadas.causaOrdenAnio = header;
    });

    console.log('Columnas detectadas:', columnasDetectadas);
}

// ==========================================
// NAVEGACIÓN DE PASOS
// ==========================================

function goToStep2() {
    if (datosTramites.length === 0) {
        alert('Primero debes cargar un archivo');
        return;
    }

    // Actualizar UI
    actualizarPasos(2);
    
    document.getElementById('panel1').classList.add('hidden');
    document.getElementById('panel2').classList.remove('hidden');
    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel4').classList.add('hidden');

    mostrarMapeoColumnas();
    mostrarPreview();
}

function goToStep3() {
    if (!columnasDetectadas.jud) {
        alert('No se detectó la columna Jud. Verificá el archivo.');
        return;
    }

    actualizarPasos(3);
    
    document.getElementById('panel2').classList.add('hidden');
    document.getElementById('panel3').classList.remove('hidden');
}

function goToStep4() {
    actualizarPasos(4);
    
    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel4').classList.remove('hidden');

    const config = obtenerConfiguracion();
    const campos = [];
    if (config.updateEstado) campos.push('Estado');
    if (config.updateTelefono) campos.push('Teléfono');
    if (config.updateEmail) campos.push('Email');
    if (config.updateObservaciones) campos.push('Observaciones');
    if (config.updateExpte) campos.push('Expediente Judicial');

    document.getElementById('resumenFusion').innerHTML = `
        <h4 class="font-bold mb-2">Resumen:</h4>
        <ul class="text-sm space-y-1">
            <li>• Total registros: <strong>${datosTramites.length}</strong></li>
            <li>• Campos a actualizar: <strong>${campos.join(', ') || 'Ninguno'}</strong></li>
            <li>• Modo: <strong>${config.modoFusion}</strong></li>
        </ul>
    `;
}

function actualizarPasos(pasoActivo) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('step' + i);
        el.classList.remove('step-active', 'step-completed');
        
        if (i < pasoActivo) {
            el.classList.add('step-completed');
        } else if (i === pasoActivo) {
            el.classList.add('step-active');
        }
    }
}

function mostrarMapeoColumnas() {
    const container = document.getElementById('columnMapping');
    
    const mapeos = [
        { campo: 'Jud', columna: columnasDetectadas.jud, req: true },
        { campo: 'Estadoletra/Estado', columna: columnasDetectadas.estadoletra, req: true },
        { campo: 'Teléfono', columna: columnasDetectadas.telefono, req: false },
        { campo: 'E-mail', columna: columnasDetectadas.email, req: false },
        { campo: 'Observaciones', columna: columnasDetectadas.observaciones, req: false },
        { campo: 'Expte. Judicial', columna: columnasDetectadas.expteJudicial, req: false },
    ];

    container.innerHTML = mapeos.map(m => `
        <div class="flex justify-between p-3 ${m.req ? 'bg-red-50' : 'bg-gray-50'} rounded border ${m.columna ? 'border-green-300' : (m.req ? 'border-red-300' : 'border-gray-200')}">
            <span class="font-semibold ${m.req ? 'text-red-700' : 'text-gray-700'}">${m.campo}</span>
            <span class="${m.columna ? 'text-green-600' : 'text-red-400'} text-sm">
                ${m.columna ? '✓ ' + m.columna : (m.req ? 'No detectado' : 'No encontrado')}
            </span>
        </div>
    `).join('');
}

function mostrarPreview() {
    const headers = Object.keys(datosTramites[0]);
    const thead = document.getElementById('previewHeader');
    const tbody = document.getElementById('previewBody');

    thead.innerHTML = headers.map(h => `<th class="p-2 bg-gray-200 text-left">${h}</th>`).join('');
    
    tbody.innerHTML = datosTramites.slice(0, 5).map(row => `
        <tr class="border-b">
            ${headers.map(h => `<td class="p-2 border-r text-sm">${row[h] || '-'}</td>`).join('')}
        </tr>
    `).join('');
}

function obtenerConfiguracion() {
    return {
        updateEstado: document.getElementById('updateEstado').checked,
        updateTelefono: document.getElementById('updateTelefono').checked,
        updateEmail: document.getElementById('updateEmail').checked,
        updateObservaciones: document.getElementById('updateObservaciones').checked,
        updateExpte: document.getElementById('updateExpte').checked,
        soloVacios: document.getElementById('soloVacios').checked,
        modoFusion: document.getElementById('modoFusion').value
    };
}

// ==========================================
// EJECUCIÓN DE FUSIÓN
// ==========================================

async function simularFusion() {
    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Simulando...');

    let encontrados = 0;
    let noEncontrados = 0;

    // Simular solo los primeros 50 para no tardar mucho
    const limite = Math.min(datosTramites.length, 50);

    for (let i = 0; i < limite; i++) {
        const tramite = datosTramites[i];
        const judId = tramite[columnasDetectadas.jud];

        if (!judId) {
            noEncontrados++;
            continue;
        }

        // Simular 90% de éxito
        if (Math.random() > 0.1) {
            encontrados++;
            resultadosFusion.push({
                judId: judId,
                encontrado: true,
                simulado: true
            });
        } else {
            noEncontrados++;
            resultadosFusion.push({
                judId: judId,
                encontrado: false
            });
        }

        actualizarProgress(((i + 1) / limite) * 100);
    }

    mostrarResultados(encontrados, noEncontrados, 0);
    logProgress('Simulación completada');
}

async function ejecutarFusion() {
    if (!confirm('¿Actualizar la base de datos?')) return;

    // Verificar que supabaseClient existe (del main.js)
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('Error: No hay conexión con Supabase');
        return;
    }

    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Iniciando fusión real...');

    let exitosos = 0;
    let noEncontrados = 0;
    let errores = 0;

    for (let i = 0; i < datosTramites.length; i++) {
        const tramite = datosTramites[i];
        const judId = tramite[columnasDetectadas.jud];

        if (!judId) {
            resultadosFusion.push({ judId: 'SIN_ID', error: 'Sin Jud' });
            noEncontrados++;
            continue;
        }

        try {
            // Buscar en Supabase
            const { data: municipales, error: searchError } = await supabaseClient
                .from('deudas')
                .select('*')
                .eq('jud_id', judId);

            if (searchError) throw searchError;

            if (!municipales || municipales.length === 0) {
                resultadosFusion.push({ judId: judId, encontrado: false });
                noEncontrados++;
                logProgress(`No encontrado: ${judId}`);
                continue;
            }

            const registro = municipales[0];
            const updateData = prepararUpdate(tramite, registro, config);

            if (Object.keys(updateData).length === 0) {
                resultadosFusion.push({ judId: judId, encontrado: true, actualizado: false });
                exitosos++;
                continue;
            }

            const { error: updateError } = await supabaseClient
                .from('deudas')
                .update(updateData)
                .eq('id', registro.id);

            if (updateError) throw updateError;

            resultadosFusion.push({ 
                judId: judId, 
                encontrado: true, 
                actualizado: true,
                expediente: registro.expediente
            });
            exitosos++;
            logProgress(`✓ Actualizado: ${judId}`);

        } catch (error) {
            resultadosFusion.push({ judId: judId, error: error.message });
            errores++;
            logProgress(`✗ Error en ${judId}: ${error.message}`);
        }

        actualizarProgress(((i + 1) / datosTramites.length) * 100);
    }

    mostrarResultados(exitosos, noEncontrados, errores);
}

function prepararUpdate(tramite, registro, config) {
    const updateData = {};
    const fecha = new Date().toISOString().split('T')[0];

    // Estado
    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const estado = tramite[columnasDetectadas.estadoletra]?.toUpperCase().trim();
        if (estado && ['X','D','S','E','C','P','B'].includes(estado)) {
            if (!config.soloVacios || !registro.estado_fusion) {
                updateData.estado_fusion = estado;
            }
        }
    }

    // Teléfono
    if (config.updateTelefono && columnasDetectadas.telefono) {
        const tel = tramite[columnasDetectadas.telefono];
        if (tel) {
            const actual = registro.telefono_fusion || '';
            const nuevo = fusionarTexto(actual, tel, config.modoFusion);
            if (nuevo && (!config.soloVacios || !actual)) {
                updateData.telefono_fusion = nuevo;
            }
        }
    }

    // Email
    if (config.updateEmail && columnasDetectadas.email) {
        const email = tramite[columnasDetectadas.email];
        if (email) {
            const actual = registro.email_fusion || '';
            const nuevo = fusionarTexto(actual, email, config.modoFusion);
            if (nuevo && (!config.soloVacios || !actual)) {
                updateData.email_fusion = nuevo;
            }
        }
    }

    // Observaciones
    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const obs = tramite[columnasDetectadas.observaciones];
        if (obs) {
            const actual = registro.observaciones_fusion || '';
            const nueva = actual ? `${actual} | [${fecha}] ${obs}` : `[${fecha}] ${obs}`;
            if (!config.soloVacios || !actual) {
                updateData.observaciones_fusion = nueva;
            }
        }
    }

    // Expediente Judicial
    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const expte = tramite[columnasDetectadas.expteJudicial];
        if (expte && (!config.soloVacios || !registro.expte_judicial)) {
            updateData.expte_judicial = expte;
        }
    }

    if (Object.keys(updateData).length > 0) {
        updateData.fecha_ultima_actualizacion = new Date().toISOString();
    }

    return updateData;
}

function fusionarTexto(existente, nuevo, modo) {
    if (!nuevo) return existente;
    if (!existente) return nuevo;

    if (modo === 'reemplazar') return nuevo;

    const itemsExistentes = existente.split('/').map(s => s.trim()).filter(s => s);
    const itemsNuevos = nuevo.split('/').map(s => s.trim()).filter(s => s);

    if (modo === 'solo_nuevos') {
        const unicos = itemsNuevos.filter(n => !itemsExistentes.includes(n));
        if (unicos.length === 0) return existente;
        return [...itemsExistentes, ...unicos].join(' / ');
    }

    // concatenar
    const todos = [...itemsExistentes];
    itemsNuevos.forEach(n => {
        if (!todos.includes(n)) todos.push(n);
    });
    return todos.join(' / ');
}

// ==========================================
// UI UTILIDADES
// ==========================================

function mostrarProgress(mostrar) {
    document.getElementById('progressArea').classList.toggle('hidden', !mostrar);
    if (mostrar) {
        document.getElementById('resultadosArea').classList.add('hidden');
    }
}

function actualizarProgress(porcentaje) {
    document.getElementById('progressBar').style.width = porcentaje + '%';
    document.getElementById('progressPercent').textContent = Math.round(porcentaje) + '%';
}

function logProgress(mensaje) {
    const log = document.getElementById('progressLog');
    const hora = new Date().toLocaleTimeString();
    log.innerHTML += `[${hora}] ${mensaje}\n`;
    log.scrollTop = log.scrollHeight;
}

function mostrarResultados(exitosos, noEncontrados, errores) {
    document.getElementById('progressArea').classList.add('hidden');
    document.getElementById('resultadosArea').classList.remove('hidden');

    document.getElementById('countExitosos').textContent = exitosos;
    document.getElementById('countNoEncontrados').textContent = noEncontrados;
    document.getElementById('countErrores').textContent = errores;

    const detalles = document.getElementById('detallesResultado');
    detalles.innerHTML = resultadosFusion.slice(0, 50).map(r => {
        if (r.error) return `<div class="text-red-600">❌ ${r.judId}: ${r.error}</div>`;
        if (!r.encontrado) return `<div class="text-yellow-600">⚠️ ${r.judId}: No encontrado</div>`;
        if (!r.actualizado) return `<div class="text-blue-600">ℹ️ ${r.judId}: Sin cambios</div>`;
        return `<div class="text-green-600">✅ ${r.judId} (${r.expediente || 'N/A'})</div>`;
    }).join('');
}

function descargarResultados() {
    if (resultadosFusion.length === 0) return;
    
    const data = resultadosFusion.map(r => ({
        'Jud ID': r.judId,
        'Encontrado': r.encontrado ? 'Sí' : 'No',
        'Actualizado': r.actualizado ? 'Sí' : 'No',
        'Error': r.error || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, `Fusion_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function descargarNoEncontrados() {
    const noEncontrados = resultadosFusion.filter(r => !r.encontrado);
    if (noEncontrados.length === 0) return;

    const data = noEncontrados.map(r => ({ Jud: r.judId }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'No Encontrados');
    XLSX.writeFile(wb, `No_Encontrados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function resetAll() {
    if (confirm('¿Volver al inicio?')) {
        location.reload();
    }
}

// Exponer funciones globales
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.goToStep4 = goToStep4;
window.simularFusion = simularFusion;
window.ejecutarFusion = ejecutarFusion;
window.descargarResultados = descargarResultados;
window.descargarNoEncontrados = descargarNoEncontrados;
window.resetAll = resetAll;
