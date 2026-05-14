/**
 * APLICACIÓN PRINCIPAL - Lector de Código de Barras
 * =================================================
 * 
 * Funcionalidades:
 * - Login con verificación contra Google Sheets
 * - Escaneo de códigos de barras con cámara
 * - Guardado de códigos en Google Sheets
 */

// =============================================
// ESTADO DE LA APLICACIÓN
// =============================================
const state = {
  usuario: null,
  zona: null,
  ruta: null,
  ultimoCodigo: null,
  escaneando: false,
  html5QrCode: null
};

// =============================================
// REFERENCIAS DEL DOM
// =============================================
const DOM = {
  loginSection: document.getElementById('loginSection'),
  scannerSection: document.getElementById('scannerSection'),
  loginForm: document.getElementById('loginForm'),
  usuario: document.getElementById('usuario'),
  password: document.getElementById('password'),
  btnLogin: document.getElementById('btnLogin'),
  loginAlert: document.getElementById('loginAlert'),
  scannerAlert: document.getElementById('scannerAlert'),
  reader: document.getElementById('reader'),
  resultBox: document.getElementById('resultBox'),
  codigoDisplay: document.getElementById('codigoDisplay'),
  fechaDisplay: document.getElementById('fechaDisplay'),
  btnGuardar: document.getElementById('btnGuardar'),
  btnReescanear: document.getElementById('btnReescanear'),
  btnCerrarSesion: document.getElementById('btnCerrarSesion'),
  userBadge: document.getElementById('userBadge'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText')
};

// =============================================
// UTILIDADES
// =============================================

function mostrarAlerta(tipo, mensaje, elemento) {
  elemento.className = `alert alert-${tipo}`;
  elemento.textContent = mensaje;
  elemento.style.display = 'block';
}

function ocultarAlerta(elemento) {
  elemento.style.display = 'none';
  elemento.className = 'alert';
}

function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function formatearFecha() {
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, '0');
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const anio = ahora.getFullYear();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
}

// =============================================
// API - COMUNICACIÓN CON GOOGLE APPS SCRIPT
// =============================================

/**
 * Llama a la API de Google Apps Script
 */
async function llamarAPI(params, method = 'GET') {
  return await fetchConProxy(APP_URL, params, method);
}

/**
 * Estrategia de fetch con múltiples intentos
 * Apps Script como web app a veces requiere JSONP
 */
async function fetchConProxy(url, params, method) {
  // Intentar fetch normal primero
  try {
    const options = {
      method: method,
      mode: 'cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    if (method === 'POST') {
      const bodyParams = new URLSearchParams();
      Object.keys(params).forEach(key => bodyParams.append(key, params[key]));
      options.body = bodyParams.toString();
    } else {
      // GET con parámetros en URL
      const urlObj = new URL(url);
      Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
      url = urlObj.toString();
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();

    if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('accounts.google.com')) {
      throw new Error('La URL de Apps Script está devolviendo una página de inicio de sesión. Revisa el despliegue público de la aplicación web.');
    }
    
    // Intentar parsear como JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Respuesta no es JSON válido');
    }
  } catch (error) {
    console.warn('Fetch normal falló, intentando con JSONP...', error);
    return await fetchJSONP(url, params);
  }
}

/**
 * Fallback: JSONP para cuando CORS bloquea
 */
function fetchJSONP(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now();
    
    // Crear URL con parámetros + callback
    const urlObj = new URL(url);
    Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
    urlObj.searchParams.append('callback', callbackName);

    // Definir callback global
    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    // Crear script tag
    const script = document.createElement('script');
    script.src = urlObj.toString();
    script.async = true;

    function cleanup() {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // Timeout
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de espera agotado'));
    }, 15000);

    script.onerror = function() {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Error de red'));
    };

    script.onload = function() {
      clearTimeout(timeout);
      // Si llegó aquí y no se llamó el callback, algo falló
      setTimeout(() => {
        cleanup();
        reject(new Error('No se recibió respuesta'));
      }, 1000);
    };

    document.head.appendChild(script);
  });
}

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

/**
 * LOGIN - Verifica credenciales contra Google Sheets
 */
