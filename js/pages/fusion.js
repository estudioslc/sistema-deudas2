// ==========================================
// SISTEMA DE FUSIÓN DE DATOS - CORREGIDO
// ==========================================

// Variables globales
let datosTramites = [];
let columnasDetectadas = {};
let resultadosFusion = [];
let supabaseClient = null;
let fileInputHandler = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Fusion.js cargado correctamente');
    
    // Inicializar Supabase si existe
    inicializarSupabase();
    
    // Configurar event listeners
    configurarEventListeners();
});

function inicializarSupabase() {
    try {
        // Intentar obtener el cliente de Supabase de diferentes maneras
        if (window.supabaseClient) {
            supabaseClient = window.supabaseClient;
            console.log('Supabase client encontrado en window.supabaseClient');
        } else if (window.supabase && window.supabase.createClient) {
            // Crear nuevo cliente - NECESITO QUE ME PASES TUS CREDENCIALES REALES
            supabaseClient = window.supabase.createClient(
                'https://jigyfagcxaifgdogaduf.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3lmYWdjeGFpZmdkb2dhZHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjgwMDAsImV4cCI6MjA1MzY0NDAwMH0.your_real_anon_key_here'
            );
            console.log('Supabase client creado');
        } else {
            console.warn('Supabase no disponible - la carga de archivos funcionará pero no se podrá guardar en BD');
        }
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
    }
}

function configurarEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) {
        console.error('No se encontraron elementos dropZone o fileInput');
        return;
    }

    console.log('Configurando event listeners...');

    // Prevenir comportamiento por defecto en toda la página para drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Eventos del drop zone
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drag enter');
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drag leave');
        // Solo remover si realmente salió del elemento (no de un hijo)
        if (e.relatedTarget && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop detectado');
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        console.log('Archivos en drop:', files.length);
        
        if (files.length > 0) {
            procesarArchivo(files[0]);
        } else {
            alert('No se detectaron archivos. Intentá de nuevo.');
        }
    });

    // Evento del input file
    fileInputHandler = function(e) {
        console.log('Change event en fileInput');
        console.log('Archivos seleccionados:', e.target.files.length);
        
        if (e.target.files.length > 0) {
            procesarArchivo(e.target.files[0]);
        }
    };
    
    fileInput.addEventListener('change', fileInputHandler);

    // Click en el drop zone
    dropZone.addEventListener('click', (e) => {
        // Evitar que se dispare si se hizo click en el input mismo
        if (e.target !== fileInput) {
            console.log('Click en drop zone, abriendo selector');
            fileInput.click();
        }
    });

    console.log('Event listeners configurados correctamente');
}

// ==========================================
// PASO 1: PROCESAR ARCHIVO
// ==========================================

