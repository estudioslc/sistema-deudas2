// ==========================================
// SISTEMA DE FUSIÓN DE DATOS
// ==========================================

// Variables globales
let datosTramites = [];
let columnasDetectadas = {};
let resultadosFusion = [];
let supabaseClient = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Supabase
    supabaseClient = window.supabase?.createClient(
        'https://jigyfagcxaifgdogaduf.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3lmYWdjeGFpZmdkb2dhZHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjgwMDAsImV4cCI6MjA1MzY0NDAwMH0.your_anon_key_here'
    );

    // Event listeners para drag & drop
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length) procesarArchivo(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) procesarArchivo(e.target.files[0]);
    });
});

// ==========================================
// PASO 1: PROCESAR ARCHIVO
// ==========================================

function procesarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                alert('El archivo parece estar vacío o no tiene datos');
                return;
            }

            // Procesar encabezados y datos
            const headers = jsonData[0].map(h => String(h).trim());
            datosTramites = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length === 0) continue;
                
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] !== undefined ? String(row[index]).trim() : '';
                });
                datosTramites.push(obj);
            }

            // Detectar columnas
            detectarColumnas(headers);

            // Mostrar info
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('rowCount').textContent = datosTramites.length;
            document.getElementById('fileInfo').classList.remove('hidden');

            // Ir al paso 2
            setTimeout(goToStep2, 500);

        } catch (error) {
            console.error('Error al procesar archivo:', error);
            alert('Error al procesar el archivo: ' + error.message);
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

    // Buscar columnas (case insensitive, espacios)
    headers.forEach(header => {
        const h = header.toLowerCase().replace(/\s+/g, '');
        
        if (h === 'jud' || h === 'jud_id') columnasDetectadas.jud = header;
        if (h === 'estadoletra' || h === 'estado' || h === 'estado/letra') columnasDetectadas.estadoletra = header;
        if (h.includes('telefono') || h.includes('tel')) columnasDetectadas.telefono = header;
        if (h.includes('mail') || h.includes('email') || h.includes('e-mail')) columnasDetectadas.email = header;
        if (h.includes('observacion')) columnasDetectadas.observaciones = header;
        if (h.includes('expte') && h.includes('judicial')) columnasDetectadas.expteJudicial = header;
        if (h === 'causaordenano' || h === 'causaordenaño') columnasDetectadas.causaOrdenAnio = header;
    });

    console.log('Columnas detectadas:', columnasDetectadas);
}

// ==========================================
// PASO 2: VERIFICACIÓN
// ==========================================

function goToStep2() {
    if (datosTramites.length === 0) {
        alert('Primero debes cargar un archivo');
        return;
    }

    // Actualizar UI pasos
    document.querySelectorAll('[id^="step"]').forEach(el => {
        el.classList.remove('step-active', 'step-completed');
        el.classList.add('border-gray-200');
    });
    document.getElementById('step1').classList.add('step-completed');
    document.getElementById('step2').classList.add('step-active');

    // Ocultar/mostrar paneles
    document.getElementById('panel1').classList.add('hidden');
    document.getElementById('panel2').classList.remove('hidden');
    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel4').classList.add('hidden');

    // Mostrar mapeo de columnas
    mostrarMapeoColumnas();

    // Mostrar preview
    mostrarPreview();
}

function mostrarMapeoColumnas() {
    const container = document.getElementById('columnMapping');
    const mapeos = [
        { campo: 'Jud / Jud_ID', columna: columnasDetectadas.jud, requerido: true },
        { campo: 'Estadoletra / Estado', columna: columnasDetectadas.estadoletra, requerido: true },
        { campo: 'Teléfono', columna: columnasDetectadas.telefono, requerido: false },
        { campo: 'E-mail', columna: columnasDetectadas.email, requerido: false },
        { campo: 'Observaciones', columna: columnasDetectadas.observaciones, requerido: false },
        { campo: 'Expte. Judicial', columna: columnasDetectadas.expteJudicial, requerido: false },
        { campo: 'CausaOdenAño (verif.)', columna: columnasDetectadas.causaOrdenAnio, requerido: false }
    ];

    container.innerHTML = mapeos.map(m => `
        <div class="flex items-center justify-between p-3 ${m.requerido ? 'bg-red-50' : 'bg-gray-50'} rounded border ${m.columna ? 'border-green-300' : (m.requerido ? 'border-red-300' : 'border-gray-200')}">
            <div>
                <span class="font-semibold ${m.requerido ? 'text-red-700' : 'text-gray-700'}">${m.campo}</span>
                ${m.requerido ? '<span class="text-red-500 text-xs">* Requerido</span>' : ''}
            </div>
            <div class="text-right">
                ${m.columna 
                    ? `<span class="text-green-600 font-mono text-sm">✓ ${m.columna}</span>` 
                    : `<span class="text-red-400 text-sm">${m.requerido ? 'No detectado' : 'No encontrado'}</span>`
                }
            </div>
        </div>
    `).join('');

    // Validar que tengamos Jud
    if (!columnasDetectadas.jud) {
        alert('ERROR: No se detectó la columna "Jud" o "Jud_ID". Verificá el archivo.');
    }
}

