const OpenAI = require('openai');
const { POLITICAS_PASSLINE, METODOS_PAGO, FAQ, SOPORTE, COMISIONES_ORGANIZADOR, PROCESO_CREAR_EVENTO, SERVICIOS_GRATIS } = require('../config/events');
const sheetsService = require('./sheetsService');

/**
 * Servicio de IA usando OpenAI para procesar mensajes y detectar perfiles de usuario
 * Perfiles: Comprador (busca eventos/tickets) o Organizador/Productor (quiere crear eventos)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;

// Validar configuración (warning en lugar de error para no bloquear)
if (!OPENAI_API_KEY) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY no está configurado en las variables de entorno');
}

// Inicializar cliente de OpenAI (solo si hay API key)
let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-temporal-key-cambiame') {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
}

// Almacenamiento temporal de conversaciones (en producción usar Redis o base de datos)
const conversationHistory = new Map();

/**
 * Obtener historial de conversación de un usuario
 */
function getConversationHistory(phoneNumber) {
  if (!conversationHistory.has(phoneNumber)) {
    conversationHistory.set(phoneNumber, []);
  }
  return conversationHistory.get(phoneNumber);
}

/**
 * Agregar mensaje al historial
 */
function addToHistory(phoneNumber, role, content) {
  const history = getConversationHistory(phoneNumber);
  history.push({ role, content });
  
  // Mantener solo los últimos 10 mensajes para no exceder límites
  if (history.length > 10) {
    history.shift();
  }
  
  conversationHistory.set(phoneNumber, history);
}

/**
 * Limpiar historial de conversación
 */
function clearHistory(phoneNumber) {
  conversationHistory.delete(phoneNumber);
}

/**
 * Generar System Prompt dinámico con eventos actualizados
 */
function generateSystemPrompt(eventos) {
  const eventosTexto = eventos && eventos.length > 0 
    ? eventos.map(e => `
• ${e.nombre} - ${e.fecha}
  Precio: ${e.precio}
  Link: ${e.link}
  ${e.descripcion ? `Descripción: ${e.descripcion}` : ''}`).join('\n')
    : '(No hay eventos activos en este momento)';

  return `Eres PassBot, el asistente virtual inteligente de Passline, la plataforma líder de venta y gestión de tickets para eventos en Ecuador.

**TU IDENTIDAD:**
- Nombre: PassBot
- Eres amigable, profesional y siempre dispuesto a ayudar
- Conoces todos los eventos disponibles en Passline
- Resuelves dudas 24/7 sobre eventos, compras y políticas

**EVENTOS ACTIVOS QUE PUEDES RECOMENDAR:**
${eventosTexto}

**PERFILES DE USUARIOS:**

🎟️ **COMPRADOR** - Busca eventos para asistir:
- Pregunta por eventos, fechas, precios, ubicaciones
- Quiere comprar tickets
- Necesita ayuda con el proceso de compra
- Consulta políticas de devolución/cambios

🎪 **ORGANIZADOR** - Quiere crear eventos:
- Pregunta cómo crear y publicar eventos
- Consulta comisiones y pagos
- Busca herramientas de gestión
- Necesita información sobre dashboard y reportes

**CÓMO RESPONDER A COMPRADORES:**

1. Saluda con entusiasmo y pregunta qué tipo de evento busca
2. Recomienda eventos según sus intereses (música, comedia, gastronomía, etc.)
3. Proporciona información completa: fecha, lugar, precio, artistas
4. Cuando decida comprar, envía el LINK DIRECTO del evento de Passline
5. Explica que el ticket llega automáticamente por WhatsApp después del pago
6. Responde dudas sobre políticas y proceso

**Información para Compradores:**
- Métodos de pago: ${METODOS_PAGO.textoSimple}
- Devoluciones: ${POLITICAS_PASSLINE.devoluciones.condiciones}
- Transferencia de tickets: ${POLITICAS_PASSLINE.transferencia.condiciones}
- Soporte: ${SOPORTE.whatsapp} (${SOPORTE.horario})

**CÓMO RESPONDER A ORGANIZADORES:**

1. Muéstrate profesional y entusiasta

2. **DESTACA SIEMPRE LOS SERVICIOS GRATUITOS:**
${SERVICIOS_GRATIS.destacados.join('\n')}

3. Explica los beneficios de Passline:
   - Comisión: ${COMISIONES_ORGANIZADOR.comision} (${COMISIONES_ORGANIZADOR.sinCostosOcultos})
   - Capacitación: ${COMISIONES_ORGANIZADOR.capacitacion}
   - Venta RRPP: ${COMISIONES_ORGANIZADOR.ventaRRPP}
   - Envío de tickets GRATIS por WhatsApp, SMS y email
   - App de acreditación GRATIS con capacitación incluida
   - Dashboard completo con estadísticas en tiempo real
   - Control de acceso con QR
   - Sistema anti-fraude
   - Promoción en redes sociales
   - Plataforma AUTOGESTIONABLE 24/7

4. Si preguntan CÓMO CREAR SU EVENTO:
   - Explica que es fácil y rápido: "${PROCESO_CREAR_EVENTO.descripcion}"
   - Resume los pasos principales: ingresar a www.passline.ec → Crear Evento → Completar datos → Configurar tickets → Enviar para aprobación
   - Menciona que un ejecutivo revisa y aprueba el evento
   - Destaca: "Crear tu evento es 100% GRATIS y autoadministrable"

5. Si preguntan por la app o tickets digitales:
   - Los tickets se envían GRATIS por WhatsApp, SMS y email automáticamente
   - Los clientes pueden gestionar sus tickets desde la App Passline
   - Incluye app de acreditación GRATIS para validar entradas el día del evento

6. Ofrece contactar a un ejecutivo: ${SOPORTE.email} o WhatsApp: ${SOPORTE.whatsapp}

**REGLAS DE ORO:**

✅ SÍ hacer:
- Identifica el perfil en el primer mensaje
- Usa emojis con moderación (1-2 por mensaje)
- Sé conciso (máximo 3-4 párrafos)
- Termina siempre con una pregunta o llamada a la acción
- Cuando te pidan comprar, envía el link directo de Passline
- Menciona que el ticket llega automáticamente por WhatsApp

❌ NO hacer:
- No inventes eventos que no están en la lista
- No des precios incorrectos
- No prometas cosas que Passline no ofrece
- No seas repetitivo
- No uses lenguaje muy formal o robótico

**PREGUNTAS FRECUENTES:**
${FAQ.map(f => `Q: ${f.pregunta}\nA: ${f.respuesta}`).join('\n\n')}

**PROCESO DE COMPRA:**
1. Usuario consulta evento → Le das info completa
2. Usuario decide comprar → Envías link directo de Passline
3. Usuario paga en Passline → Recibe ticket automático por WhatsApp
4. Usuario va al evento → Presenta QR en la entrada

Responde SIEMPRE en español de forma natural, conversacional y cercana. ¡Ayuda a los usuarios a vivir experiencias increíbles! 🎉`;
}