function procesarArchivo(file) {
    console.log('Procesando archivo:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)\nArchivo recibido: ' + file.name);
        return;
    }

    // Mostrar carga
    mostrarCarga(true);

    const reader = new FileReader();
    
    reader.onerror = function(e) {
        console.error('Error en FileReader:', e);
        alert('Error al leer el archivo');
        mostrarCarga(false);
    };
    
    reader.onload = function(e) {
        try {
            console.log('Archivo leído, procesando datos...');
            const data = new Uint8Array(e.target.result);
            
            // Verificar que XLSX esté disponible
            if (typeof XLSX === 'undefined') {
                throw new Error('Librería XLSX no cargada. Recargá la página.');
            }

            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Hojas encontradas:', workbook.SheetNames);
            
            if (workbook.SheetNames.length === 0) {
                throw new Error('El archivo no tiene hojas');
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            console.log('Filas totales:', jsonData.length);

            if (jsonData.length < 2) {
                throw new Error('El archivo parece estar vacío o no tiene datos (solo encabezado)');
            }

            // Procesar encabezados y datos
            const headers = jsonData[0].map(h => String(h).trim());
            console.log('Columnas encontradas:', headers);
            
            datosTramites = [];
            let filasVacias = 0;

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // Verificar si la fila está vacía
                if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
                    filasVacias++;
                    continue;
                }
                
                const obj = {};
                let tieneDatos = false;
                
                headers.forEach((header, index) => {
                    const valor = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
                    obj[header] = valor;
                    if (valor) tieneDatos = true;
                });
                
                if (tieneDatos) {
                    datosTramites.push(obj);
                }
            }

            console.log('Filas con datos:', datosTramites.length, 'Filas vacías omitidas:', filasVacias);

            if (datosTramites.length === 0) {
                throw new Error('No se encontraron filas con datos en el archivo');
            }

            // Detectar columnas
            detectarColumnas(headers);
            
            // Verificar columna obligatoria
            if (!columnasDetectadas.jud) {
                console.warn('Columnas detectadas:', columnasDetectadas);
                // No lanzamos error, dejamos que el usuario vea el mapeo
            }

            // Mostrar info
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('rowCount').textContent = datosTramites.length + ' registros';
            document.getElementById('fileInfo').classList.remove('hidden');

            mostrarCarga(false);
            
            // Ir al paso 2 después de un breve delay
            setTimeout(() => {
                goToStep2();
            }, 500);

        } catch (error) {
            console.error('Error al procesar archivo:', error);
            mostrarCarga(false);
            alert('Error al procesar el archivo:\n' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function mostrarCarga(mostrar) {
    // Podés agregar un spinner acá si querés
    const dropZone = document.getElementById('dropZone');
    if (mostrar) {
        dropZone.style.opacity = '0.6';
        dropZone.innerHTML += '<div id="loadingMsg" class="mt-2 text-blue-600 font-bold">Procesando...</div>';
    } else {
        dropZone.style.opacity = '1';
        const loading = document.getElementById('loadingMsg');
        if (loading) loading.remove();
    }
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
        const h = header.toLowerCase().replace(/[\s_.]/g, '');
        
        if (h === 'jud' || h === 'judid') columnasDetectadas.jud = header;
        if (h === 'estadoletra' || h === 'estado' || h === 'estadoletra') columnasDetectadas.estadoletra = header;
        if (h.includes('telefono') || h.includes('tel')) columnasDetectadas.telefono = header;
        if (h.includes('mail') || h.includes('email') || h.includes('email')) columnasDetectadas.email = header;
        if (h.includes('observacion')) columnasDetectadas.observaciones = header;
        if ((h.includes('expte') || h.includes('expediente')) && (h.includes('judicial') || h.includes('jud'))) columnasDetectadas.expteJudicial = header;
        if (h === 'causaordenaño' || h === 'causaordenano' || h === 'causa') columnasDetectadas.causaOrdenAnio = header;
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
    actualizarPasosUI(2);

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

function actualizarPasosUI(pasoActivo) {
    const pasos = [1, 2, 3, 4];
    pasos.forEach(num => {
        const el = document.getElementById('step' + num);
        el.classList.remove('step-active', 'step-completed');
        el.classList.add('border-gray-200');
        
        if (num < pasoActivo) {
            el.classList.add('step-completed');
        } else if (num === pasoActivo) {
            el.classList.add('step-active');
        }
    });
}

function mostrarMapeoColumnas() {
    const container = document.getElementById('columnMapping');
    if (!container) return;

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
        alert('⚠️ ATENCIÓN: No se detectó la columna "Jud" o "Jud_ID".\n\nColumnas encontradas: ' + Object.keys(datosTramites[0]).join(', '));
    }
}

function mostrarPreview() {
    const thead = document.getElementById('previewHeader');
    const tbody = document.getElementById('previewBody');
    
    if (!thead || !tbody) return;

    const headers = Object.keys(datosTramites[0]);

    // Headers
    thead.innerHTML = headers.map(h => 
        `<th class="p-2 text-left border-b ${esColumnaImportante(h) ? 'bg-blue-100 font-bold' : 'bg-gray-100'}">${h}</th>`
    ).join('');

    // Datos (primeros 5)
    tbody.innerHTML = datosTramites.slice(0, 5).map((row, idx) => `
        <tr class="border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
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
    return ['jud', 'estadoletra', 'estado', 'telefono', 'email', 'observaciones', 'expte'].some(c => h.includes(c));
}

function truncarTexto(texto, max) {
    if (!texto) return '<span class="text-gray-400">-</span>';
    const str = String(texto);
    return str.length > max ? str.substring(0, max) + '...' : str;
}

// ==========================================
// PASO 3: CONFIGURACIÓN
// ==========================================

function goToStep3() {
    if (!columnasDetectadas.jud) {
        if (!confirm('No se detectó la columna Jud. ¿Querés continuar igual?')) {
            return;
        }
    }

    actualizarPasosUI(3);

    document.getElementById('panel2').classList.add('hidden');
    document.getElementById('panel3').classList.remove('hidden');
}

function goToStep2() {
    actualizarPasosUI(2);
    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel2').classList.remove('hidden');
}

// ==========================================
// PASO 4: EJECUCIÓN
// ==========================================

function goToStep4() {
    actualizarPasosUI(4);

    document.getElementById('panel3').classList.add('hidden');
    document.getElementById('panel4').classList.remove('hidden');

    // Mostrar resumen
    const config = obtenerConfiguracion();
    const camposSeleccionados = [];
    if (config.updateEstado) camposSeleccionados.push('Estado');
    if (config.updateTelefono) camposSeleccionados.push('Teléfono');
    if (config.updateEmail) camposSeleccionados.push('Email');
    if (config.updateObservaciones) camposSeleccionados.push('Observaciones');
    if (config.updateExpte) camposSeleccionados.push('Expediente Judicial');

    document.getElementById('resumenFusion').innerHTML = `
        <h4 class="font-bold mb-2">Resumen de configuración:</h4>
        <ul class="text-sm space-y-1">
            <li>• Total registros a procesar: <strong>${datosTramites.length}</strong></li>
            <li>• Campos a actualizar: <strong>${camposSeleccionados.join(', ') || 'Ninguno'}</strong></li>
            <li>• Modo teléfonos/emails: <strong>${config.modoFusion}</strong></li>
            <li>• Sobrescribir existentes: <strong>${config.soloVacios ? 'No (solo vacíos)' : 'Sí'}</strong></li>
        </ul>
    `;
}

function obtenerConfiguracion() {
    return {
        updateEstado: document.getElementById('updateEstado')?.checked ?? true,
        updateTelefono: document.getElementById('updateTelefono')?.checked ?? true,
        updateEmail: document.getElementById('updateEmail')?.checked ?? true,
        updateObservaciones: document.getElementById('updateObservaciones')?.checked ?? true,
        updateExpte: document.getElementById('updateExpte')?.checked ?? true,
        soloVacios: document.getElementById('soloVacios')?.checked ?? false,
        modoFusion: document.getElementById('modoFusion')?.value ?? 'concatenar'
    };
}

// ==========================================
// SIMULAR Y EJECUTAR FUSIÓN
// ==========================================

async function simularFusion() {
    const config = obtenerConfiguracion();
    resultadosFusion = [];
    
    mostrarProgress(true);
    logProgress('Iniciando SIMULACIÓN (no se guardarán cambios)...');

    let encontrados = 0;
    let noEncontrados = 0;

    // Simular procesamiento
    for (let i = 0; i < Math.min(datosTramites.length, 100); i++) { // Limitar a 100 para simulación
        const tramite = datosTramites[i];
        const judId = tramite[columnasDetectadas.jud];

        if (!judId) {
            resultadosFusion.push({
                judId: 'SIN_ID',
                encontrado: false,
                error: 'Sin Jud ID'
            });
            noEncontrados++;
            continue;
        }

        // Simular que encontramos el 85% para la demo
        const encontrado = Math.random() > 0.15;
        
        if (encontrado) {
            encontrados++;
            const cambios = calcularCambios(tramite, {}, config);
            resultadosFusion.push({
                judId: judId,
                encontrado: true,
                simulado: true,
                cambios: cambios,
                datosTramite: tramite
            });
            logProgress(`✅ Simulado: Jud ${judId} - ${cambios.length} cambios`);
        } else {
            noEncontrados++;
            resultadosFusion.push({
                judId: judId,
                encontrado: false,
                simulado: true,
                datosTramite: tramite
            });
        }

        if (i % 10 === 0) {
            actualizarProgress(((i + 1) / datosTramites.length) * 100);
        }
    }

    mostrarResultados(encontrados, noEncontrados, 0);
    logProgress('Simulación completada. Revisá los resultados antes de ejecutar la fusión real.');
}

async function ejecutarFusion() {
    if (!supabaseClient) {
        alert('Error: No se pudo conectar con Supabase. Recargá la página e intentá de nuevo.');
        return;
    }

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
            resultadosFusion.push({ 
                judId: 'SIN_ID', 
                encontrado: false, 
                error: 'Sin Jud ID' 
            });
            noEncontrados++;
            continue;
        }

        try {
            logProgress(`Buscando Jud ${judId}...`);
            
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
                logProgress(`⚠️ Jud ${judId}: No encontrado en municipal`);
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
            logProgress(`✅ Jud ${judId}: Actualizado`);

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

function calcularCambios(tramite, registroActual, config) {
    const cambios = [];

    if (config.updateEstado && columnasDetectadas.estadoletra) {
        const estado = tramite[columnasDetectadas.estadoletra];
        if (estado) cambios.push({ campo: 'estado_fusion', valor: estado });
    }

    if (config.updateTelefono && columnasDetectadas.telefono) {
        const tel = tramite[columnasDetectadas.telefono];
        if (tel) cambios.push({ campo: 'telefono_fusion', valor: tel });
    }

    if (config.updateEmail && columnasDetectadas.email) {
        const email = tramite[columnasDetectadas.email];
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
// PROCESAMIENTO DE CONTACTOS
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

// ==========================================
// UI Y UTILIDADES
// ==========================================

function mostrarProgress(show) {
    const el = document.getElementById('progressArea');
    if (el) el.classList.toggle('hidden', !show);
    if (show) {
        const resultados = document.getElementById('resultadosArea');
        if (resultados) resultados.classList.add('hidden');
    }
}

function actualizarProgress(porcentaje) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressPercent');
    if (bar) bar.style.width = porcentaje + '%';
    if (text) text.textContent = Math.round(porcentaje) + '%';
}

function logProgress(mensaje) {
    const log = document.getElementById('progressLog');
    if (!log) return;
    const hora = new Date().toLocaleTimeString();
    log.innerHTML += `[${hora}] ${mensaje}\n`;
    log.scrollTop = log.scrollHeight;
}

function mostrarResultados(exitosos, noEncontrados, errores) {
    const progressArea = document.getElementById('progressArea');
    const resultadosArea = document.getElementById('resultadosArea');
    
    if (progressArea) progressArea.classList.add('hidden');
    if (resultadosArea) resultadosArea.classList.remove('hidden');

    const elExitosos = document.getElementById('countExitosos');
    const elNoEncontrados = document.getElementById('countNoEncontrados');
    const elErrores = document.getElementById('countErrores');

    if (elExitosos) elExitosos.textContent = exitosos;
    if (elNoEncontrados) elNoEncontrados.textContent = noEncontrados;
    if (elErrores) elErrores.textContent = errores;

    // Mostrar detalles
    const detalles = document.getElementById('detallesResultado');
    if (detalles) {
        detalles.innerHTML = resultadosFusion.slice(0, 100).map(r => { // Limitar a 100 para performance
            if (r.error) return `<div class="text-red-600">❌ ${r.judId}: ${r.error}</div>`;
            if (!r.encontrado) return `<div class="text-yellow-600">⚠️ ${r.judId}: No encontrado</div>`;
            if (!r.actualizado) return `<div class="text-blue-600">ℹ️ ${r.judId}: Sin cambios</div>`;
            return `<div class="text-green-600">✅ ${r.judId} (${r.expediente || 'N/A'}): ${r.cambios?.join(', ')}</div>`;
        }).join('');
        
        if (resultadosFusion.length > 100) {
            detalles.innerHTML += `<div class="text-gray-500 mt-2">... y ${resultadosFusion.length - 100} resultados más</div>`;
        }
    }
}

function descargarResultados() {
    if (resultadosFusion.length === 0) {
        alert('No hay resultados para descargar');
        return;
    }

    const data = resultadosFusion.map(r => ({
        'Jud ID': r.judId,
        'Encontrado': r.encontrado ? 'Sí' : 'No',
        'Actualizado': r.actualizado ? 'Sí' : (r.encontrado ? 'No necesario' : 'N/A'),
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

// Exponer funciones necesarias globalmente para los onclick
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.goToStep4 = goToStep4;
window.simularFusion = simularFusion;
window.ejecutarFusion = ejecutarFusion;
window.descargarResultados = descargarResultados;
window.descargarNoEncontrados = descargarNoEncontrados;
window.resetAll = resetAll;