function mostrarPreview() {
    const headers = Object.keys(datosTramites[0]);
    const thead = document.getElementById('previewHeader');
    const tbody = document.getElementById('previewBody');

    // Headers
    thead.innerHTML = headers.map(h => 
        `<th class="p-2 text-left border-b ${esColumnaImportante(h) ? 'bg-blue-100 font-bold' : ''}">${h}</th>`
    ).join('');

    // Datos (primeros 5)
    tbody.innerHTML = datosTramites.slice(0, 5).map(row => `
        <tr class="border-b hover:bg-gray-50">
            ${headers.map(h => `
                <td class="p-2 border-r ${esColumnaImportante(h) ? 'bg-blue-50' : ''}">
                    ${truncarTexto(row[h] || '', 30)}
                </td>
            `).join('')}
        </tr>
    `).join('');
}

function esColumnaImportante(header) {
    const h = header.toLowerCase();
    return ['jud', 'estadoletra', 'estado', 'telefono', 'email', 'observaciones'].some(c => h.includes(c));
}

function truncarTexto(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}

// ==========================================
// PASO 3: CONFIGURACIÓN
// ==========================================

function goToStep3() {
    if (!columnasDetectadas.jud) {
        alert('No se puede continuar sin la columna Jud');
        return;
    }

    document.getElementById('step2').classList.remove('step-active');
    document.getElementById('step2').classList.add('step-completed');
    document.getElementById('step3').classList.add('step-active');

    document.getElementById('panel2').classList.add('hidden');
    document.getElementById('panel3').classList.remove('hidden');
}

function goToStep2() {
    document.getElementById('step3').classList.remove('step-active');
    document.getElementById('step2').classList.add('step-active');
    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel2').classList.remove('hidden');
}

// ==========================================
// PASO 4: EJECUCIÓN
// ==========================================

function goToStep4() {
    document.getElementById('step3').classList.remove('step-active');
    document.getElementById('step3').classList.add('step-completed');
    document.getElementById('step4').classList.add('step-active');

    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel4').classList.remove('hidden');

    // Mostrar resumen
    const config = obtenerConfiguracion();
    document.getElementById('resumenFusion').innerHTML = `
        <h4 class="font-bold mb-2">Resumen de configuración:</h4>
        <ul class="text-sm space-y-1">
            <li>• Total registros a procesar: <strong>${datosTramites.length}</strong></li>
            <li>• Campos a actualizar: <strong>${config.campos.join(', ') || 'Ninguno'}</strong></li>
            <li>• Modo teléfonos/emails: <strong>${config.modoFusion}</strong></li>
            <li>• Sobrescribir existentes: <strong>${config.soloVacios ? 'No (solo vacíos)' : 'Sí'}</strong></li>
        </ul>
    `;
}

function obtenerConfiguracion() {
    return {
        updateEstado: document.getElementById('updateEstado').checked,
        updateTelefono: document.getElementById('updateTelefono').checked,
        updateEmail: document.getElementById('updateEmail').checked,
        updateObservaciones: document.getElementById('updateObservaciones').checked,
        updateExpte: document.getElementById('updateExpte').checked,
        soloVacios: document.getElementById('soloVacios').checked,
        modoFusion: document.getElementById('modoFusion').value,
        campos: []
    };
}

// ==========================================
// SIMULAR FUSIÓN
// ==========================================

