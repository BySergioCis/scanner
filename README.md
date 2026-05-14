# 📷 Lector de Código de Barras con Google Sheets

Aplicación web para escanear códigos de barras usando la cámara del celular, con autenticación y almacenamiento en Google Sheets.

## 🚀 Funcionalidades

- **Login seguro**: Verifica usuario/contraseña desde una hoja de Google Sheets
- **Escáner de códigos**: Escanea códigos de barras con la cámara del dispositivo
- **Guardado automático**: Almacena los códigos escaneados en Google Sheets con fecha/hora y usuario
- **Interfaz responsive**: Funciona en celulares, tablets y computadoras

## 📁 Estructura del proyecto

```
lector-de-codigos/
├── index.html      # Interfaz de la aplicación
├── style.css       # Estilos y diseño responsive
├── app.js          # Lógica principal (login, escáner, guardado)
├── config.js       # Configuración (URL de Google Apps Script)
├── Code.gs         # Backend en Google Apps Script
└── README.md       # Este archivo
```

## 🔧 Configuración Paso a Paso

### 1. Crear el Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com) y crea una hoja de cálculo nueva
2. Nómbrala como prefieras (ej: "LectorCodigos")
3. Crea **2 pestañas (hojas)** llamadas exactamente `login` y `base`:

#### Hoja 1: `login`
| zona | ruta | usuario | contraseña |
|------|------|---------|-------------|
| zona1 | ruta1 | admin | 123456 |
| zona2 | ruta2 | juan | clave123 |

#### Hoja 2: `base`
| Fecha | Codigo | Usuario |
|-------|--------|---------|
| (se llenará automáticamente) | | |

> Importante: los nombres de pestaña deben ser exactamente `login` y `base` si usas la configuración actual.

### 2. Configurar Google Apps Script

1. En tu Google Sheet, ve a **Extensiones > Apps Script**
2. Borra el código que aparece por defecto
3. **Copia TODO el contenido de `Code.gs`** y pégalo en el editor
4. Haz clic en **Guardar** (💾) y nombra el proyecto
5. Si el script no está vinculado directamente al spreadsheet, pega el ID del Sheet en `SPREADSHEET_ID` dentro de `Code.gs`
   - El ID está en la URL de tu Google Sheet entre `/d/` y `/edit`
6. Ve a **Implementar > Nueva implementación**
   - **Tipo**: Aplicación web
   - **Ejecutar como**: "Yo"
   - **Acceso**: "Cualquiera, incluso anónimo"
   - Haz clic en **Implementar**
7. Copia la URL que aparece (algo como `https://script.google.com/macros/s/XXXXX/exec`)

### 3. Configurar la aplicación web

1. Abre el archivo **`config.js`**
2. Reemplaza la URL de ejemplo con la URL que copiaste:
   ```js
   const APP_URL = "https://script.google.com/macros/s/TU_URL_AQUI/exec";
   ```
3. Guarda el archivo

### 4. Deploy a GitHub Pages

1. Crea un repositorio nuevo en GitHub
2. Sube los archivos del proyecto al repositorio
   - Si tienes Git instalado: inicializa el repo localmente, agrega archivos y haz commit
   - Si no tienes Git, sube los archivos manualmente desde la interfaz web de GitHub
3. Empuja el repositorio a GitHub y mantén la rama principal llamada `main`
4. Usa el flujo de trabajo incluido para publicar en GitHub Pages automáticamente:
   - Al hacer `push` a `main`, se desplegará en la rama `gh-pages`
5. Abre la configuración del repositorio y selecciona GitHub Pages
   - Si no se configura automáticamente, selecciona la rama `gh-pages`
   - La URL será `https://<tu-usuario>.github.io/<tu-repo>/`

> Si no tienes Git instalado, usa GitHub Desktop o sube los archivos con GitHub web.

### 5. Usar la aplicación

1. Abre la URL de GitHub Pages en tu navegador
2. En el celular: acepta los permisos de cámara
3. Ingresa con un usuario registrado en tu Google Sheet
4. ¡Comienza a escanear códigos de barras!

## 📱 Uso en Celular

- Abre `index.html` en el navegador de tu celular
- Acepta el permiso de cámara cuando lo solicite
- Enfoca un código de barras - se detectará automáticamente
- Presiona **"Guardar Código"** para almacenarlo en Google Sheets
- Presiona **"Re-escanear"** para escanear otro código

> 💡 **Tip**: Puedes usar servicios gratuitos como [Netlify](https://netlify.com), [Vercel](https://vercel.com) o [GitHub Pages](https://pages.github.com) para hosting gratuito.

## 🔒 Seguridad

- Las contraseñas se comparan directamente en Google Sheets
- Recomendación: en un entorno productivo, usa contraseñas hash
- La comunicación con Apps Script usa HTTPS
- Los datos sensibles (credenciales) no se almacenan en el frontend

## 🛠️ Tecnologías

- **Frontend**: HTML, CSS, JavaScript vanilla
- **Escáner**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) v2.3.8
- **Backend**: Google Apps Script
- **Base de datos**: Google Sheets

## ❓ Solución de Problemas

**El escáner no se activa:**
- Asegúrate de dar permiso de cámara en el navegador
- Usa HTTPS o localhost (la cámara no funciona con archivo local en algunos navegadores)
- Prueba con otro navegador

**Error al hacer login:**
- Verifica que la URL en `config.js` sea correcta
- Asegúrate de que el usuario existe en la hoja "Usuarios"
- Revisa que el proyecto de Apps Script esté desplegado

**Error CORS:**
- La app usa JSONP como fallback automático
- Asegúrate que la app web de Apps Script tenga acceso público