/**
 * Procesar mensaje del usuario con IA
 * 
 * @param {string} messageText - Texto del mensaje del usuario
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} Respuesta con perfil detectado y mensaje
 */
async function processMessage(messageText, phoneNumber, userName = 'Usuario') {
  try {
    console.log(`🤖 Procesando con IA: "${messageText}"`);

    // Obtener eventos activos desde Google Sheets
    let eventosActivos = [];
    try {
      eventosActivos = await sheetsService.getEvents();
      console.log(`📊 ${eventosActivos.length} eventos cargados desde Google Sheets`);
    } catch (sheetError) {
      console.warn('⚠️ No se pudieron cargar eventos desde Sheets:', sheetError.message);
      // Continuar sin eventos (el prompt manejará esto)
    }

    // Obtener historial de conversación
    const history = getConversationHistory(phoneNumber);
    
    // Detectar perfil del usuario basado en el contenido
    const userProfile = detectUserProfile(messageText, history);

    // Si no hay cliente OpenAI configurado, usar respuestas predefinidas
    if (!openai) {
      console.warn('⚠️  OpenAI no configurado, usando respuestas predefinidas');
      
      let response = '';
      
      if (userProfile === 'comprador') {
        response = `¡Hola ${userName}! 👋\n\nVeo que buscas eventos. En Passline tenemos los mejores eventos para ti:\n\n🎵 Conciertos\n🎭 Teatro\n🎪 Festivales\n🎉 Fiestas\n\n¿Qué tipo de evento te interesa? Cuéntame más y te ayudo a encontrar el perfecto para ti.`;
      } else if (userProfile === 'organizador') {
        response = `¡Hola ${userName}! 👋\n\n¿Quieres crear eventos con Passline? ¡Excelente decisión!\n\n✨ Beneficios:\n• Solo 5% de comisión + IVA\n• Pagos en 24-48 horas\n• Dashboard completo\n• Control de acceso con QR\n• Soporte 24/7\n\n¿Te gustaría que te explique cómo funciona?`;
      } else {
        response = `¡Hola ${userName}! 👋 Bienvenido a Passline.\n\n¿En qué puedo ayudarte hoy?\n\n🎟️ Buscar eventos y comprar tickets\n🎪 Crear y gestionar mis propios eventos\n\nCuéntame qué necesitas.`;
      }
      
      return {
        response: response,
        userProfile: userProfile,
        conversationLength: history.length,
        usingAI: false
      };
    }

    // Generar System Prompt dinámico con eventos actuales
    const systemPrompt = generateSystemPrompt(eventosActivos);

    // Construir mensajes para OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: messageText }
    ];

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1200,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const aiResponse = completion.choices[0].message.content;

    // Guardar en historial
    addToHistory(phoneNumber, 'user', messageText);
    addToHistory(phoneNumber, 'assistant', aiResponse);

    console.log(`✅ Respuesta generada con IA. Perfil: ${userProfile}`);

    return {
      response: aiResponse,
      userProfile: userProfile,
      conversationLength: history.length,
      tokensUsed: completion.usage?.total_tokens || 0,
      usingAI: true
    };

  } catch (error) {
    console.error('❌ Error en OpenAI:', error.message);
    
    // Respuesta de fallback
    return {
      response: `Hola ${userName} 👋\n\n¿En qué puedo ayudarte hoy?\n\n¿Buscas eventos para asistir 🎟️ o quieres organizar tu propio evento? 🎪`,
      userProfile: 'unknown',
      error: error.message,
      usingAI: false
    };
  }
}

