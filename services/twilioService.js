const twilio = require('twilio');

/**
 * Servicio para enviar mensajes proactivos de WhatsApp vía Twilio
 * Se usa exclusivamente para enviar tickets después de una compra confirmada
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM 

// Validar configuración
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn('⚠️  WARNING: TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están configurados en las variables de entorno');
}

// Cliente de Twilio
const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

/**
 * Enviar mensaje de WhatsApp usando una plantilla de contenido de Twilio
 * Se usa para mensajes proactivos (fuera de la ventana de 24h)
 *
 * @param {string} phoneNumber - Número de teléfono del destinatario (ej: 521234567890)
 * @param {string} contentSid - SID de la plantilla de contenido en Twilio (ej: HXxxxxxxxxx)
 * @param {Object} contentVariables - Variables para la plantilla (ej: { "1": "Juan", "2": "Concierto" })
 * @returns {Promise<Object>} Resultado del envío
 */
async function sendTemplateMessage(phoneNumber, contentSid, contentVariables = {}) {
  try {
    if (!client) {
      throw new Error('Cliente de Twilio no inicializado. Verificar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.');
    }

    // Formatear número: asegurar formato whatsapp:+XXXXXXXXXXX
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log(`📋 [Twilio] Enviando plantilla ${contentSid} a ${formattedPhone}...`);

    const message = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: formattedPhone,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVariables)
    });

    console.log(`✅ [Twilio] Mensaje enviado - SID: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
      status: message.status
    };

  } catch (error) {
    console.error('❌ [Twilio] Error enviando plantilla:', error.message);
    throw {
      success: false,
      error: error.message,
      code: error.code || null
    };
  }
}

/**
 * Enviar mensaje de texto libre por WhatsApp vía Twilio
 * Solo funciona dentro de la ventana de 24 horas de sesión
 *
 * @param {string} phoneNumber - Número de teléfono del destinatario
 * @param {string} message - Texto del mensaje
 * @returns {Promise<Object>} Resultado del envío
 */
async function sendMessage(phoneNumber, message) {
  try {
    if (!client) {
      throw new Error('Cliente de Twilio no inicializado. Verificar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.');
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log(`💬 [Twilio] Enviando mensaje a ${formattedPhone}...`);

    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: formattedPhone,
      body: message
    });

    console.log(`✅ [Twilio] Mensaje enviado - SID: ${result.sid}`);

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    };

  } catch (error) {
    console.error('❌ [Twilio] Error enviando mensaje:', error.message);
    throw {
      success: false,
      error: error.message,
      code: error.code || null
    };
  }
}

/**
 * Formatear número de teléfono al formato requerido por Twilio WhatsApp
 * @param {string} phoneNumber - Número en cualquier formato
 * @returns {string} Número formateado como whatsapp:+XXXXXXXXXXX
 */
function formatPhoneNumber(phoneNumber) {
  // Remover todo excepto dígitos
  let cleaned = phoneNumber.replace(/[^\d]/g, '');

  // Agregar prefijo de WhatsApp
  return `whatsapp:+${cleaned}`;
}

module.exports = {
  sendTemplateMessage,
  sendMessage
};

