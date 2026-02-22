// ==========================================
// SISTEMA DE FUSIÓN DE DATOS - CORREGIDO
// ==========================================

let datosTramites = [];
let columnasDetectadas = {};
let resultadosFusion = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fusion.js cargado');
    setTimeout(configurarEventListeners, 100);
});

function configurarEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) {
        console.error('No se encontraron elementos');
        return;
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', function(e) {
        e.preventDefault();
        this.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) procesarArchivo(files[0]);
    });

    dropZone.addEventListener('click', function(e) {
        if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) procesarArchivo(e.target.files[0]);
    });
}

// ==========================================
// PROCESAR ARCHIVO
// ==========================================

function procesarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Selecciona un archivo Excel (.xlsx)');
        return;
    }

    const dropZone = document.getElementById('dropZone');
    dropZone.innerHTML = '<div class="text-blue-600 font-bold">Procesando...</div>';

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            if (jsonData.length < 2) throw new Error('Archivo sin datos');

            const headers = jsonData[0].map(h => String(h).trim());
            datosTramites = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.every(cell => !cell || String(cell).trim() === '')) continue;
                
                const obj = {};
                headers.forEach((header, index) => {
                    const valor = row[index] !== undefined ? String(row[index]).trim() : '';
                    obj[header] = valor;
                });
                datosTramites.push(obj);
            }

            detectarColumnas(headers);
            
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('rowCount').textContent = datosTramites.length + ' registros';
            document.getElementById('fileInfo').classList.remove('hidden');

            dropZone.innerHTML = `
                <input type="file" id="fileInput" accept=".xlsx,.xls" class="hidden">
                <div class="cursor-pointer">
                    <div class="text-4xl mb-2">📊</div>
                    <p class="text-gray-600">Haz clic o arrastra archivo aquí</p>
                </div>
            `;
            setTimeout(configurarEventListeners, 100);
            setTimeout(goToStep2, 500);

        } catch (error) {
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
        if (h.includes('expte') && h.includes('judicial')) columnasDetectadas.expteJudicial = header;
        if (h === 'causaordenaño' || h === 'causaordenano') columnasDetectadas.causaOrdenAnio = header;
    });

    console.log('Columnas detectadas:', columnasDetectadas);
}

// ==========================================
// NAVEGACIÓN
// ==========================================

function goToStep2() {
    if (datosTramites.length === 0) {
        alert('Primero carga un archivo');
        return;
    }

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
        alert('No se detectó columna Jud');
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
    if (config.updateExpte) campos.push('Expediente');

    document.getElementById('resumenFusion').innerHTML = `
        <h4 class="font-bold mb-2">Resumen:</h4>
        <ul class="text-sm space-y-1">
            <li>• Total: <strong>${datosTramites.length}</strong></li>
            <li>• Campos: <strong>${campos.join(', ')}</strong></li>
            <li>• Modo: <strong>${config.modoFusion}</strong></li>
        </ul>
    `;
}

function actualizarPasos(pasoActivo) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('step' + i);
        el.classList.remove('step-active', 'step-completed');
        if (i < pasoActivo) el.classList.add('step-completed');
        else if (i === pasoActivo) el.classList.add('step-active');
    }
}

