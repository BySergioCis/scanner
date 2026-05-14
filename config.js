/**
 * CONFIGURACIÓN - Lector de Código de Barras
 * ===========================================
 * 
 * INSTRUCCIONES:
 * 1. Despliega Code.gs como Aplicación Web en Google Apps Script
 * 2. Copia la URL generada (https://script.google.com/macros/s/.../exec)
 * 3. Pégala debajo en APP_URL
 * 4. ¡La URL debe terminar en /exec!
 */

// ★★★ CAMBIA ESTA URL POR LA DE TU APLICACIÓN WEB DE Google Apps Script ★★★
const APP_URL = "https://script.google.com/macros/s/AKfycbwoDKD0bU8VeYuzycrfZ8dMFPAmmT7WZROzpWDGJEt4sdyQU7y5pI_alxadc0P1L1Ls/exec";

// Nombres de las pestañas del spreadsheet
const HOJA_USUARIOS = "login";
const HOJA_CODIGOS = "base";

// Configuración del escáner
const SCANNER_CONFIG = {
  fps: 30,                // Fotogramas por segundo
  qrbox: { width: 300, height: 200 },  // Área de escaneo
  aspectRatio: 1.0
};