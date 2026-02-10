const OpenAI = require('openai');
const { POLITICAS_PASSLINE, METODOS_PAGO, FAQ, SOPORTE, COMISIONES_ORGANIZADOR, PROCESO_CREAR_EVENTO, SERVICIOS_GRATIS } = require('../config/events');
const sheetsService = require('./sheetsService');

/**
 * Servicio de IA optimizado para respuestas rápidas
 * - Caché de eventos (10 minutos)
 * - Parámetros OpenAI optimizados
 * - Flujo directo simplificado
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;

// Validar configuración
if (!OPENAI_API_KEY) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY no está configurado en las variables de entorno');
}

// Inicializar cliente de OpenAI
let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-temporal-key-cambiame') {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
}

// Caché global para eventos (actualización cada 10 minutos)
let eventsCache = {
  data: [],
  lastUpdate: 0,
  CACHE_DURATION: 10 * 60 * 1000 // 10 minutos en millisegundos
};

// Almacenamiento temporal de conversaciones
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
 * Obtener eventos desde caché o Google Sheets (actualización cada 10 minutos)
 */
async function getCachedEvents() {
  const now = Date.now();
  const cacheAge = now - eventsCache.lastUpdate;
  
  // Si el caché es válido, devolverlo (RÁPIDO)
  if (eventsCache.data.length > 0 && cacheAge < eventsCache.CACHE_DURATION) {
    return eventsCache.data;
  }
  
  // Actualizar caché solo cuando sea necesario
  try {
    console.log('🔄 Actualizando caché...');
    const eventos = await sheetsService.getEvents();
    eventsCache.data = eventos;
    eventsCache.lastUpdate = now;
    console.log(`✅ Caché: ${eventos.length} eventos`);
    return eventos;
  } catch (error) {
    console.warn('⚠️ Error caché:', error.message);
    return eventsCache.data; // Usar caché anterior
  }
}

/**
 * Agregar mensaje al historial (máximo 8 mensajes)
 */
function addToHistory(phoneNumber, role, content) {
  const history = getConversationHistory(phoneNumber);
  history.push({ role, content });
  
  // Mantener solo los últimos 8 mensajes para optimizar velocidad
  if (history.length > 8) {
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
function generateSystemPrompt(eventos, userName = null) {
  const eventosTexto = eventos && eventos.length > 0 
    ? eventos.map(e => `
• ${e.nombre} - ${e.fecha}
  Precio: ${e.precio}
  Link: ${e.link}
  ${e.descripcion ? `Descripción: ${e.descripcion}` : ''}`).join('\n')
    : '(No hay eventos activos en este momento)';

  // Preparar instrucción de saludo personalizado
  const saludoInstruccion = userName && userName !== 'Usuario' 
    ? `El nombre del usuario es ${userName}. Úsalo para saludarlo de forma cordial al inicio de la conversación o cuando lo consideres natural, pero mantén siempre la brevedad.`
    : 'Si no conoces el nombre del usuario, usa un saludo genérico como "¡Hola!" pero mantén siempre la brevedad.';

  return `Eres PassBot de Passline. Responde de forma EXTREMADAMENTE BREVE Y CONCISA. Máximo 2-3 líneas por respuesta.

**SALUDO PERSONALIZADO:**
${saludoInstruccion}

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
- RESPONDE EN MÁXIMO 2-3 LÍNEAS
- Identifica el perfil rápidamente
- Usa 1 emoji máximo
- Sé ULTRA-CONCISO
- Cuando te pidan comprar, envía SOLO el link
- Ve directo al grano

❌ NO hacer:
- NO escribas párrafos largos
- NO expliques de más
- NO uses lenguaje formal
- NO seas repetitivo
- NO inventes información

**PREGUNTAS FRECUENTES:**
${FAQ.map(f => `Q: ${f.pregunta}\nA: ${f.respuesta}`).join('\n\n')}

**PROCESO DE COMPRA:**
1. Usuario consulta evento → Le das info completa
2. Usuario decide comprar → Envías link directo de Passline
3. Usuario paga en Passline → Recibe ticket automático por WhatsApp
4. Usuario va al evento → Presenta QR en la entrada

IMPORTANTE: Responde en español de forma ULTRA-BREVE. Máximo 2-3 líneas. Sé directo y conciso. 🎉`;
}

/**
 * Procesar mensaje del usuario con IA (optimizado para velocidad)
 * 
 * @param {string} messageText - Texto del mensaje del usuario
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} Respuesta con perfil detectado y mensaje
 */
async function processMessage(messageText, phoneNumber, userName = 'Usuario') {
  try {
    console.log(`🤖 Procesando: "${messageText.substring(0, 50)}..."`);

    // Si no hay OpenAI configurado, usar respuesta básica
    if (!openai) {
      console.warn('⚠️ OpenAI no configurado');
      const saludo = userName && userName !== 'Usuario' ? `¡Hola ${userName}!` : '¡Hola!';
      return {
        response: `${saludo} 👋 ¿En qué puedo ayudarte?\n\n🎟️ Buscar eventos\n🎪 Crear eventos`,
        userProfile: 'unknown',
        usingAI: false
      };
    }

    // Obtener eventos desde caché (actualización automática cada 10 min)
    const eventosActivos = await getCachedEvents();
    
    // Obtener historial (máximo 8 mensajes)
    const history = getConversationHistory(phoneNumber);
    
    // Detectar perfil rápido
    const userProfile = detectUserProfile(messageText, history);

    // System prompt optimizado con nombre del usuario
    const systemPrompt = generateSystemPrompt(eventosActivos, userName);

    // Mensajes para OpenAI (flujo directo)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: messageText }
    ];

    // Llamada optimizada a OpenAI con timer
    console.time('⏱️ OpenAI');
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messages,
      temperature: 0.2,  // Más bajo para respuestas consistentes
      max_tokens: 200,   // REDUCIDO para respuestas ultra-breves
      top_p: 0.8,        // Más enfocado
      frequency_penalty: 0.3
    });
    console.timeEnd('⏱️ OpenAI');

    const aiResponse = completion.choices[0].message.content;

    // Actualizar historial
    addToHistory(phoneNumber, 'user', messageText);
    addToHistory(phoneNumber, 'assistant', aiResponse);

    console.log(`✅ IA respondió (${userProfile})`);

    return {
      response: aiResponse,
      userProfile: userProfile,
      tokensUsed: completion.usage?.total_tokens || 0,
      usingAI: true
    };

  } catch (error) {
    console.error('❌ Error IA:', error.message);
    
    const saludo = userName && userName !== 'Usuario' ? `Hola ${userName}` : 'Hola';
    return {
      response: `${saludo} 👋\n\n¿En qué puedo ayudarte?\n\n🎟️ Eventos disponibles\n🎪 Crear tu evento`,
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


module.exports = {
  processMessage,
  detectUserProfile,
  clearHistory,
  getConversationHistory,
  getCachedEvents
};

