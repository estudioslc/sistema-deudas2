// ==========================================
// EDITAR Y ELIMINAR MOV/EXPTE
// ==========================================

// Definir las funciones ANTES de asignarlas a window

function editarMovExpte(id) {
  console.log('Editando movimiento:', id);
  // Ocultar contenido y mostrar formulario
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'none';
  if (form) form.style.display = 'block';
  
  // Limpiar el input de archivo al abrir edición
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

function cancelarEdicionMovExpte(id) {
  console.log('Cancelando edición:', id);
  // Mostrar contenido y ocultar formulario
  const contenido = document.getElementById('contenido-mov-' + id);
  const form = document.getElementById('form-edit-' + id);
  if (contenido) contenido.style.display = 'block';
  if (form) form.style.display = 'none';
  
  // Limpiar input de archivo al cancelar
  const archivoInput = document.getElementById('edit-arch-' + id);
  if (archivoInput) archivoInput.value = '';
}

async function guardarEdicionMovExpte(id) {
  console.log('Guardando edición:', id);
  
  const notificado = document.getElementById('edit-notif-' + id).checked;
  const observaciones = document.getElementById('edit-obs-' + id).value.trim();
  const archivoInput = document.getElementById('edit-arch-' + id);
  
  console.log('Valores a guardar:', { notificado, observaciones, tieneArchivo: archivoInput && archivoInput.files.length > 0 });
  
  // Mostrar indicador de carga
  const btnGuardar = document.querySelector(`#form-edit-${id} .btn-guardar-edicion`);
  const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '💾';
  if (btnGuardar) {
    btnGuardar.innerHTML = '⏳';
    btnGuardar.disabled = true;
  }
  
  try {
    // Primero obtener el registro actual para saber qué archivos ya tiene
    console.log('Consultando registro actual...');
    const { data: movActual, error: errorConsulta } = await supabaseClient
      .from('movimientos_judiciales')
      .select('archivo_url')
      .eq('id', id)
      .single();
    
    if (errorConsulta) {
      console.error('Error consultando registro:', errorConsulta);
      throw errorConsulta;
    }
    
    console.log('Registro actual:', movActual);
    
    // Obtener array actual de archivos
    let archivosArray = obtenerArchivosArray(movActual);
    console.log('Archivos existentes:', archivosArray);
    
    // Si hay nuevo archivo, subirlo y agregarlo al array
    if (archivoInput && archivoInput.files.length > 0) {
      console.log('Subiendo nuevo archivo...');
      const archivo = archivoInput.files[0];
      
      // Validar tipo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(archivo.type)) {
        alert('Solo se permiten archivos PDF, JPG o PNG');
        if (btnGuardar) {
          btnGuardar.innerHTML = textoOriginal;
          btnGuardar.disabled = false;
        }
        return;
      }
      
      // Validar tamaño (máx 10MB)
      if (archivo.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        if (btnGuardar) {
          btnGuardar.innerHTML = textoOriginal;
          btnGuardar.disabled = false;
        }
        return;
      }
      
      // Subir a Storage
      const fileName = Date.now() + '_' + archivo.name;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('documentos-judiciales')
        .upload(fileName, archivo);
      
      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        throw uploadError;
      }
      
      // Obtener URL pública
      const { data: urlData } = supabaseClient
        .storage
        .from('documentos-judiciales')
        .getPublicUrl(fileName);
      
      console.log('Archivo subido:', urlData.publicUrl);
      
      // Agregar el nuevo archivo al array existente (NO reemplazar)
      archivosArray.push({
        url: urlData.publicUrl,
        nombre: archivo.name
      });
      
      console.log('Array actualizado:', archivosArray);
    }
    
    // Preparar datos a actualizar
    const datosActualizar = {
      notificado: notificado,
      observaciones: observaciones || null,
      archivo_url: archivosArray // Array completo con archivos viejos + nuevo
    };
    
    console.log('Datos a actualizar:', datosActualizar);
    
    // Actualizar en la base de datos
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .update(datosActualizar)
      .eq('id', id);
    
    if (error) {
      console.error('Error actualizando BD:', error);
      throw error;
    }
    
    console.log('Actualización exitosa');
    
    // Cerrar formulario de edición ANTES de recargar
    cancelarEdicionMovExpte(id);
    
    // Recargar movimientos
    await cargarMovimientosExpte();
    
    showSuccess('Movimiento actualizado correctamente');
    
  } catch (err) {
    console.error('Error completo:', err);
    showError('Error al actualizar el movimiento: ' + err.message);
  } finally {
    // Restaurar botón
    if (btnGuardar) {
      btnGuardar.innerHTML = textoOriginal;
      btnGuardar.disabled = false;
    }
  }
}

async function eliminarMovExpte(id) {
  console.log('Eliminando movimiento:', id);
  
  if (!confirm('¿Estás seguro de eliminar este movimiento?')) {
    console.log('Eliminación cancelada por el usuario');
    return;
  }
  
  try {
    console.log('Ejecutando DELETE en Supabase...');
    const { error } = await supabaseClient
      .from('movimientos_judiciales')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }
    
    console.log('Eliminación exitosa, recargando...');
    await cargarMovimientosExpte();
    showSuccess('Movimiento eliminado correctamente');
    
  } catch (err) {
    console.error('Error al eliminar:', err);
    showError('Error al eliminar el movimiento: ' + err.message);
  }
}

// ==========================================
// EXPONER FUNCIONES AL SCOPE GLOBAL
// ==========================================

window.verDetalle = verDetalle;
window.buscarCausas = buscarCausas;
window.filtrarPorEstado = filtrarPorEstado;
window.cerrarModal = cerrarModal;
window.cerrarModalDetalle = cerrarModalDetalle;
window.editarDesdeDetalle = editarDesdeDetalle;
window.guardarEdicion = guardarEdicion;
window.limpiarTodasLasCausas = limpiarTodasLasCausas;
window.editarCausa = editarCausa;
window.eliminarCausa = eliminarCausa;
window.toggleExpandirDetalle = toggleExpandirDetalle;
window.cambiarTab = cambiarTab;
window.mostrarFormNuevo = mostrarFormNuevo;
window.cancelarNuevo = cancelarNuevo;
window.guardarNuevoMovimiento = guardarNuevoMovimiento;
window.editarMovimiento = editarMovimiento;
window.cancelarEdicionMovimiento = cancelarEdicionMovimiento;
window.guardarEdicionMovimiento = guardarEdicionMovimiento;
window.eliminarMovimiento = eliminarMovimiento;
window.cargarMasMovimientos = cargarMasMovimientos;
window.mostrarFormExpte = mostrarFormExpte;
window.cancelarFormExpte = cancelarFormExpte;
window.guardarMovExpte = guardarMovExpte;
window.editarMovExpte = editarMovExpte;
window.cancelarEdicionMovExpte = cancelarEdicionMovExpte;
window.guardarEdicionMovExpte = guardarEdicionMovExpte;
window.eliminarMovExpte = eliminarMovExpte;
