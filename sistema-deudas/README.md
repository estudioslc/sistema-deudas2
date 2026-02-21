# Sistema LC - Gestión de Deudas Municipales

Sistema web para la gestión de deudas municipales con carga masiva desde Excel, consulta, edición y exportación de datos.

## 🆕 Versión 2.0 - Estructura Optimizada

Esta versión incluye una reorganización completa del código:

- ✅ **CSS/SASS separados** - Código reutilizable y mantenible
- ✅ **JavaScript modular** - Funciones organizadas por página
- ✅ **Variables SASS** - Colores, espaciados y tipografía centralizados
- ✅ **Caché optimizado** - Los navegadores cachean CSS/JS externos

## 📁 Estructura del Proyecto

```
sistema-deudas/
├── css/                      # CSS compilado (no editar)
│   ├── styles.css           # Estilos para index.html
│   └── styles-internal.css  # Estilos para páginas internas
├── js/                       # JavaScript
│   ├── main.js              # Funciones comunes (Supabase, utilidades)
│   └── pages/               # JS específico por página
│       ├── carga.js
│       ├── consulta.js
│       └── admin.js
├── scss/                     # Fuentes SASS (editar aquí)
│   ├── _variables.scss      # Colores, fuentes, espaciados
│   ├── _mixins.scss         # Funciones reutilizables
│   ├── main.scss            # Estilos para index.html
│   ├── main-internal.scss   # Estilos para páginas internas
│   └── components/          # Componentes reutilizables
│       ├── _botones.scss
│       ├── _tarjetas.scss
│       ├── _tablas.scss
│       ├── _navegacion.scss
│       ├── _estados.scss
│       └── _utilidades.scss
├── index.html               # Página principal
├── carga.html               # Carga masiva desde Excel
├── consulta.html            # Consulta y edición
├── admin.html               # Administración y exportación
├── package.json             # Dependencias y scripts
└── README.md                # Este archivo
```

## 🚀 Instalación

1. **Clonar o descargar** el repositorio
2. **Instalar dependencias** (solo para desarrollo):

```bash
npm install
```

## 🛠️ Desarrollo

### Compilar SASS a CSS

```bash
# Compilar una vez
npm run build:all

# Modo desarrollo (watch)
npm run build:css:dev
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run build:css` | Compila estilos principales (comprimido) |
| `npm run build:css:dev` | Compila y observa cambios |
| `npm run build:css-internal` | Compila estilos internos |
| `npm run build:all` | Compila todos los estilos |

## 🎨 Personalización

### Cambiar colores

Edita `scss/_variables.scss`:

```scss
$color-primario: #007bff;      // Azul principal
$color-exito: #28a745;         // Verde éxito
$color-peligro: #dc3545;       // Rojo peligro
```

### Cambiar espaciado

```scss
$espaciado-sm: 10px;
$espaciado-md: 15px;
$espaciado-lg: 20px;
```

### Agregar un nuevo estado

En `scss/_variables.scss`:

```scss
$estados: (
  'X': (bg: #ffc107, color: #000),
  'N': (bg: #17a2b8, color: #fff),  // Nuevo estado
  // ...
);
```

Y en `js/main.js`:

```javascript
const NOMBRES_ESTADO = {
  'X': 'Extrajudicial',
  'N': 'Nuevo Estado',  // Agregar aquí
  // ...
};
```

## 📊 Funcionalidades

### Página Principal (index.html)
- Dashboard con estadísticas en tiempo real
- Accesos directos a todas las funciones

### Carga Masiva (carga.html)
- Carga de archivos Excel (.xlsx, .xls)
- Preview de datos antes de cargar
- Mapeo automático de columnas
- Carga por lotes a Supabase

### Consulta (consulta.html)
- Búsqueda en tiempo real
- Filtrado por estado
- Edición inline con modal
- Eliminación de causas

### Administración (admin.html)
- Exportación a Excel (todos o por estado)
- Estadísticas detalladas
- Limpieza de datos de prueba

## 🔒 Seguridad

⚠️ **IMPORTANTE**: La API key de Supabase está expuesta en el código cliente. Para producción:

1. Habilitar **Row Level Security (RLS)** en Supabase
2. Configurar políticas de acceso por usuario
3. Considerar un backend intermediario para operaciones sensibles

## 🗃️ Base de Datos

Tabla `deudas`:

```sql
CREATE TABLE deudas (
  id SERIAL PRIMARY KEY,
  expediente TEXT,
  caratula TEXT,
  deudor TEXT,
  documento TEXT,
  monto DECIMAL(12,2),
  estado CHAR(1) DEFAULT 'X',
  observaciones TEXT,
  fecha_carga TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP
);
```

## 📱 Compatibilidad

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 📝 Licencia

MIT - Estudio LC 2025