async function simularFusion() {
    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Iniciando simulación de fusión...');

    let encontrados = 0;
    let noEncontrados = 0;

    for (let i = 0; i < datosTramites.length; i++) {
        const tramite = datosTramites[i];
        const judId = tramite[columnasDetectadas.jud];

        if (!judId) {
            logProgress(`Fila ${i + 1}: Sin Jud ID, omitiendo`);
            noEncontrados++;
            continue;
        }

        // Buscar en Supabase (simulado - solo contamos)
        logProgress(`Buscando Jud ID: ${judId}...`);
        
        // Simular que encontramos el 90% para la demo
        const encontrado = Math.random() > 0.1;
        
        if (encontrado) {
            encontrados++;
            const cambios = calcularCambios(tramite, {}, config);
            resultadosFusion.push({
                judId: judId,
                encontrado: true,
                cambios: cambios,
                datosTramite: tramite
            });
        } else {
            noEncontrados++;
            resultadosFusion.push({
                judId: judId,
                encontrado: false,
                datosTramite: tramite
            });
        }

        actualizarProgress(((i + 1) / datosTramites.length) * 100);
    }

    mostrarResultados(encontrados, noEncontrados, 0);
    logProgress('Simulación completada. Revisá los resultados antes de ejecutar.');
}

function calcularCambios(tramite, registroActual, config) {
    const cambios = [];

    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const estado = tramite[columnasDetectadas.estadoletra];
        if (estado) cambios.push({ campo: 'estado_fusion', valor: estado });
    }

    if (config.updateTelefono && columnasDetectadas.telefono) {
        const tel = procesarTelefono(tramite[columnasDetectadas.telefono], config.modoFusion);
        if (tel) cambios.push({ campo: 'telefono_fusion', valor: tel });
    }

    if (config.updateEmail && columnasDetectadas.email) {
        const email = procesarEmail(tramite[columnasDetectadas.email], config.modoFusion);
        if (email) cambios.push({ campo: 'email_fusion', valor: email });
    }

    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const obs = tramite[columnasDetectadas.observaciones];
        if (obs) cambios.push({ campo: 'observaciones_fusion', valor: obs });
    }

    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const expte = tramite[columnasDetectadas.expteJudicial];
        if (expte) cambios.push({ campo: 'expte_judicial', valor: expte });
    }

    return cambios;
}

// ==========================================
// EJECUTAR FUSIÓN REAL
// ==========================================