function mostrarMapeoColumnas() {
    const container = document.getElementById('columnMapping');
    const mapeos = [
        { campo: 'Jud', columna: columnasDetectadas.jud, req: true },
        { campo: 'Estadoletra', columna: columnasDetectadas.estadoletra, req: true },
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

    thead.innerHTML = headers.map(h => `<th class="p-2 bg-gray-200 text-left text-sm">${h}</th>`).join('');
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
// FUNCIONES DE LIMPIEZA Y NORMALIZACIÓN
// ==========================================

function limpiarValor(valor) {
    if (!valor || valor === '-' || valor.trim() === '-') return '';
    return valor.trim();
}

function normalizarContacto(contacto) {
    if (!contacto) return '';
    return contacto.toLowerCase()
        .replace(/eq/g, '')
        .replace(/[\s\-\/\.]/g, '')
        .replace(/[^a-z0-9@]/g, '');
}

function contactoExiste(lista, nuevo) {
    const nuevoNormalizado = normalizarContacto(nuevo);
    if (!nuevoNormalizado) return false;
    return lista.some(existente => normalizarContacto(existente) === nuevoNormalizado);
}

function fusionarTexto(existente, nuevo, modo) {
    const existenteLimpio = limpiarValor(existente);
    const nuevoLimpio = limpiarValor(nuevo);
    
    if (!nuevoLimpio) return existenteLimpio;
    if (!existenteLimpio) return nuevoLimpio;
    if (modo === 'reemplazar') return nuevoLimpio;

    const itemsExistentes = existenteLimpio.split('/').map(s => s.trim()).filter(s => s);
    const itemsNuevos = nuevoLimpio.split('/').map(s => s.trim()).filter(s => s);

    if (modo === 'solo_nuevos') {
        const unicos = itemsNuevos.filter(n => !contactoExiste(itemsExistentes, n));
        if (unicos.length === 0) return existenteLimpio;
        return [...itemsExistentes, ...unicos].join(' / ');
    }

    const resultado = [...itemsExistentes];
    itemsNuevos.forEach(nuevoItem => {
        if (!contactoExiste(resultado, nuevoItem)) {
            resultado.push(nuevoItem);
        }
    });
    
    return resultado.join(' / ');
}

// ==========================================
// BÚSQUEDA POR JUD_ID CON TRIM (IGNORA ESPACIOS)
// ==========================================

async function buscarPorJudId(judId) {
    const judLimpio = limpiarValor(judId);
    if (!judLimpio) return { data: null, error: 'Jud vacío' };

    // Estrategia 1: Buscar exacto
    let { data, error } = await supabaseClient
        .from('deudas')
        .select('*')
        .eq('jud_id', judLimpio);

    if (error) return { data: null, error };

    // Si no encuentra, probar con espacios comunes
    if (!data || data.length === 0) {
        const variaciones = [
            ' ' + judLimpio,           // espacio al inicio
            judLimpio + ' ',           // espacio al final
            ' ' + judLimpio + ' ',     // espacios en ambos lados
            judLimpio.replace(/\s/g, '') // sin espacios internos
        ];

        for (const variacion of variaciones) {
            if (variacion === judLimpio) continue;
            
            const resultado = await supabaseClient
                .from('deudas')
                .select('*')
                .eq('jud_id', variacion);
            
            if (resultado.data && resultado.data.length > 0) {
                return { data: resultado.data, error: null, variacionUsada: variacion };
            }
        }
    }

    return { data, error };
}

// ==========================================
// EJECUCIÓN
// ==========================================

async function simularFusion() {
    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Simulando...');

    let encontrados = 0;
    let noEncontrados = 0;

    const limite = Math.min(datosTramites.length, 50);

    for (let i = 0; i < limite; i++) {
        const tramite = datosTramites[i];
        const judId = limpiarValor(tramite[columnasDetectadas.jud]);

        if (!judId) {
            noEncontrados++;
            continue;
        }

        const { data, error, variacionUsada } = await buscarPorJudId(judId);
        
        if (data && data.length > 0) {
            encontrados++;
            resultadosFusion.push({ 
                judId: judId, 
                encontrado: true, 
                simulado: true,
                variacion: variacionUsada || 'exacto'
            });
        } else {
            noEncontrados++;
            resultadosFusion.push({ judId: judId, encontrado: false });
        }

        actualizarProgress(((i + 1) / limite) * 100);
    }

    mostrarResultados(encontrados, noEncontrados, 0);
    logProgress('Simulación completada');
}

async function ejecutarFusion() {
    if (!confirm('¿Actualizar la base de datos?')) return;

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('Error: No hay conexión con Supabase');
        return;
    }

    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Iniciando fusión...');

    let exitosos = 0;
    let noEncontrados = 0;
    let errores = 0;

    for (let i = 0; i < datosTramites.length; i++) {
        const tramite = datosTramites[i];
        const judId = limpiarValor(tramite[columnasDetectadas.jud]);

        if (!judId) {
            resultadosFusion.push({ judId: 'SIN_ID', error: 'Sin Jud' });
            noEncontrados++;
            continue;
        }

        try {
            logProgress(`Buscando Jud ${judId}...`);
            
            const { data: municipales, error, variacionUsada } = await buscarPorJudId(judId);

            if (error) throw new Error(error);

            if (!municipales || municipales.length === 0) {
                resultadosFusion.push({ judId: judId, encontrado: false });
                noEncontrados++;
                logProgress(`⚠️ No encontrado: ${judId}`);
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
                expediente: registro.expediente,
                variacion: variacionUsada || 'exacto'
            });
            exitosos++;
            logProgress(`✅ Actualizado: ${judId}${variacionUsada ? ' (con espacio)' : ''}`);

        } catch (error) {
            resultadosFusion.push({ judId: judId, error: error.message });
            errores++;
            logProgress(`❌ Error en ${judId}: ${error.message}`);
        }

        actualizarProgress(((i + 1) / datosTramites.length) * 100);
    }

    mostrarResultados(exitosos, noEncontrados, errores);
}

