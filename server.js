const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno PRIMERO, antes de importar los servicios
dotenv.config();

// Ahora sí importar los servicios (después de cargar .env)
const watiService = require('./services/watiService');
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
    await sendTicketToCustomer(customerPhone, customerName, eventName, ticketUrl, orderId);

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
 */
async function sendTicketToCustomer(phoneNumber, customerName, eventName, ticketUrl, orderId) {
  try {
    console.log(`🎟️ Enviando ticket a ${customerName} (${phoneNumber}) para evento: ${eventName}`);

    // Formatear número de teléfono (remover caracteres especiales)
    const formattedPhone = phoneNumber.replace(/[^\d]/g, '');

    // Crear mensaje personalizado
    const message = `🎉 ¡Hola ${customerName}!

¡Tu compra ha sido confirmada! ✅

📌 *Evento:* ${eventName}
🎫 *Orden:* #${orderId}

Aquí está tu ticket:
${ticketUrl}

*Importante:*
• Presenta este ticket en la entrada del evento
• Guarda este mensaje para acceder fácilmente
• Si tienes dudas, escríbenos aquí mismo

¡Nos vemos en el evento! 🎊`;

    // Enviar mensaje con el ticket
    await watiService.sendSessionMessage(formattedPhone, message);

    console.log(`✅ Ticket enviado exitosamente a ${phoneNumber}`);

  } catch (error) {
    console.error('❌ Error enviando ticket:', error.message);
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

