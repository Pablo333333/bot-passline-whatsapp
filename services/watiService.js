const axios = require('axios');

/**
 * Servicio para interactuar con la API de WATI
 * Documentación: https://docs.wati.io/
 */

const WATI_BASE_URL = process.env.WATI_BASE_URL;
const WATI_ACCESS_TOKEN = process.env.WATI_ACCESS_TOKEN;

// Validar configuración (warning en lugar de error para no bloquear)
if (!WATI_ACCESS_TOKEN) {
  console.warn('⚠️  WARNING: WATI_ACCESS_TOKEN no está configurado en las variables de entorno');
}

/**
 * Cliente HTTP configurado para WATI
 */
const watiClient = axios.create({
  baseURL: WATI_BASE_URL,
  headers: {
    'Authorization': `Bearer ${WATI_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 segundos
});

// Interceptors optimizados (sin logs verbosos para velocidad)
watiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ WATI:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

/**
 * Enviar mensaje de sesión (texto libre)
 * Se usa cuando el usuario ya inició conversación en las últimas 24 horas
 * 
 * @param {string} phoneNumber - Número de teléfono (formato: 521234567890)
 * @param {string} message - Mensaje de texto a enviar
 * @returns {Promise<Object>} Respuesta de la API
 */
async function sendSessionMessage(phoneNumber, message) {
  try {
    // Formatear número de teléfono (asegurar que no tenga +)
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    // Codificar el mensaje para URL (espacios, emojis, etc.)
    const encodedMessage = encodeURIComponent(message);

    // Construir URL con query parameter
    const url = `/api/v1/sendSessionMessage/${formattedPhone}?messageText=${encodedMessage}`;

    // POST sin body (el texto va en la URL) - SIN LOGS para velocidad
    const response = await watiClient.post(url);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id
    };

  } catch (error) {
    console.error('❌ WATI error:', error.response?.status, error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Enviar mensaje con plantilla (template)
 * Se usa para iniciar conversaciones o cuando pasaron más de 24 horas
 * 
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} templateName - Nombre de la plantilla en WATI
 * @param {Object} parameters - Parámetros de la plantilla
 * @returns {Promise<Object>} Respuesta de la API
 */
async function sendTemplateMessage(phoneNumber, templateName, parameters = {}) {
  try {
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    const payload = {
      whatsappNumber: formattedPhone,
      template_name: templateName,
      broadcast_name: `Bot_${Date.now()}`,
      parameters: parameters
    };

    console.log(`📋 Enviando template "${templateName}" a ${formattedPhone}...`);

    const response = await watiClient.post('/api/v1/sendTemplateMessage', payload);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id
    };

  } catch (error) {
    console.error('❌ Error enviando template:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Enviar mensaje con imagen
 * 
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} imageUrl - URL de la imagen
 * @param {string} caption - Texto que acompaña la imagen (opcional)
 * @returns {Promise<Object>} Respuesta de la API
 */
async function sendImageMessage(phoneNumber, imageUrl, caption = '') {
  try {
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    const payload = {
      whatsappNumber: formattedPhone,
      media_url: imageUrl,
      caption: caption
    };

    console.log(`🖼️ Enviando imagen a ${formattedPhone}...`);

    const response = await watiClient.post('/api/v1/sendSessionImage', payload);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id
    };

  } catch (error) {
    console.error('❌ Error enviando imagen:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Enviar mensaje con archivo/documento
 * 
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} fileUrl - URL del archivo
 * @param {string} filename - Nombre del archivo (opcional)
 * @returns {Promise<Object>} Respuesta de la API
 */
async function sendDocumentMessage(phoneNumber, fileUrl, filename = 'documento.pdf') {
  try {
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    const payload = {
      whatsappNumber: formattedPhone,
      media_url: fileUrl,
      filename: filename
    };

    console.log(`📄 Enviando documento a ${formattedPhone}...`);

    const response = await watiClient.post('/api/v1/sendSessionFile', payload);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id
    };

  } catch (error) {
    console.error('❌ Error enviando documento:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Obtener información de un contacto
 * 
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<Object>} Información del contacto
 */
async function getContactInfo(phoneNumber) {
  try {
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    console.log(`👤 Obteniendo información de contacto: ${formattedPhone}...`);

    const response = await watiClient.get(`/api/v1/getContact/${formattedPhone}`);

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error obteniendo contacto:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Marcar mensaje como leído
 * 
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Respuesta de la API
 */
async function markMessageAsRead(messageId) {
  try {
    console.log(`✓ Marcando mensaje como leído: ${messageId}...`);

    const response = await watiClient.post(`/api/v1/markMessageRead/${messageId}`);

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error marcando mensaje como leído:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Enviar mensaje con botones interactivos
 * 
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} bodyText - Texto del mensaje
 * @param {Array} buttons - Array de botones [{id: '1', title: 'Opción 1'}, ...]
 * @param {string} headerText - Texto del encabezado (opcional)
 * @param {string} footerText - Texto del pie (opcional)
 * @returns {Promise<Object>} Respuesta de la API
 */
async function sendInteractiveButtons(phoneNumber, bodyText, buttons, headerText = '', footerText = '') {
  try {
    const formattedPhone = phoneNumber.replace(/\+/g, '');

    const payload = {
      whatsappNumber: formattedPhone,
      body: bodyText,
      buttons: buttons,
      ...(headerText && { header: headerText }),
      ...(footerText && { footer: footerText })
    };

    console.log(`🔘 Enviando botones interactivos a ${formattedPhone}...`);

    const response = await watiClient.post('/api/v1/sendInteractiveButtonsMessage', payload);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id
    };

  } catch (error) {
    console.error('❌ Error enviando botones:', error.response?.data || error.message);
    
    throw {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    };
  }
}

module.exports = {
  sendSessionMessage,
  sendTemplateMessage,
  sendImageMessage,
  sendDocumentMessage,
  getContactInfo,
  markMessageAsRead,
  sendInteractiveButtons
};

