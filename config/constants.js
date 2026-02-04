/**
 * Constantes y configuraciones del bot
 */

// Perfiles de usuario
const USER_PROFILES = {
  BUYER: 'comprador',
  ORGANIZER: 'organizador',
  UNKNOWN: 'unknown'
};

// Estados de pago
const PAYMENT_STATUS = {
  SUCCESS: 'success',
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed'
};

// Tipos de eventos de WATI
const WATI_EVENT_TYPES = {
  MESSAGE: 'message',
  STATUS: 'status',
  DELIVERY: 'delivery'
};

// Mensajes de bienvenida predefinidos
const WELCOME_MESSAGES = {
  BUYER: `¡Hola! 👋 Bienvenido a Passline

¿Buscas eventos increíbles? Estás en el lugar correcto 🎉

Puedo ayudarte a:
• Encontrar eventos cerca de ti
• Recomendarte los mejores conciertos y festivales
• Comprar tickets fácil y seguro

¿Qué tipo de eventos te interesan?`,

  ORGANIZER: `¡Hola! 👋 Bienvenido a Passline

Veo que quieres crear eventos. ¡Excelente decisión! 🎪

Con Passline puedes:
✨ Crear y publicar eventos en minutos
💳 Vender tickets online 24/7
📊 Ver estadísticas en tiempo real
🎫 Control de acceso con QR
💰 Comisión baja: solo 5% + IVA

¿Te gustaría conocer más sobre la plataforma?`,

  DEFAULT: `¡Hola! 👋 Bienvenido a Passline

Soy tu asistente virtual y estoy aquí para ayudarte.

¿Qué buscas hoy?
🎟️ Eventos y tickets para asistir
🎪 Crear y gestionar tus propios eventos

Cuéntame, ¿en qué puedo ayudarte?`
};

// Plantillas de respuestas rápidas
const QUICK_RESPONSES = {
  ERROR_GENERIC: '😅 Disculpa, tuve un problema. ¿Podrías intentarlo de nuevo?',
  ERROR_PAYMENT: '❌ Hubo un problema procesando el pago. Por favor contacta a soporte.',
  PROCESSING: '⏳ Un momento, estoy procesando tu solicitud...',
  SUCCESS: '✅ ¡Listo! Todo salió perfecto.',
  NOT_UNDERSTOOD: '🤔 No estoy seguro de entender. ¿Podrías explicarme mejor?'
};

// Información de la plataforma
const PLATFORM_INFO = {
  COMMISSION: '5% + IVA',
  PAYMENT_TIME: '24-48 horas después del evento',
  SUPPORT: '24/7 por WhatsApp',
  FEATURES: [
    'Dashboard web completo',
    'QR codes para control de acceso',
    'Estadísticas en tiempo real',
    'Múltiples métodos de pago',
    'Personalización de boletos',
    'Reportes detallados'
  ]
};

// Límites y configuraciones
const LIMITS = {
  MAX_CONVERSATION_HISTORY: 10,
  MESSAGE_MAX_LENGTH: 4096, // Límite de WhatsApp
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas en ms
  AI_MAX_TOKENS: 500,
  AI_TEMPERATURE: 0.7
};

// Patrones de detección
const DETECTION_PATTERNS = {
  BUYER_KEYWORDS: [
    'busco evento',
    'qué eventos',
    'cuánto cuesta',
    'comprar ticket',
    'entrada',
    'boleto',
    'precio',
    'cuándo es',
    'dónde es',
    'eventos cerca',
    'recomendaciones',
    'concierto',
    'fiesta',
    'festival',
    'show',
    'quiero ir',
    'asistir'
  ],
  
  ORGANIZER_KEYWORDS: [
    'crear evento',
    'vender tickets',
    'organizar',
    'publicar evento',
    'soy productor',
    'soy organizador',
    'mi evento',
    'comisión',
    'cobro',
    'crear',
    'gestionar',
    'promotor',
    'how to',
    'cómo funciona',
    'plataforma',
    'herramientas',
    'dashboard'
  ]
};

// URLs útiles
const URLS = {
  WEBSITE: 'https://passline.com',
  DASHBOARD: 'https://app.passline.com',
  SUPPORT: 'https://passline.com/soporte',
  FAQ: 'https://passline.com/faq',
  TERMS: 'https://passline.com/terminos'
};

module.exports = {
  USER_PROFILES,
  PAYMENT_STATUS,
  WATI_EVENT_TYPES,
  WELCOME_MESSAGES,
  QUICK_RESPONSES,
  PLATFORM_INFO,
  LIMITS,
  DETECTION_PATTERNS,
  URLS
};