async function handleLogin(e) {
  e.preventDefault();
  ocultarAlerta(DOM.loginAlert);

  const usuario = DOM.usuario.value.trim();
  const password = DOM.password.value.trim();

  if (!usuario || !password) {
    mostrarAlerta('error', '⚠️ Por favor ingresa usuario y contraseña', DOM.loginAlert);
    return;
  }

  setLoading(DOM.btnLogin, true);

  try {
    const respuesta = await llamarAPI({
      accion: 'login',
      usuario: usuario,
      password: password
    }, 'GET');

    if (respuesta && respuesta.success === true) {
      state.usuario = respuesta.usuario || usuario;
      state.zona = respuesta.zona || '';
      state.ruta = respuesta.ruta || '';
      mostrarPantallaScanner();
    } else {
      mostrarAlerta('error', 
        respuesta?.mensaje || '❌ Usuario o contraseña incorrectos', 
        DOM.loginAlert
      );
    }
  } catch (error) {
    console.error('Error en login:', error);
    let mensaje = '❌ Error de conexión. Verifica que la URL en config.js sea correcta.\nDetalles: ' + error.message;
    if (error.message.includes('página de inicio de sesión')) {
      mensaje = '❌ La aplicación web de Google Apps Script requiere acceso público. Revisa el despliegue y selecciona "Anyone, even anonymous".';
    }
    mostrarAlerta(
      'error',
      mensaje,
      DOM.loginAlert
    );
  } finally {
    setLoading(DOM.btnLogin, false);
  }
}

/**
 * Muestra la pantalla del escáner
 */
function mostrarPantallaScanner() {
  DOM.loginSection.style.display = 'none';
  DOM.scannerSection.style.display = 'block';
  DOM.userBadge.textContent = `👤 ${state.usuario}`;
  ocultarAlerta(DOM.scannerAlert);
  iniciarEscanner();
}

/**
 * Muestra la pantalla de login
 */
function mostrarPantallaLogin() {
  detenerEscanner();
  DOM.scannerSection.style.display = 'none';
  DOM.loginSection.style.display = 'block';
  DOM.usuario.value = '';
  DOM.password.value = '';
  ocultarAlerta(DOM.loginAlert);
}

// =============================================
// ESCÁNER DE CÓDIGO DE BARRAS
// =============================================

/**
 * Inicia el escáner con la cámara trasera
 */
function iniciarEscanner() {
  if (state.html5QrCode) {
    detenerEscanner();
  }

  // Mostrar el contenedor del escáner
  DOM.reader.style.display = 'block';
  actualizarEstadoCamara('activando');

  state.html5QrCode = new Html5Qrcode("reader");

  const config = {
    fps: SCANNER_CONFIG.fps || 30,
    qrbox: SCANNER_CONFIG.qrbox || { width: 300, height: 200 },
    aspectRatio: SCANNER_CONFIG.aspectRatio || 1.0
  };

  // Intentar con cámara trasera primero
  Html5Qrcode.getCameras().then(cameras => {
    if (cameras && cameras.length > 0) {
      // Buscar cámara trasera
      const backCamera = cameras.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('environment')
      ) || cameras[0];

      state.html5QrCode.start(
        { deviceId: backCamera.id },
        config,
        onScanSuccess,
        onScanFailure
      ).then(() => {
        state.escaneando = true;
        actualizarEstadoCamara('activa');
      }).catch(err => {
        console.error('Error al iniciar cámara:', err);
        actualizarEstadoCamara('error');
        mostrarAlerta('error', '❌ No se pudo acceder a la cámara: ' + err, DOM.scannerAlert);
      });
    } else {
      actualizarEstadoCamara('error');
      mostrarAlerta('error', '❌ No se encontraron cámaras en este dispositivo', DOM.scannerAlert);
    }
  }).catch(err => {
    console.error('Error al listar cámaras:', err);
    actualizarEstadoCamara('error');
    mostrarAlerta('error', '❌ Error al acceder a la cámara: ' + err, DOM.scannerAlert);
  });
}

/**
 * Callback cuando se escanea un código exitosamente
 */
function onScanSuccess(decodedText, decodedResult) {
  // Prevenir escaneos duplicados del mismo código
  if (state.ultimoCodigo === decodedText) return;

  state.ultimoCodigo = decodedText;

  // Mostrar resultado
  DOM.codigoDisplay.textContent = decodedText;
  DOM.fechaDisplay.textContent = `Escaneado el ${formatearFecha()}`;
  DOM.resultBox.style.display = 'block';

  // Vibración háptica si está disponible
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }

  // Pausar escáner momentáneamente
  pausarEscanner();

  console.log('Código escaneado:', decodedText);
}

/**
 * Callback de fallo de escaneo (necesario)
 */
function onScanFailure(error) {
  // Ignorar errores de escaneo (son normales mientras no se encuentra código)
}

/**
 * Pausa el escáner
 */