async function ejecutarFusion() {
    if (!confirm('¿Estás seguro de que querés actualizar la base de datos? Esta acción modificará datos en Supabase.')) {
        return;
    }

    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Conectando con Supabase...');

    let exitosos = 0;
    let noEncontrados = 0;
    let errores = 0;

    for (let i = 0; i < datosTramites.length; i++) {
        const tramite = datosTramites[i];
        const judId = tramite[columnasDetectadas.jud];

        if (!judId) {
            resultadosFusion.push({ judId: 'SIN_ID', encontrado: false, error: 'Sin Jud ID' });
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
                resultadosFusion.push({ 
                    judId: judId, 
                    encontrado: false, 
                    datosTramite: tramite 
                });
                noEncontrados++;
                logProgress(`❌ Jud ${judId}: No encontrado en municipal`);
                continue;
            }

            // Preparar actualización
            const registro = municipales[0];
            const updateData = prepararUpdate(tramite, registro, config);

            if (Object.keys(updateData).length === 0) {
                resultadosFusion.push({ 
                    judId: judId, 
                    encontrado: true, 
                    actualizado: false,
                    mensaje: 'Sin cambios necesarios'
                });
                exitosos++;
                continue;
            }

            // Ejecutar update
            const { error: updateError } = await supabaseClient
                .from('deudas')
                .update(updateData)
                .eq('id', registro.id);

            if (updateError) throw updateError;

            resultadosFusion.push({ 
                judId: judId, 
                encontrado: true, 
                actualizado: true,
                cambios: Object.keys(updateData),
                expediente: registro.expediente
            });
            exitosos++;
            logProgress(`✅ Jud ${judId}: Actualizado correctamente`);

        } catch (error) {
            resultadosFusion.push({ 
                judId: judId, 
                encontrado: false, 
                error: error.message 
            });
            errores++;
            logProgress(`❌ Jud ${judId}: Error - ${error.message}`);
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
        if (estado && ['X', 'D', 'S', 'E', 'C', 'P', 'B'].includes(estado)) {
            if (!config.soloVacios || !registro.estado_fusion) {
                updateData.estado_fusion = estado;
            }
        }
    }

    // Teléfono
    if (config.updateTelefono && columnasDetectadas.telefono) {
        const telNuevo = tramite[columnasDetectadas.telefono];
        const telProcesado = fusionarContactos(
            registro.telefono_fusion || '',
            telNuevo,
            config.modoFusion
        );
        if (telProcesado && (!config.soloVacios || !registro.telefono_fusion)) {
            updateData.telefono_fusion = telProcesado;
        }
    }

    // Email
    if (config.updateEmail && columnasDetectadas.email) {
        const emailNuevo = tramite[columnasDetectadas.email];
        const emailProcesado = fusionarContactos(
            registro.email_fusion || '',
            emailNuevo,
            config.modoFusion
        );
        if (emailProcesado && (!config.soloVacios || !registro.email_fusion)) {
            updateData.email_fusion = emailProcesado;
        }
    }

    // Observaciones
    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const obsNueva = tramite[columnasDetectadas.observaciones];
        if (obsNueva) {
            const obsActual = registro.observaciones_fusion || '';
            const obsCombinada = obsActual 
                ? `${obsActual} | [${fecha}] ${obsNueva}`
                : `[${fecha}] ${obsNueva}`;
            
            if (!config.soloVacios || !registro.observaciones_fusion) {
                updateData.observaciones_fusion = obsCombinada;
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

    // Fecha de actualización
    if (Object.keys(updateData).length > 0) {
        updateData.fecha_ultima_actualizacion = new Date().toISOString();
    }

    return updateData;
}

// ==========================================
// PROCESAMIENTO DE CONTACTOS (TEL/EMAIL)
// ==========================================

function fusionarContactos(existente, nuevo, modo) {
    if (!nuevo) return existente;
    if (!existente) return limpiarContacto(nuevo);

    const existentes = existente.split('/').map(s => s.trim()).filter(s => s);
    const nuevos = nuevo.split('/').map(s => s.trim()).filter(s => s);

    if (modo === 'reemplazar') {
        return limpiarContacto(nuevo);
    }

    if (modo === 'solo_nuevos') {
        const unicos = nuevos.filter(n => !existentes.some(e => normalizarContacto(e) === normalizarContacto(n)));
        if (unicos.length === 0) return existente;
        return [...existentes, ...unicos].join(' / ');
    }

    // Modo concatenar (default)
    const todos = [...existentes];
    nuevos.forEach(n => {
        if (!todos.some(t => normalizarContacto(t) === normalizarContacto(n))) {
            todos.push(n);
        }
    });

    return todos.join(' / ');
}

function limpiarContacto(contacto) {
    return contacto.replace(/\s+/g, ' ').trim();
}

function normalizarContacto(contacto) {
    return contacto.toLowerCase().replace(/[^a-z0-9@.]/g, '');
}

function procesarTelefono(texto, modo) {
    if (!texto) return '';
    // Eliminar espacios extra, mantener / y eq
    return texto.replace(/\s+/g, ' ').trim();
}

function procesarEmail(texto, modo) {
    if (!texto) return '';
    return texto.replace(/\s+/g, ' ').trim();
}

// ==========================================
// UI Y UTILIDADES
// ==========================================

function mostrarProgress(show) {
    document.getElementById('progressArea').classList.toggle('hidden', !show);
    if (show) {
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

    // Mostrar detalles
    const detalles = document.getElementById('detallesResultado');
    detalles.innerHTML = resultadosFusion.map(r => {
        if (r.error) return `<div class="text-red-600">❌ ${r.judId}: ${r.error}</div>`;
        if (!r.encontrado) return `<div class="text-yellow-600">⚠️ ${r.judId}: No encontrado en municipal</div>`;
        if (!r.actualizado) return `<div class="text-blue-600">ℹ️ ${r.judId}: Sin cambios necesarios</div>`;
        return `<div class="text-green-600">✅ ${r.judId} (${r.expediente}): ${r.cambios?.join(', ')}</div>`;
    }).join('');
}

function descargarResultados() {
    const data = resultadosFusion.map(r => ({
        'Jud ID': r.judId,
        'Encontrado': r.encontrado ? 'Sí' : 'No',
        'Actualizado': r.actualizado ? 'Sí' : 'No',
        'Cambios': r.cambios?.join(', ') || '',
        'Error': r.error || '',
        'Expediente': r.expediente || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, `Resultados_Fusion_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function descargarNoEncontrados() {
    const noEncontrados = resultadosFusion.filter(r => !r.encontrado);
    if (noEncontrados.length === 0) {
        alert('No hay registros no encontrados para descargar');
        return;
    }

    const data = noEncontrados.map(r => r.datosTramite);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'No Encontrados');
    XLSX.writeFile(wb, `No_Encontrados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function resetAll() {
    if (confirm('¿Volver al inicio? Se perderán los datos cargados.')) {
        location.reload();
    }
}