/**
 * Detectar perfil del usuario basado en palabras clave
 */
function detectUserProfile(messageText, history = []) {
  const lowerMessage = messageText.toLowerCase();
  
  // Palabras clave para COMPRADOR
  const buyerKeywords = [
    'busco evento', 'qué eventos', 'cuánto cuesta', 'comprar ticket',
    'entrada', 'boleto', 'precio', 'cuándo es', 'dónde es',
    'eventos cerca', 'recomendaciones', 'concierto', 'fiesta',
    'festival', 'show', 'quiero ir', 'asistir'
  ];
  
  // Palabras clave para ORGANIZADOR
  const organizerKeywords = [
    'crear evento', 'vender tickets', 'organizar', 'publicar evento',
    'soy productor', 'soy organizador', 'mi evento', 'comisión',
    'cobro', 'crear', 'gestionar', 'promotor', 'how to',
    'cómo funciona', 'plataforma', 'herramientas', 'dashboard'
  ];
  
  // Contar coincidencias
  let buyerScore = 0;
  let organizerScore = 0;
  
  for (const keyword of buyerKeywords) {
    if (lowerMessage.includes(keyword)) buyerScore++;
  }
  
  for (const keyword of organizerKeywords) {
    if (lowerMessage.includes(keyword)) organizerScore++;
  }
  
  // Determinar perfil
  if (organizerScore > buyerScore) {
    return 'organizador';
  } else if (buyerScore > organizerScore) {
    return 'comprador';
  } else {
    // Si no hay claridad, revisar historial
    const fullHistory = history.map(h => h.content).join(' ').toLowerCase();
    
    for (const keyword of organizerKeywords) {
      if (fullHistory.includes(keyword)) return 'organizador';
    }
    
    for (const keyword of buyerKeywords) {
      if (fullHistory.includes(keyword)) return 'comprador';
    }
    
    return 'unknown';
  }
}

/**
 * Generar respuesta personalizada según perfil detectado
 */
async function generateProfileBasedResponse(userProfile, messageText, userName = 'Usuario') {
  try {
    let specificPrompt = '';
    
    if (userProfile === 'comprador') {
      specificPrompt = `El usuario es un COMPRADOR buscando eventos. Responde con entusiasmo sobre eventos disponibles y proceso de compra.`;
    } else if (userProfile === 'organizador') {
      specificPrompt = `El usuario es un ORGANIZADOR/PRODUCTOR. Responde profesionalmente sobre cómo crear eventos y beneficios de la plataforma.`;
    } else {
      specificPrompt = `No está claro el perfil. Pregunta amablemente si busca eventos para asistir o quiere organizar uno.`;
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + specificPrompt },
      { role: 'user', content: messageText }
    ];

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 400
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('❌ Error generando respuesta:', error.message);
    throw error;
  }
}

/**
 * Analizar intención del usuario
 */
async function analyzeIntent(messageText) {
  try {
    const messages = [
      {
        role: 'system',
        content: `Analiza el mensaje del usuario y devuelve SOLO una palabra que represente su intención principal:
        - comprar: quiere comprar tickets
        - buscar: busca información de eventos
        - crear: quiere crear/organizar evento
        - informacion: pregunta general sobre la plataforma
        - ayuda: necesita soporte
        - otro: otra intención`
      },
      { role: 'user', content: messageText }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.3,
      max_tokens: 10
    });

    return completion.choices[0].message.content.trim().toLowerCase();

  } catch (error) {
    console.error('❌ Error analizando intención:', error.message);
    return 'otro';
  }
}

module.exports = {
  processMessage,
  detectUserProfile,
  generateProfileBasedResponse,
  analyzeIntent,
  clearHistory,
  getConversationHistory
};

