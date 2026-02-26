const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno PRIMERO, antes de importar los servicios
dotenv.config();

// Ahora sí importar los servicios (después de cargar .env)
const watiService = require('./services/watiService');
const twilioService = require('./services/twilioService');
const aiService = require('./services/aiService');
const sheetsService = require('./services/sheetsService');

const app = express();
const PORT = process.env.PORT;

// Cache para detectar mensajes duplicados (WATI puede reintentar webhooks)
const processedMessages = new Map();
const DUPLICATE_CACHE_DURATION = 30 * 1000; // 30 segundos

/**
 * Verificar si un mensaje ya fue procesado recientemente
 */
function isDuplicateMessage(waId, text, timestamp = Date.now()) {
  const messageKey = `${waId}:${text.substring(0, 100)}`; // Usar primeros 100 chars como key
  
  // Limpiar mensajes antiguos del cache
  for (const [key, time] of processedMessages.entries()) {
    if (timestamp - time > DUPLICATE_CACHE_DURATION) {
      processedMessages.delete(key);
    }
  }
  
  // Verificar si ya existe
  if (processedMessages.has(messageKey)) {
    return true;
  }
  
  // Marcar como procesado
  processedMessages.set(messageKey, timestamp);
  return false;
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Ruta de salud del servidor
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bot Passline - WhatsApp Bot está corriendo',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});



/**
 * POST /webhook
 * Webhook para recibir mensajes entrantes de WATI
 */
app.post('/webhook', async (req, res) => {
  try {
    const { waId, text, senderName, eventType } = req.body;

    // Responder INMEDIATAMENTE a WATI (crítico para velocidad)
    res.status(200).json({ status: 'received' });

    // Verificar que sea un mensaje de texto válido
    if (eventType !== 'message' || !text || !waId) {
      console.log('⚠️ Evento ignorado');
      return;
    }

    // Verificar duplicados (WATI puede reintentar webhooks)
    if (isDuplicateMessage(waId, text)) {
      console.log('🔄 Mensaje duplicado ignorado');
      return;
    }

    console.log(`📩 ${senderName}: "${text.substring(0, 50)}..."`);

    // Procesar mensaje de forma asíncrona (sin await para no bloquear)
    setImmediate(() => {
      processUserMessage(waId, text, senderName).catch(error => {
        console.error('❌ Error procesando mensaje:', error.message);
      });
    });

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    // No enviar respuesta aquí porque ya se envió arriba
  }
});

/**
 * POST /webhook/passline
 * Webhook para recibir confirmaciones de pago de Passline
 */
app.post('/webhook/passline', async (req, res) => {
  try {
    console.log('💳 Confirmación de pago recibida:', JSON.stringify(req.body, null, 2));

    const {
      orderId,
      customerPhone,
      customerName,
      customerEmail,
      eventName,
      ticketUrl,
      amount,
      status
    } = req.body;

    // Verificar que el pago fue exitoso
    if (status !== 'success' && status !== 'completed') {
      console.log('⚠️ Pago no completado:', status);
      return res.status(200).json({ status: 'payment_not_completed' });
    }

    // Responder al webhook
    res.status(200).json({ status: 'received' });

    // Enviar ticket al cliente
    await sendTicketToCustomer(customerPhone, customerName, customerEmail, eventName, ticketUrl, orderId);

    // Registrar venta en Google Sheets
    try {
      await sheetsService.saveSale({
        nombre: customerName,
        telefono: customerPhone,
        mail: req.body.customerEmail || '',
        eventoComprado: eventName,
        montoPagado: amount || 0,
        idTransaccion: orderId
      });
      console.log('📊 Venta registrada en Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ No se pudo registrar en Google Sheets:', sheetError.message);
      // No falla el webhook si Sheets falla
    }

  } catch (error) {
    console.error('❌ Error en webhook Passline:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Procesar mensaje del usuario con IA
 */
async function processUserMessage(phoneNumber, messageText, userName) {
  try {
    // Procesar con IA (única llamada, sin logs verbosos)
    const aiResponse = await aiService.processMessage(messageText, phoneNumber, userName);

    // Enviar respuesta por WhatsApp
    await watiService.sendSessionMessage(phoneNumber, aiResponse.response);

    console.log(`✅ ${userName}: ${aiResponse.userProfile}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Enviar mensaje de error sin logs adicionales
    try {
      await watiService.sendSessionMessage(
        phoneNumber, 
        '😅 Disculpa, tuve un problema. ¿Podrías intentarlo de nuevo?'
      );
    } catch (sendError) {
      // Error silencioso para no saturar logs
    }
  }
}

/**
 * Enviar ticket al cliente después de un pago exitoso
 * Usa Twilio para envío proactivo con plantilla de WhatsApp
 */
async function sendTicketToCustomer(phoneNumber, customerName, customerEmail, eventName, ticketUrl, orderId) {
  try {
    console.log(`🎟️ Enviando ticket vía Twilio a ${customerName} de email ${customerEmail} (${phoneNumber}) para evento: ${eventName}`);

    // Formatear número de teléfono (remover caracteres especiales)
    const formattedPhone = phoneNumber.replace(/[^\d]/g, '');

    // Variables para la plantilla de Twilio
    // Ajustar los keys según tu plantilla configurada en Twilio
    const contentVariables = {
      '1': ticketUrl
    };

    // Enviar usando plantilla de Twilio (TWILIO_TICKET_CONTENT_SID debe estar en .env)
    const contentSid = process.env.TWILIO_TICKET_CONTENT_SID;

    if (contentSid) {
      // Enviar con plantilla aprobada (recomendado para mensajes proactivos)
      await twilioService.sendTemplateMessage(formattedPhone, contentSid, contentVariables);
    } else {
      // Fallback: enviar como mensaje de texto libre (solo funciona si hay sesión activa)
      const message = `🎉 ¡Hola ${customerName}!\n\n¡Tu compra ha sido confirmada! ✅\n\n📌 *Evento:* ${eventName}\n🎫 *Orden:* #${orderId}\n\nAquí está tu ticket:\n${ticketUrl}\n\n*Importante:*\n• Presenta este ticket en la entrada del evento\n• Guarda este mensaje para acceder fácilmente\n• Si tienes dudas, escríbenos aquí mismo\n\n¡Nos vemos en el evento! 🎊`;

      console.warn('⚠️ TWILIO_TICKET_CONTENT_SID no configurado, enviando como mensaje libre');
      await twilioService.sendMessage(formattedPhone, message);
    }

    console.log(`✅ Ticket enviado exitosamente vía Twilio a ${phoneNumber}`);

  } catch (error) {
    console.error('❌ Error enviando ticket vía Twilio:', error.message || error.error);
    throw error;
  }
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('═══════════════════════════════════════════');
  console.log(`🤖 Bot Passline iniciado correctamente`);
  console.log('═══════════════════════════════════════════');
  
  // Probar conexión con Google Sheets
  try {
    await sheetsService.testConnection();
  } catch (error) {
    console.warn('⚠️  Google Sheets no disponible:', error.message);
    console.warn('   El bot funcionará sin Google Sheets');
  }
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Cerrando servidor...');
  process.exit(0);
});

