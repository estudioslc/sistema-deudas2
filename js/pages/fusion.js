// ==========================================
// SISTEMA DE FUSIÓN DE DATOS - VERSIÓN FINAL
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

    let dialogoAbierto = false;

    dropZone.addEventListener('click', function(e) {
        if (dialogoAbierto || e.target === fileInput) return;
        
        dialogoAbierto = true;

        // Cuando el foco vuelve a la ventana (diálogo cerrado), reseteamos el flag
        window.addEventListener('focus', function onFocus() {
            window.removeEventListener('focus', onFocus);
            setTimeout(() => {
                dialogoAbierto = false;
            }, 300);
        });

        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        dialogoAbierto = false;

        if (this.dataset.procesando === "true") return;

        if (e.target.files.length > 0) {
            this.dataset.procesando = "true";
            procesarArchivo(e.target.files[0]);

            setTimeout(() => {
                this.dataset.procesando = "false";
                this.value = '';
            }, 2000);
        }
    });
}
// ==========================================
// PROCESAR ARCHIVO - CORREGIDO (SIN DOBLE CLIC)
// ==========================================

function procesarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Selecciona un archivo Excel (.xlsx)');
        return;
    }

    const dropZone = document.getElementById('dropZone');
    
    // Crear overlay SIN destruir el input
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;z-index:10;';
    overlay.innerHTML = '<div style="color:#2563eb;font-weight:bold;font-size:1.2rem;">📊 Procesando archivo...</div>';
    
    dropZone.style.position = 'relative';
    dropZone.appendChild(overlay);

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            if (jsonData.length < 2) throw new Error('Archivo sin datos suficientes');

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

            if (datosTramites.length === 0) throw new Error('No se encontraron datos válidos');

            detectarColumnas(headers);
            
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('rowCount').textContent = datosTramites.length + ' registros';
            document.getElementById('fileInfo').classList.remove('hidden');

            // Quitar overlay (el input sigue funcionando)
            const loading = document.getElementById('loadingOverlay');
            if (loading) loading.remove();

            setTimeout(goToStep2, 300);

        } catch (error) {
            alert('Error: ' + error.message);
            const loading = document.getElementById('loadingOverlay');
            if (loading) loading.remove();
        }
    };
    
    reader.onerror = function() {
        alert('Error al leer el archivo');
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.remove();
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
            <li>• Total registros: <strong>${datosTramites.length}</strong></li>
            <li>• Campos a actualizar: <strong>${campos.join(', ') || 'Ninguno'}</strong></li>
            <li>• Modo de fusión: <strong>${config.modoFusion}</strong></li>
            <li>• Solo campos vacíos: <strong>${config.soloVacios ? 'Sí' : 'No'}</strong></li>
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
// BÚSQUEDA POR JUD_ID (IGNORA ESPACIOS)
// ==========================================

async function buscarPorJudId(judId) {
    const judLimpio = limpiarValor(judId);
    if (!judLimpio) return { data: null, error: 'Jud vacío' };

    // Buscar exacto
    let { data, error } = await supabaseClient
        .from('deudas')
        .select('*')
        .eq('jud_id', judLimpio);

    if (error) return { data: null, error };

    // Si no encuentra, probar con espacios
    if (!data || data.length === 0) {
        const variaciones = [' ' + judLimpio, judLimpio + ' ', ' ' + judLimpio + ' '];
        
        for (const variacion of variaciones) {
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
// SIMULACIÓN CON DETALLE DE CAMBIOS
// ==========================================

async function simularFusion() {
    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('🔍 SIMULACIÓN: Analizando cambios...');

    let encontrados = 0;
    let noEncontrados = 0;
    let conCambios = 0;

    const limite = Math.min(datosTramites.length, 100); // Limitar para no tardar mucho

    for (let i = 0; i < limite; i++) {
        const tramite = datosTramites[i];
        const judId = limpiarValor(tramite[columnasDetectadas.jud]);

        if (!judId) {
            resultadosFusion.push({ 
                judId: 'SIN_ID', 
                encontrado: false, 
                error: 'Sin Jud ID' 
            });
            noEncontrados++;
            continue;
        }

        try {
            const { data: municipales, error, variacionUsada } = await buscarPorJudId(judId);
            
            if (error) throw new Error(error);

            if (!municipales || municipales.length === 0) {
                resultadosFusion.push({ 
                    judId: judId, 
                    encontrado: false,
                    datosTramite: tramite
                });
                noEncontrados++;
                continue;
            }

            const registro = municipales[0];
            
            // Calcular qué cambios haría
            const cambiosPropuestos = calcularCambiosPropuestos(tramite, registro, config);
            
            if (cambiosPropuestos.length > 0) {
                conCambios++;
                resultadosFusion.push({ 
                    judId: judId, 
                    encontrado: true,
                    simulacion: true,
                    cambios: cambiosPropuestos,
                    expediente: registro.expediente,
                    variacion: variacionUsada
                });
                logProgress(`✏️ ${judId}: ${cambiosPropuestos.length} cambios propuestos`);
            } else {
                resultadosFusion.push({ 
                    judId: judId, 
                    encontrado: true,
                    simulacion: true,
                    sinCambios: true,
                    expediente: registro.expediente,
                    variacion: variacionUsada
                });
            }
            
            encontrados++;

        } catch (error) {
            resultadosFusion.push({ 
                judId: judId, 
                encontrado: false, 
                error: error.message 
            });
        }

        actualizarProgress(((i + 1) / limite) * 100);
    }

    mostrarResultadosSimulacion(encontrados, noEncontrados, conCambios);
    logProgress('✅ Simulación completada. Revisá los cambios propuestos antes de ejecutar.');
}

function calcularCambiosPropuestos(tramite, registro, config) {
    const cambios = [];
    const fecha = new Date().toISOString().split('T')[0];

    // Estado
    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const nuevoEstado = limpiarValor(tramite[columnasDetectadas.estadoletra])?.toUpperCase();
        const estadoActual = limpiarValor(registro.estado_fusion) || limpiarValor(registro.estado);
        
        if (nuevoEstado && ['X','D','S','E','C','P','B'].includes(nuevoEstado)) {
            if (!config.soloVacios || !estadoActual) {
                if (nuevoEstado !== estadoActual) {
                    cambios.push({
                        campo: 'Estado',
                        actual: estadoActual || '(vacío)',
                        nuevo: nuevoEstado
                    });
                }
            }
        }
    }

    // Teléfono
    if (config.updateTelefono && columnasDetectadas.telefono) {
        const nuevoTel = limpiarValor(tramite[columnasDetectadas.telefono]);
        const telActual = limpiarValor(registro.telefono_fusion);
        
        if (nuevoTel) {
            const telFusionado = fusionarTexto(telActual, nuevoTel, config.modoFusion);
            if (telFusionado !== telActual) {
                cambios.push({
                    campo: 'Teléfono',
                    actual: telActual || '(vacío)',
                    nuevo: telFusionado
                });
            }
        }
    }

    // Email
    if (config.updateEmail && columnasDetectadas.email) {
        const nuevoEmail = limpiarValor(tramite[columnasDetectadas.email]);
        const emailActual = limpiarValor(registro.email_fusion);
        
        if (nuevoEmail) {
            const emailFusionado = fusionarTexto(emailActual, nuevoEmail, config.modoFusion);
            if (emailFusionado !== emailActual) {
                cambios.push({
                    campo: 'Email',
                    actual: emailActual || '(vacío)',
                    nuevo: emailFusionado
                });
            }
        }
    }

    // Observaciones
    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const nuevaObs = limpiarValor(tramite[columnasDetectadas.observaciones]);
        const obsActual = limpiarValor(registro.observaciones_fusion);
        
        if (nuevaObs) {
            const obsCombinada = obsActual 
                ? `${obsActual} | [${fecha}] ${nuevaObs}`
                : `[${fecha}] ${nuevaObs}`;
                
            if (!config.soloVacios || !obsActual) {
                cambios.push({
                    campo: 'Observaciones',
                    actual: obsActual || '(vacío)',
                    nuevo: obsCombinada.substring(0, 50) + '...' // Truncar para no saturar
                });
            }
        }
    }

    // Expediente Judicial
    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const nuevoExpte = limpiarValor(tramite[columnasDetectadas.expteJudicial]);
        const expteActual = limpiarValor(registro.expte_judicial);
        
        if (nuevoExpte && (!config.soloVacios || !expteActual)) {
            if (nuevoExpte !== expteActual) {
                cambios.push({
                    campo: 'Expediente Judicial',
                    actual: expteActual || '(vacío)',
                    nuevo: nuevoExpte
                });
            }
        }
    }

    return cambios;
}

// ==========================================
// EJECUCIÓN REAL
// ==========================================

async function ejecutarFusion() {
    if (!confirm('¿Estás seguro de actualizar la base de datos?\n\nEsta acción modificará datos reales en Supabase.')) {
        return;
    }

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('Error: No hay conexión con Supabase');
        return;
    }

    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('💾 EJECUTANDO: Guardando cambios en Supabase...');

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
                variacion: variacionUsada
            });
            exitosos++;
            logProgress(`✅ Guardado: ${judId}`);

        } catch (error) {
            resultadosFusion.push({ judId: judId, error: error.message });
            errores++;
            logProgress(`❌ Error en ${judId}: ${error.message}`);
        }

        actualizarProgress(((i + 1) / datosTramites.length) * 100);
    }

    mostrarResultadosEjecucion(exitosos, noEncontrados, errores);
    logProgress('✅ Ejecución completada');
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
// MOSTRAR RESULTADOS
// ==========================================

