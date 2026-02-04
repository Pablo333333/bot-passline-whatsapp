/**
 * Funciones auxiliares y utilidades
 */

/**
 * Formatear número de teléfono para WhatsApp
 * Remueve caracteres especiales y asegura formato correcto
 * 
 * @param {string} phone - Número de teléfono en cualquier formato
 * @returns {string} Número formateado (sin + ni espacios)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remover todo excepto dígitos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si no empieza con código de país, agregar México por defecto (52)
  if (!cleaned.startsWith('521') && cleaned.length === 10) {
    cleaned = '521' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validar formato de número de teléfono
 * 
 * @param {string} phone - Número a validar
 * @returns {boolean} True si es válido
 */
function isValidPhoneNumber(phone) {
  const cleaned = formatPhoneNumber(phone);
  
  // Debe tener al menos 10 dígitos
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}

/**
 * Truncar texto a longitud máxima
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a agregar (default: '...')
 * @returns {string} Texto truncado
 */
function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Sanitizar entrada de usuario (prevenir inyecciones)
 * 
 * @param {string} input - Texto de entrada
 * @returns {string} Texto sanitizado
 */
function sanitizeInput(input) {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remover < y >
    .trim()
    .substring(0, 4096); // Límite de WhatsApp
}

/**
 * Formatear fecha a español
 * 
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
  const d = new Date(date);
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City'
  };
  
  return d.toLocaleDateString('es-MX', options);
}

/**
 * Formatear precio en pesos mexicanos
 * 
 * @param {number} amount - Cantidad
 * @returns {string} Precio formateado
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

/**
 * Extraer URLs de un texto
 * 
 * @param {string} text - Texto a analizar
 * @returns {Array<string>} Array de URLs encontradas
 */
function extractUrls(text) {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Generar ID único simple
 * 
 * @returns {string} ID único
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Delay/Sleep asíncrono
 * 
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promesa que se resuelve después del delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry automático para funciones asíncronas
 * 
 * @param {Function} fn - Función a ejecutar
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Delay entre reintentos (ms)
 * @returns {Promise} Resultado de la función
 */
async function retryAsync(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Reintentando... (${retries} intentos restantes)`);
    await sleep(delay);
    
    return retryAsync(fn, retries - 1, delay * 1.5);
  }
}

/**
 * Verificar si un texto contiene palabras clave
 * 
 * @param {string} text - Texto a analizar
 * @param {Array<string>} keywords - Palabras clave a buscar
 * @returns {boolean} True si contiene alguna palabra clave
 */
function containsKeywords(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  
  return keywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Obtener score de coincidencia de keywords
 * 
 * @param {string} text - Texto a analizar
 * @param {Array<string>} keywords - Palabras clave
 * @returns {number} Score (número de coincidencias)
 */
function getKeywordScore(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return 0;
  
  const lowerText = text.toLowerCase();
  
  return keywords.reduce((score, keyword) => {
    return score + (lowerText.includes(keyword.toLowerCase()) ? 1 : 0);
  }, 0);
}

/**
 * Escapar caracteres especiales para regex
 * 
 * @param {string} string - String a escapar
 * @returns {string} String escapado
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Capitalizar primera letra
 * 
 * @param {string} text - Texto
 * @returns {string} Texto capitalizado
 */
function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Validar estructura de webhook de WATI
 * 
 * @param {Object} payload - Payload recibido
 * @returns {boolean} True si es válido
 */
function isValidWatiWebhook(payload) {
  return !!(
    payload &&
    payload.waId &&
    payload.eventType === 'message' &&
    payload.text
  );
}

/**
 * Validar estructura de webhook de Passline
 * 
 * @param {Object} payload - Payload recibido
 * @returns {boolean} True si es válido
 */
function isValidPasslineWebhook(payload) {
  return !!(
    payload &&
    payload.orderId &&
    payload.customerPhone &&
    payload.status &&
    (payload.status === 'success' || payload.status === 'completed')
  );
}

/**
 * Logs con colores en consola
 */
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️  ${message}`),
  error: (message) => console.error(`❌ ${message}`),
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 ${message}`);
    }
  }
};

module.exports = {
  formatPhoneNumber,
  isValidPhoneNumber,
  truncateText,
  sanitizeInput,
  formatDate,
  formatCurrency,
  extractUrls,
  generateId,
  sleep,
  retryAsync,
  containsKeywords,
  getKeywordScore,
  escapeRegex,
  capitalize,
  isValidWatiWebhook,
  isValidPasslineWebhook,
  logger
};