function pausarEscanner() {
  if (state.html5QrCode && state.escaneando) {
    try {
      state.html5QrCode.pause();
      state.escaneando = false;
      actualizarEstadoCamara('pausada');
    } catch (e) {
      console.warn('Error al pausar:', e);
    }
  }
}

/**
 * Reanuda el escáner
 */
function reanudarEscanner() {
  if (state.html5QrCode && !state.escaneando) {
    try {
      state.html5QrCode.resume();
      state.escaneando = true;
      state.ultimoCodigo = null; // Permitir escanear de nuevo
      actualizarEstadoCamara('activa');
    } catch (e) {
      console.warn('Error al reanudar:', e);
    }
  }
}

/**
 * Detiene completamente el escáner
 */
function detenerEscanner() {
  if (state.html5QrCode) {
    try {
      if (state.html5QrCode.isScanning) {
        state.html5QrCode.stop().catch(e => console.warn('Error al detener:', e));
      }
    } catch (e) {
      console.warn('Error al detener escáner:', e);
    }
    state.html5QrCode = null;
    state.escaneando = false;
    state.ultimoCodigo = null;
    actualizarEstadoCamara('inactiva');
  }
}

/**
 * Actualiza el estado visual de la cámara
 */
function actualizarEstadoCamara(estado) {
  const estados = {
    'activa': { dot: 'dot-active', text: '📷 Cámara activa - enfoca un código' },
    'inactiva': { dot: 'dot-inactive', text: '📷 Cámara desactivada' },
    'pausada': { dot: 'dot-inactive', text: '⏸️ Escáner pausado' },
    'activando': { dot: 'dot-inactive', text: '⏳ Iniciando cámara...' },
    'error': { dot: 'dot-inactive', text: '❌ Error con la cámara' }
  };

  const info = estados[estado] || estados['inactiva'];
  DOM.statusDot.className = `dot ${info.dot}`;
  DOM.statusText.textContent = info.text;
}

// =============================================
// GUARDAR CÓDIGO EN GOOGLE SHEETS
// =============================================

async function guardarCodigo() {
  if (!state.ultimoCodigo) {
    mostrarAlerta('error', '⚠️ Primero escanea un código de barras', DOM.scannerAlert);
    return;
  }

  setLoading(DOM.btnGuardar, true);
  ocultarAlerta(DOM.scannerAlert);

  try {
    const respuesta = await llamarAPI({
      accion: 'guardar',
      codigo: state.ultimoCodigo,
      usuario: state.usuario,
      zona: state.zona,
      ruta: state.ruta
    }, 'POST');

    if (respuesta && respuesta.success === true) {
      mostrarAlerta('success', 
        `✅ Código guardado exitosamente:\n${state.ultimoCodigo}`, 
        DOM.scannerAlert
      );
      // Reiniciar para nuevo escaneo
      state.ultimoCodigo = null;
      DOM.codigoDisplay.textContent = '-';
      DOM.fechaDisplay.textContent = '';
      DOM.resultBox.style.display = 'none';
      reanudarEscanner();
    } else {
      mostrarAlerta('error', 
        respuesta?.mensaje || '❌ Error al guardar el código', 
        DOM.scannerAlert
      );
    }
  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarAlerta(
      'error',
      '❌ Error de conexión al guardar. Verifica tu conexión e intenta de nuevo.\nDetalles: ' + error.message,
      DOM.scannerAlert
    );
  } finally {
    setLoading(DOM.btnGuardar, false);
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

// Login
DOM.loginForm.addEventListener('submit', handleLogin);

// Guardar código
DOM.btnGuardar.addEventListener('click', guardarCodigo);

// Re-escanear
DOM.btnReescanear.addEventListener('click', () => {
  ocultarAlerta(DOM.scannerAlert);
  if (state.ultimoCodigo) {
    state.ultimoCodigo = null;
    DOM.codigoDisplay.textContent = '-';
    DOM.fechaDisplay.textContent = '';
    DOM.resultBox.style.display = 'none';
  }
  reanudarEscanner();
});

// Cerrar sesión
DOM.btnCerrarSesion.addEventListener('click', () => {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    mostrarPantallaLogin();
  }
});

// =============================================
// INICIALIZACIÓN
// =============================================

console.log('📷 Aplicación Lector de Código de Barras iniciada');
console.log('🔗 URL configurada:', APP_URL);

// Verificar que la URL fue configurada
if (APP_URL.includes('XXXXXXXXX')) {
  mostrarAlerta(
    'info',
    '⚠️ Configuración pendiente: Antes de usar la app, edita config.js y pega la URL de tu Aplicación Web de Google Apps Script.',
    DOM.loginAlert
  );
}