function mostrarResultadosSimulacion(encontrados, noEncontrados, conCambios) {
    document.getElementById('progressArea').classList.add('hidden');
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.classList.remove('hidden');

    // Banner de simulación
    let html = `
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:1rem;margin-bottom:1rem;">
            <p style="font-weight:bold;color:#92400e;margin:0;">🔍 ESTO ES UNA SIMULACIÓN</p>
            <p style="color:#92400e;margin:0.5rem 0 0 0;">No se guardaron cambios. Para ejecutar de verdad, usá el botón verde "Ejecutar y guardar en Supabase"</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem;">
            <div style="background:#d1fae5;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#065f46;">${encontrados}</div>
                <div style="color:#065f46;font-size:0.875rem;">Encontrados</div>
            </div>
            <div style="background:#bfdbfe;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#1e40af;">${conCambios}</div>
                <div style="color:#1e40af;font-size:0.875rem;">Con cambios propuestos</div>
            </div>
            <div style="background:#fee2e2;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#991b1b;">${noEncontrados}</div>
                <div style="color:#991b1b;font-size:0.875rem;">No encontrados</div>
            </div>
        </div>
        <h4 style="font-weight:bold;margin-bottom:0.5rem;">Detalle de cambios propuestos:</h4>
        <div style="max-height:400px;overflow-y:auto;background:#f3f4f6;padding:1rem;border-radius:0.5rem;font-family:monospace;font-size:0.875rem;">
    `;

    resultadosFusion.forEach(r => {
        if (r.error) {
            html += `<div style="color:#dc2626;margin-bottom:0.5rem;">❌ ${r.judId}: ${r.error}</div>`;
        } else if (!r.encontrado) {
            html += `<div style="color:#d97706;margin-bottom:0.5rem;">⚠️ ${r.judId}: No encontrado en municipal</div>`;
        } else if (r.sinCambios) {
            html += `<div style="color:#6b7280;margin-bottom:0.5rem;">ℹ️ ${r.judId} (${r.expediente}): Sin cambios necesarios</div>`;
        } else if (r.cambios && r.cambios.length > 0) {
            html += `<div style="color:#059669;margin-bottom:0.5rem;border-bottom:1px solid #d1d5db;padding-bottom:0.5rem;">`;
            html += `<strong>✏️ ${r.judId} (${r.expediente})</strong><br>`;
            r.cambios.forEach(c => {
                html += `&nbsp;&nbsp;• <strong>${c.campo}:</strong><br>`;
                html += `&nbsp;&nbsp;&nbsp;&nbsp;Actual: "${c.actual}"<br>`;
                html += `&nbsp;&nbsp;&nbsp;&nbsp;Nuevo: "${c.nuevo}"<br>`;
            });
            html += `</div>`;
        }
    });

    html += `</div>`;
    
    // Botones
    html += `
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button onclick="descargarResultados()" style="background:#2563eb;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">📥 Descargar reporte</button>
            <button onclick="descargarNoEncontrados()" style="background:#d97706;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">⚠️ Descargar no encontrados</button>
            <button onclick="resetAll()" style="background:#6b7280;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">🔄 Nueva fusión</button>
        </div>
    `;

    resultadosArea.innerHTML = html;
}

