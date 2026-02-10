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
    console.log('📩 Mensaje recibido de WATI:', JSON.stringify(req.body, null, 2));

    const { 
      waId,           // Número de teléfono del usuario
      text,           // Texto del mensaje
      senderName,     // Nombre del usuario
      eventType       // Tipo de evento
    } = req.body;

    // Verificar que sea un mensaje de texto
    if (eventType !== 'message' || !text || !waId) {
      console.log('⚠️ Evento no procesable o sin texto');
      return res.status(200).json({ status: 'ignored' });
    }

    // Responder inmediatamente al webhook (WATI requiere respuesta rápida)
    res.status(200).json({ status: 'received' });

    // Procesar el mensaje de forma asíncrona
    processUserMessage(waId, text, senderName);

  } catch (error) {
    console.error('❌ Error en webhook WATI:', error.message);
    res.status(500).json({ error: 'Internal server error' });
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
    console.log(`🤖 Procesando mensaje de ${userName} (${phoneNumber}): "${messageText}"`);

    // 1. Analizar el perfil del usuario y generar respuesta con IA
    const aiResponse = await aiService.processMessage(messageText, phoneNumber, userName);

    console.log(`💡 IA identificó perfil: ${aiResponse.userProfile}`);
    console.log(`📝 Respuesta generada: ${aiResponse.response.substring(0, 100)}...`);

    // 2. Enviar respuesta al usuario por WhatsApp
    await watiService.sendSessionMessage(phoneNumber, aiResponse.response);

    console.log(`✅ Respuesta enviada a ${phoneNumber}`);

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error.message);
    
    // Enviar mensaje de error al usuario
    try {
      await watiService.sendSessionMessage(
        phoneNumber, 
        '😅 Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?'
      );
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError.message);
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
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📡 Webhook WATI: http://localhost:${PORT}/webhook`);
  console.log(`💳 Webhook Passline: http://localhost:${PORT}/webhook/passline`);
  console.log(`⚙️  Entorno: ${process.env.NODE_ENV || 'production'}`);
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

