/**
 * APLICACIÓN WEB - Lector de Código de Barras con Google Sheets
 * ============================================================
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Abre https://script.google.com/ y crea un nuevo proyecto
 * 2. Copia este código en el editor
 * 3. Crea un Google Sheet con dos hojas (pestañas):
 *    - "login": Columnas zona, ruta, usuario, contraseña
 *    - "base": Columnas Fecha, Zona, Ruta, IMEI
 * 4. Asocia el script al Sheet: Recursos > Proyecto de Google Cloud > (selecciona tu sheet)
 * 5. Despliega como aplicación web:
 *    - Publicar > Implementar como aplicación web
 *    - Ejecutar como: "Yo"
 *    - Acceso: "Cualquiera, incluso anónimo" (Anyone, even anonymous)
 * 6. Copia la URL de la aplicación web generada
 * 7. Pega esa URL en el archivo config.js del frontend
 */

// Nombre del Spreadsheet (se obtiene automáticamente del asociado)
const SHEET_NAME_USUARIOS = "login";
const SHEET_NAME_CODIGOS = "base";

// Si el script no está vinculado directamente al spreadsheet, pega aquí el ID de la hoja de cálculo:
const SPREADSHEET_ID = "1a-6d8XA6pHeJ5BLPmsEL5gwn__BFgtEtLWflwWmZaYc"; // Ej: "1AbCdeFGhiJkLmNoPqRsTuvWXyz12345"

/**
 * Maneja las peticiones GET (login y consultas)
 * 
 * @param {Object} e - Parámetros de la petición
 * @param {string} e.param.accion - "login"
 * @param {string} e.param.usuario - Nombre de usuario
 * @param {string} e.param.password - Contraseña
 */
function doGet(e) {
  // Configurar CORS
  return handleRequest(e, 'GET');
}

/**
 * Maneja las peticiones POST (guardar códigos)
 * 
 * @param {Object} e - Parámetros de la petición
 * @param {string} e.param.accion - "guardar"
 * @param {string} e.param.codigo - Código de barras escaneado (IMEI)
 * @param {string} e.param.usuario - Usuario que escaneó
 * @param {string} e.param.zona - Zona del usuario (opcional)
 * @param {string} e.param.ruta - Ruta del usuario (opcional)
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Función central que maneja todas las peticiones
 */
function handleRequest(e, method) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const accion = params.accion || '';
    const callback = params.callback || '';
    
    if (method === 'GET' && accion === 'login') {
      return verificarLogin(params.usuario, params.password, callback);
    } else if (method === 'POST' && accion === 'guardar') {
      return guardarCodigo(
        params.codigo, 
        params.usuario, 
        params.zona, 
        params.ruta, 
        callback
      );
    } else {
      return responderJSON({ error: true, mensaje: 'Acción no válida' }, 400, callback);
    }
  } catch (error) {
    const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
    return responderJSON({ error: true, mensaje: 'Error del servidor: ' + error.toString() }, 500, callback);
  }
}

/**
 * Verifica las credenciales del usuario contra la hoja "Usuarios"
 */
function verificarLogin(usuario, password, callback) {
  if (!usuario || !password) {
    return responderJSON({ error: true, mensaje: 'Usuario y contraseña son requeridos' }, 400, callback);
  }
  
  const ss = getSpreadsheet();
  if (!ss) {
    return responderJSON({ error: true, mensaje: 'No se pudo abrir la hoja de cálculo. Verifica el ID y el despliegue.' }, 500, callback);
  }
  const sheet = ss.getSheetByName(SHEET_NAME_USUARIOS);
  if (!sheet) {
    return responderJSON({ error: true, mensaje: 'Hoja de usuarios no encontrada' }, 500, callback);
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return responderJSON({ error: true, mensaje: 'No hay datos de usuarios en la hoja' }, 500);
  }
  
  const headers = data[0].map(cell => cell.toString().trim().toLowerCase());
  const usuarioIndex = headers.indexOf('usuario');
  const passwordIndex = headers.indexOf('contraseña');
  const zonaIndex = headers.indexOf('zona');
  const rutaIndex = headers.indexOf('ruta');
  
  if (usuarioIndex === -1 || passwordIndex === -1) {
    return responderJSON({ error: true, mensaje: 'Encabezados de usuario o contraseña no encontrados' }, 500, callback);
  }
  
  const usuarioBuscado = usuario.toString().trim().toLowerCase();
  const passwordBuscada = password.toString().trim();
  
  for (let i = 1; i < data.length; i++) {
    const fila = data[i];
    const user = fila[usuarioIndex] ? fila[usuarioIndex].toString().trim().toLowerCase() : '';
    const pass = fila[passwordIndex] ? fila[passwordIndex].toString().trim() : '';
    
    if (user === usuarioBuscado && pass === passwordBuscada) {
      const usuarioReal = fila[usuarioIndex] ? fila[usuarioIndex].toString().trim() : usuario;
      const zona = zonaIndex !== -1 && fila[zonaIndex] ? fila[zonaIndex].toString().trim() : '';
      const ruta = rutaIndex !== -1 && fila[rutaIndex] ? fila[rutaIndex].toString().trim() : '';
      return responderJSON({ 
        error: false, 
        success: true,
        mensaje: 'Login exitoso',
        usuario: usuarioReal,
        zona: zona,
        ruta: ruta
      });
    }
  }
  
  return responderJSON({ error: true, mensaje: 'Usuario o contraseña incorrectos' }, 401);
}

/**
 * Guarda un código de barras en la hoja "base"
 * Columnas: A:Fecha, B:Zona, C:Ruta, D:IMEI
 */
function guardarCodigo(codigo, usuario, zona, ruta, callback) {
  if (!codigo) {
    return responderJSON({ error: true, mensaje: 'Código de barras es requerido' }, 400, callback);
  }
  
  const ss = getSpreadsheet();
  if (!ss) {
    return responderJSON({ error: true, mensaje: 'No se pudo abrir la hoja de cálculo. Verifica el ID y el despliegue.' }, 500, callback);
  }
  const sheet = ss.getSheetByName(SHEET_NAME_CODIGOS);
  if (!sheet) {
    return responderJSON({ error: true, mensaje: 'Hoja de códigos no encontrada' }, 500, callback);
  }
  
  const fecha = new Date();
  const fechaFormateada = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  
  // Estructura solicitada: [Fecha, Zona, Ruta, IMEI]
  // Aseguramos que los valores no sean nulos para evitar desplazamientos
  const nuevaFila = [
    fechaFormateada,
    zona || '',
    ruta || '',
    codigo.toString().trim()
  ];
  
  sheet.appendRow(nuevaFila);
  
  return responderJSON({ 
    error: false, 
    success: true,
    mensaje: 'Código guardado exitosamente',
    datos: {
      fecha: fechaFormateada,
      zona: zona || '',
      ruta: ruta || '',
      imei: codigo.toString().trim(),
      usuario: usuario || 'Desconocido'
    }
  }, 200, callback);
}

/**
 * Abre la hoja de cálculo principal
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (error) {
      return null;
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Helper para construir respuestas JSON o JSONP
 */
function responderJSON(data, statusCode, callback) {
  var output;
  if (callback && /^[a-zA-Z0-9_]+$/.test(callback)) {
    output = ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
  }
  
  return output;
}