function mostrarResultadosEjecucion(exitosos, noEncontrados, errores) {
    document.getElementById('progressArea').classList.add('hidden');
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.classList.remove('hidden');

    // Banner de éxito
    let html = `
        <div style="background:#d1fae5;border-left:4px solid #059669;padding:1rem;margin-bottom:1rem;">
            <p style="font-weight:bold;color:#065f46;margin:0;">✅ EJECUCIÓN COMPLETADA</p>
            <p style="color:#065f46;margin:0.5rem 0 0 0;">Los cambios se guardaron en Supabase</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem;">
            <div style="background:#d1fae5;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#065f46;">${exitosos}</div>
                <div style="color:#065f46;font-size:0.875rem;">Actualizados</div>
            </div>
            <div style="background:#fee2e2;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#991b1b;">${noEncontrados}</div>
                <div style="color:#991b1b;font-size:0.875rem;">No encontrados</div>
            </div>
            <div style="background:#fecaca;padding:1rem;text-align:center;border-radius:0.5rem;">
                <div style="font-size:1.5rem;font-weight:bold;color:#7f1d1d;">${errores}</div>
                <div style="color:#7f1d1d;font-size:0.875rem;">Errores</div>
            </div>
        </div>
        <h4 style="font-weight:bold;margin-bottom:0.5rem;">Resultados:</h4>
        <div style="max-height:400px;overflow-y:auto;background:#f3f4f6;padding:1rem;border-radius:0.5rem;font-family:monospace;font-size:0.875rem;">
    `;

    resultadosFusion.forEach(r => {
        if (r.error) {
            html += `<div style="color:#dc2626;margin-bottom:0.25rem;">❌ ${r.judId}: ${r.error}</div>`;
        } else if (!r.encontrado) {
            html += `<div style="color:#d97706;margin-bottom:0.25rem;">⚠️ ${r.judId}: No encontrado</div>`;
        } else if (!r.actualizado) {
            html += `<div style="color:#6b7280;margin-bottom:0.25rem;">ℹ️ ${r.judId} (${r.expediente}): Sin cambios</div>`;
        } else {
            html += `<div style="color:#059669;margin-bottom:0.25rem;">✅ ${r.judId} (${r.expediente}): Actualizado</div>`;
        }
    });

    html += `</div>`;
    
    // Botones
    html += `
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button onclick="descargarResultados()" style="background:#2563eb;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">📥 Descargar reporte</button>
            <button onclick="descargarNoEncontrados()" style="background:#d97706;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">⚠️ Descargar no encontrados</button>
            <button onclick="resetAll()" style="background:#6b7280;color:white;padding:0.5rem 1rem;border-radius:0.25rem;border:none;cursor:pointer;">🔄 Nueva fusión</button>
        </div>
    `;

    resultadosArea.innerHTML = html;
}

// ==========================================
// UI UTILIDADES
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

function descargarResultados() {
    if (resultadosFusion.length === 0) return;
    
    const data = resultadosFusion.map(r => ({
        'Jud ID': r.judId,
        'Encontrado': r.encontrado ? 'Sí' : 'No',
        'Actualizado': r.actualizado ? 'Sí' : (r.encontrado ? 'No necesario' : 'N/A'),
        'Cambios': r.cambios ? r.cambios.map(c => `${c.campo}: ${c.actual} → ${c.nuevo}`).join('; ') : '',
        'Error': r.error || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, `Fusion_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function descargarNoEncontrados() {
    const noEncontrados = resultadosFusion.filter(r => !r.encontrado);
    if (noEncontrados.length === 0) {
        alert('No hay registros no encontrados');
        return;
    }

    const data = noEncontrados.map(r => r.datosTramite || { Jud: r.judId });
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

// Exponer funciones globales
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.goToStep4 = goToStep4;
window.simularFusion = simularFusion;
window.ejecutarFusion = ejecutarFusion;
window.descargarResultados = descargarResultados;
window.descargarNoEncontrados = descargarNoEncontrados;
window.resetAll = resetAll;