function prepararUpdate(tramite, registro, config) {
    const updateData = {};
    const fecha = new Date().toISOString().split('T')[0];

    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const estado = limpiarValor(tramite[columnasDetectadas.estadoletra])?.toUpperCase();
        if (estado && ['X','D','S','E','C','P','B'].includes(estado)) {
            const actual = limpiarValor(registro.estado_fusion);
            if (!config.soloVacios || !actual) {
                updateData.estado_fusion = estado;
            }
        }
    }

    if (config.updateTelefono && columnasDetectadas.telefono) {
        const tel = limpiarValor(tramite[columnasDetectadas.telefono]);
        if (tel) {
            const actual = limpiarValor(registro.telefono_fusion);
            const nuevo = fusionarTexto(actual, tel, config.modoFusion);
            if (nuevo && (!config.soloVacios || !actual)) {
                updateData.telefono_fusion = nuevo;
            }
        }
    }

    if (config.updateEmail && columnasDetectadas.email) {
        const email = limpiarValor(tramite[columnasDetectadas.email]);
        if (email) {
            const actual = limpiarValor(registro.email_fusion);
            const nuevo = fusionarTexto(actual, email, config.modoFusion);
            if (nuevo && (!config.soloVacios || !actual)) {
                updateData.email_fusion = nuevo;
            }
        }
    }

    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const obs = limpiarValor(tramite[columnasDetectadas.observaciones]);
        if (obs) {
            const actual = limpiarValor(registro.observaciones_fusion);
            const nueva = actual ? `${actual} | [${fecha}] ${obs}` : `[${fecha}] ${obs}`;
            if (!config.soloVacios || !actual) {
                updateData.observaciones_fusion = nueva;
            }
        }
    }

    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const expte = limpiarValor(tramite[columnasDetectadas.expteJudicial]);
        if (expte) {
            const actual = limpiarValor(registro.expte_judicial);
            if (!config.soloVacios || !actual) {
                updateData.expte_judicial = expte;
            }
        }
    }

    if (Object.keys(updateData).length > 0) {
        updateData.fecha_ultima_actualizacion = new Date().toISOString();
    }

    return updateData;
}

// ==========================================
// UI
// ==========================================

function mostrarProgress(mostrar) {
    document.getElementById('progressArea').classList.toggle('hidden', !mostrar);
    if (mostrar) document.getElementById('resultadosArea').classList.add('hidden');
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
        const variacion = r.variacion && r.variacion !== 'exacto' ? ` <span class="text-xs text-gray-500">(${r.variacion})</span>` : '';
        return `<div class="text-green-600">✅ ${r.judId} (${r.expediente || 'N/A'})${variacion}</div>`;
    }).join('');
}

function descargarResultados() {
    if (resultadosFusion.length === 0) return;
    const data = resultadosFusion.map(r => ({
        'Jud ID': r.judId,
        'Encontrado': r.encontrado ? 'Sí' : 'No',
        'Actualizado': r.actualizado ? 'Sí' : 'No',
        'Variación': r.variacion || '',
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
    if (confirm('¿Volver al inicio?')) location.reload();
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
