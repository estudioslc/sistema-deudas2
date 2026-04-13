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
// PROCESAR ARCHIVO
// ==========================================

function procesarArchivo(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Selecciona un archivo Excel (.xlsx)');
        return;
    }

    const dropZone = document.getElementById('dropZone');
    
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
        // ⚠️ CORREGIDO: "Observaciones" de DDT → obs_propia en Supabase (NO obs_muni)
        observaciones: null,
        expteJudicial: null,
        causaOrdenAnio: null,
        cuit: null,
        contribuyente: null
    };

    headers.forEach(header => {
        const h = header.toLowerCase().replace(/[\s_.]/g, '');
        
        if (h === 'jud' || h === 'judid') columnasDetectadas.jud = header;
        if (h === 'estadoletra' || h === 'estado') columnasDetectadas.estadoletra = header;
        if (h.includes('telefono') || h.includes('tel')) columnasDetectadas.telefono = header;
        if (h.includes('mail') || h.includes('email')) columnasDetectadas.email = header;
        // ⚠️ CORREGIDO: solo detecta "observaciones" exacto, NO "obsmuni"
        if (h === 'observaciones' || h === 'obs') columnasDetectadas.observaciones = header;
        if (h.includes('expte') && h.includes('judicial')) columnasDetectadas.expteJudicial = header;
        if (h === 'causaordenaño' || h === 'causaordenano') columnasDetectadas.causaOrdenAnio = header;
        if (h === 'cuit/cuil' || h === 'cuit' || h === 'cuil') columnasDetectadas.cuit = header;
        if (h === 'contribuyente') columnasDetectadas.contribuyente = header;
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
    if (config.updateObservaciones) campos.push('Obs. Propia');
    if (config.updateExpte) campos.push('Expediente Judicial');

    document.getElementById('resumenFusion').innerHTML = `
        <h4 class="font-bold mb-2">Resumen:</h4>
        <ul class="text-sm space-y-1">
            <li>• Total registros en DDT: <strong>${datosTramites.length}</strong></li>
            <li>• Campos a actualizar: <strong>${campos.join(', ') || 'Ninguno'}</strong></li>
            <li>• Modo: <strong>Primera fusión — DDT reemplaza Supabase</strong></li>
        </ul>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:0.75rem;margin-top:0.75rem;border-radius:0.25rem;">
            <p style="color:#92400e;margin:0;font-size:0.875rem;">⚠️ <strong>Primera fusión:</strong> teléfono, mail y obs. propia serán reemplazados por los datos del DDT. <strong>obs_muni no se toca.</strong></p>
        </div>
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
        { campo: 'Jud → jud_id', columna: columnasDetectadas.jud, req: true },
        { campo: 'Estadoletra → estado', columna: columnasDetectadas.estadoletra, req: true },
        { campo: 'Teléfono → telefono', columna: columnasDetectadas.telefono, req: false },
        { campo: 'E-mail → mail', columna: columnasDetectadas.email, req: false },
        // ⚠️ CORREGIDO: muestra obs_propia (no obs_muni)
        { campo: 'Observaciones → obs_propia', columna: columnasDetectadas.observaciones, req: false },
        { campo: 'Expte. judicial → expte_judicial', columna: columnasDetectadas.expteJudicial, req: false },
        { campo: 'CUIT/CUIL → cuit', columna: columnasDetectadas.cuit, req: false },
        { campo: 'Contribuyente → titular', columna: columnasDetectadas.contribuyente, req: false },
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
        updateCuit: document.getElementById('updateCuit')?.checked ?? true,
        updateTitular: document.getElementById('updateTitular')?.checked ?? true,
        soloVacios: document.getElementById('soloVacios').checked,
        // Primera fusión: DDT siempre reemplaza
        modoFusion: 'reemplazar'
    };
}

// ==========================================
// FUNCIONES DE LIMPIEZA Y NORMALIZACIÓN
// ==========================================

function limpiarValor(valor) {
    if (!valor || valor === '-' || valor.trim() === '-') return '';
    return valor.trim();
}

/**
 * Normaliza un número de teléfono o email para comparación:
 * extrae solo dígitos (para tel) o normaliza (para email).
 * NO elimina "eq" — lo que importa es el número base.
 */
function normalizarNumero(tel) {
    if (!tel) return '';
    // Solo dígitos, para comparar números base
    return tel.replace(/[^0-9]/g, '');
}

function normalizarEmail(email) {
    if (!email) return '';
    return email.toLowerCase().trim();
}

/**
 * Fusiona teléfonos inteligentemente:
 * - Clave de identidad = dígitos del número (sin letras ni símbolos)
 * - Si mismo número base aparece en ambos, gana la versión del DDT
 *   (puede traer etiqueta "Eq", "eq", "equivocado", etc.)
 * - Agrega números nuevos del DDT que no existían en Supabase
 * 
 * Ejemplo:
 *   Supabase: "3513525169 / 3513531953"
 *   DDT:      "3513525169Eq / 3513531953 / 3512556633"
 *   Resultado: "3513525169Eq / 3513531953 / 3512556633"
 */
function fusionarTelefonos(existente, nuevo) {
    const separarItems = (str) => {
        if (!str) return [];
        return str.split('/').map(s => s.trim()).filter(s => s);
    };

    const itemsExistentes = separarItems(existente);
    const itemsNuevos = separarItems(nuevo);

    if (itemsNuevos.length === 0) return existente || '';
    if (itemsExistentes.length === 0) return nuevo || '';

    // Mapa: dígitos → entrada completa (de Supabase)
    const mapaExistente = {};
    itemsExistentes.forEach(item => {
        const clave = normalizarNumero(item);
        if (clave) mapaExistente[clave] = item;
    });

    // Procesar DDT: si mismo número base, DDT gana; si nuevo, se agrega
    const mapaFinal = { ...mapaExistente };
    itemsNuevos.forEach(item => {
        const clave = normalizarNumero(item);
        if (clave) {
            // DDT siempre pisa (puede traer etiqueta "Eq" que no estaba)
            mapaFinal[clave] = item;
        }
    });

    return Object.values(mapaFinal).join(' / ');
}

/**
 * Fusiona emails con la misma lógica que teléfonos
 */
function fusionarEmails(existente, nuevo) {
    const separarItems = (str) => {
        if (!str) return [];
        return str.split('/').map(s => s.trim()).filter(s => s);
    };

    const itemsExistentes = separarItems(existente);
    const itemsNuevos = separarItems(nuevo);

    if (itemsNuevos.length === 0) return existente || '';
    if (itemsExistentes.length === 0) return nuevo || '';

    const mapaExistente = {};
    itemsExistentes.forEach(item => {
        const clave = normalizarEmail(item);
        if (clave) mapaExistente[clave] = item;
    });

    const mapaFinal = { ...mapaExistente };
    itemsNuevos.forEach(item => {
        const clave = normalizarEmail(item);
        if (clave) mapaFinal[clave] = item;
    });

    return Object.values(mapaFinal).join(' / ');
}

// ==========================================
// BÚSQUEDA POR JUD_ID
// ==========================================

async function buscarPorJudId(judId) {
    const judLimpio = limpiarValor(judId);
    if (!judLimpio) return { data: null, error: 'Jud vacío' };

    let { data, error } = await supabaseClient
        .from('deudas')
        .select('*')
        .eq('jud_id', judLimpio);

    if (error) return { data: null, error };

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

    const limite = Math.min(datosTramites.length, 100);

    for (let i = 0; i < limite; i++) {
        const tramite = datosTramites[i];
        const judId = limpiarValor(tramite[columnasDetectadas.jud]);

        if (!judId) {
            resultadosFusion.push({ judId: 'SIN_ID', encontrado: false, error: 'Sin Jud ID' });
            noEncontrados++;
            continue;
        }

        try {
            const { data: municipales, error } = await buscarPorJudId(judId);

            if (error) throw new Error(error);

            if (!municipales || municipales.length === 0) {
                resultadosFusion.push({ judId, encontrado: false, datosTramite: tramite });
                noEncontrados++;
                continue;
            }

            encontrados++;
            const registro = municipales[0];
            const cambios = calcularCambios(tramite, registro, config);

            if (cambios.length === 0) {
                resultadosFusion.push({ judId, encontrado: true, sinCambios: true, expediente: registro.expediente });
            } else {
                conCambios++;
                resultadosFusion.push({ judId, encontrado: true, cambios, expediente: registro.expediente });
            }

        } catch (err) {
            resultadosFusion.push({ judId, encontrado: false, error: err.message });
            noEncontrados++;
        }

        actualizarProgress(((i + 1) / limite) * 100);
    }

    mostrarResultadosSimulacion(encontrados, noEncontrados, conCambios);
    logProgress(`✅ Simulación completada. Analizados: ${limite} de ${datosTramites.length}`);
}

/**
 * Calcula los cambios que se harían (para simulación)
 */
function calcularCambios(tramite, registro, config) {
    const cambios = [];

    // Estado
    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const nuevoEstado = limpiarValor(tramite[columnasDetectadas.estadoletra])?.toUpperCase();
        const estadoActual = limpiarValor(registro.estado);
        if (nuevoEstado && ['X','D','S','E','C','P','B'].includes(nuevoEstado) && nuevoEstado !== estadoActual) {
            cambios.push({ campo: 'Estado', actual: estadoActual || '(vacío)', nuevo: nuevoEstado });
        }
    }

    // Teléfono — fusión inteligente por número base
    if (config.updateTelefono && columnasDetectadas.telefono) {
        const nuevoTel = limpiarValor(tramite[columnasDetectadas.telefono]);
        const telActual = limpiarValor(registro.telefono);
        if (nuevoTel) {
            const telFusionado = fusionarTelefonos(telActual, nuevoTel);
            if (telFusionado !== telActual) {
                cambios.push({ campo: 'Teléfono', actual: telActual || '(vacío)', nuevo: telFusionado });
            }
        }
    }

    // Email — fusión inteligente
    if (config.updateEmail && columnasDetectadas.email) {
        const nuevoEmail = limpiarValor(tramite[columnasDetectadas.email]);
        const emailActual = limpiarValor(registro.mail);
        if (nuevoEmail) {
            const emailFusionado = fusionarEmails(emailActual, nuevoEmail);
            if (emailFusionado !== emailActual) {
                cambios.push({ campo: 'Email', actual: emailActual || '(vacío)', nuevo: emailFusionado });
            }
        }
    }

    // ⚠️ CORREGIDO: Observaciones DDT → obs_propia (NO obs_muni)
    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const nuevaObs = limpiarValor(tramite[columnasDetectadas.observaciones]);
        const obsActual = limpiarValor(registro.obs_propia);
        if (nuevaObs && nuevaObs !== obsActual) {
            cambios.push({
                campo: 'Obs. Propia',
                actual: obsActual || '(vacío)',
                nuevo: nuevaObs.substring(0, 80) + (nuevaObs.length > 80 ? '...' : '')
            });
        }
    }

    // Expediente Judicial
    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const nuevoExpte = limpiarValor(tramite[columnasDetectadas.expteJudicial]);
        const expteActual = limpiarValor(registro.expte_judicial);
        if (nuevoExpte && nuevoExpte !== expteActual) {
            cambios.push({ campo: 'Expte. Judicial', actual: expteActual || '(vacío)', nuevo: nuevoExpte });
        }
    }

    // CUIT — DDT reemplaza
    if (config.updateCuit && columnasDetectadas.cuit) {
        const nuevoCuit = limpiarValor(tramite[columnasDetectadas.cuit]);
        const cuitActual = limpiarValor(registro.cuit);
        if (nuevoCuit && nuevoCuit !== cuitActual) {
            cambios.push({ campo: 'CUIT', actual: cuitActual || '(vacío)', nuevo: nuevoCuit });
        }
    }

    // Titular — DDT reemplaza
    if (config.updateTitular && columnasDetectadas.contribuyente) {
        const nuevoTitular = limpiarValor(tramite[columnasDetectadas.contribuyente]);
        const titularActual = limpiarValor(registro.titular);
        if (nuevoTitular && nuevoTitular !== titularActual) {
            cambios.push({ campo: 'Titular', actual: titularActual || '(vacío)', nuevo: nuevoTitular });
        }
    }

    return cambios;
}

// ==========================================
// EJECUCIÓN REAL
// ==========================================

async function ejecutarFusion() {
    if (!confirm('¿Estás seguro de actualizar la base de datos?\n\nEsta acción modificará datos reales en Supabase.\n\nobs_muni NO será modificado.')) {
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
                resultadosFusion.push({ judId, encontrado: false });
                noEncontrados++;
                logProgress(`⚠️ No encontrado: ${judId}`);
                continue;
            }

            const registro = municipales[0];
            const updateData = prepararUpdate(tramite, registro, config);

            if (Object.keys(updateData).length === 0) {
                resultadosFusion.push({ judId, encontrado: true, actualizado: false, expediente: registro.expediente });
                exitosos++;
                continue;
            }

            const { error: updateError } = await supabaseClient
                .from('deudas')
                .update(updateData)
                .eq('id', registro.id);

            if (updateError) throw updateError;

            resultadosFusion.push({ 
                judId, 
                encontrado: true, 
                actualizado: true,
                expediente: registro.expediente,
                variacion: variacionUsada
            });
            exitosos++;
            logProgress(`✅ Guardado: ${judId}`);

        } catch (error) {
            resultadosFusion.push({ judId, error: error.message });
            errores++;
            logProgress(`❌ Error en ${judId}: ${error.message}`);
        }

        actualizarProgress(((i + 1) / datosTramites.length) * 100);
    }

    mostrarResultadosEjecucion(exitosos, noEncontrados, errores);
    logProgress('✅ Ejecución completada');
}

/**
 * Prepara el objeto de update para Supabase
 * ⚠️ CORREGIDO: Observaciones DDT → obs_propia (NO obs_muni)
 * ⚠️ CORREGIDO: Teléfono y email usan fusión inteligente por número base
 */
function prepararUpdate(tramite, registro, config) {
    const updateData = {};

    // Estado — DDT reemplaza siempre
    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const estado = limpiarValor(tramite[columnasDetectadas.estadoletra])?.toUpperCase();
        if (estado && ['X','D','S','E','C','P','B'].includes(estado)) {
            updateData.estado = estado;
        }
    }

    // Teléfono — fusión inteligente por número base
    if (config.updateTelefono && columnasDetectadas.telefono) {
        const tel = limpiarValor(tramite[columnasDetectadas.telefono]);
        if (tel) {
            const actual = limpiarValor(registro.telefono);
            const fusionado = fusionarTelefonos(actual, tel);
            if (fusionado !== actual) updateData.telefono = fusionado;
        }
    }

    // Email — fusión inteligente
    if (config.updateEmail && columnasDetectadas.email) {
        const email = limpiarValor(tramite[columnasDetectadas.email]);
        if (email) {
            const actual = limpiarValor(registro.mail);
            const fusionado = fusionarEmails(actual, email);
            if (fusionado !== actual) updateData.mail = fusionado;
        }
    }

    // ⚠️ CORREGIDO: Observaciones DDT → obs_propia (NO obs_muni)
    if (config.updateObservaciones && columnasDetectadas.observaciones) {
        const obs = limpiarValor(tramite[columnasDetectadas.observaciones]);
        if (obs) {
            const actual = limpiarValor(registro.obs_propia) || '';

            // Extraer el texto DDT actual si existe (primera entrada con ##DDT||)
            let textoActualDDT = '';
            if (actual.includes('##DDT||')) {
                const entradas = actual.split('||').filter(e => e.trim());
                const entradaDDT = entradas.find(e => e.includes('##DDT'));
                if (entradaDDT) {
                    textoActualDDT = entradaDDT.split('##')[1] || '';
                }
            }

            // Solo actualizar si el texto del DDT cambió
            if (obs !== textoActualDDT) {
                // Conservar entradas manuales (las que NO son DDT)
                const entradasManuales = actual
                    ? actual.split('||').filter(e => e.trim() && !e.includes('##DDT')).join('||')
                    : '';

                const nuevaEntradaDDT = 'Sin fecha##' + obs + '##DDT||';

                // DDT va primero, luego las entradas manuales
                updateData.obs_propia = entradasManuales
                    ? nuevaEntradaDDT + entradasManuales + '||'
                    : nuevaEntradaDDT;
            }
        }
    }

    // Expediente Judicial — DDT reemplaza si tiene valor
    if (config.updateExpte && columnasDetectadas.expteJudicial) {
        const expte = limpiarValor(tramite[columnasDetectadas.expteJudicial]);
        if (expte) {
            const actual = limpiarValor(registro.expte_judicial);
            if (expte !== actual) updateData.expte_judicial = expte;
        }
    }

    // CUIT — DDT reemplaza
    if (config.updateCuit && columnasDetectadas.cuit) {
        const cuit = limpiarValor(tramite[columnasDetectadas.cuit]);
        if (cuit) {
            const actual = limpiarValor(registro.cuit);
            if (cuit !== actual) updateData.cuit = cuit;
        }
    }

    // Titular — DDT reemplaza
    if (config.updateTitular && columnasDetectadas.contribuyente) {
        const titular = limpiarValor(tramite[columnasDetectadas.contribuyente]);
        if (titular) {
            const actual = limpiarValor(registro.titular);
            if (titular !== actual) updateData.titular = titular;
        }
    }

    if (Object.keys(updateData).length > 0) {
        updateData.fecha_actualizacion = new Date().toISOString();
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

    let html = `
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:1rem;margin-bottom:1rem;">
            <p style="font-weight:bold;color:#92400e;margin:0;">🔍 ESTO ES UNA SIMULACIÓN</p>
            <p style="color:#92400e;margin:0.5rem 0 0 0;">No se guardaron cambios. Para ejecutar, usá el botón verde "Ejecutar y guardar en Supabase"</p>
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
                <div style="color:#991b1b;font-size:0.875rem;">No encontrados en Supabase</div>
            </div>
        </div>
        <h4 style="font-weight:bold;margin-bottom:0.5rem;">Detalle de cambios propuestos:</h4>
        <div style="max-height:400px;overflow-y:auto;background:#f3f4f6;padding:1rem;border-radius:0.5rem;font-family:monospace;font-size:0.875rem;">
    `;

    resultadosFusion.forEach(r => {
        if (r.error) {
            html += `<div style="color:#dc2626;margin-bottom:0.5rem;">❌ ${r.judId}: ${r.error}</div>`;
        } else if (!r.encontrado) {
            html += `<div style="color:#d97706;margin-bottom:0.5rem;">⚠️ ${r.judId}: No encontrado en Supabase</div>`;
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

    let html = `
        <div style="background:#d1fae5;border-left:4px solid #059669;padding:1rem;margin-bottom:1rem;">
            <p style="font-weight:bold;color:#065f46;margin:0;">✅ EJECUCIÓN COMPLETADA</p>
            <p style="color:#065f46;margin:0.5rem 0 0 0;">Los cambios se guardaron en Supabase. obs_muni no fue modificado.</p>
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
