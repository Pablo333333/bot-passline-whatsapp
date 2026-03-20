/**
 * Base de conocimientos - Eventos de Passline
 * 
 * ⚠️ NOTA IMPORTANTE: 
 * EVENTOS_ACTIVOS ya NO se usa en el bot.
 * Ahora los eventos se leen directamente desde Google Sheets.
 * 
 * Esta sección se mantiene solo como REFERENCIA de la estructura,
 * pero todos los eventos deben cargarse en el Google Sheet:
 */

// const EVENTOS_ACTIVOS = [
//   {
//     id: "EVT001",
//     nombre: "Festival Electrónico 2026",
//     fecha: "15 de Marzo 2026",
//     hora: "20:00",
//     ubicacion: "Parque La Carolina, Quito",
//     precioMin: 35,
//     precioMax: 120,
//     precioTexto: "$35 - $120",
//     categorias: ["Música", "Festival", "Electrónica"],
//     linkPassline: "https://passline.ec/eventos/festival-electronico-2026",
//     descripcion: "El festival de música electrónica más grande del año con los mejores DJs internacionales",
//     artistas: ["DJ Snake", "Martin Garrix", "Marshmello"],
//     capacidad: 5000,
//     disponibles: 1200
//   },
//   {
//     id: "EVT002",
//     nombre: "Concierto Rock Nacional",
//     fecha: "22 de Marzo 2026",
//     hora: "19:00",
//     ubicacion: "Teatro Nacional Sucre, Quito",
//     precioMin: 25,
//     precioMax: 80,
//     precioTexto: "$25 - $80",
//     categorias: ["Música", "Concierto", "Rock"],
//     linkPassline: "https://passline.ec/eventos/rock-nacional-2026",
//     descripcion: "Las mejores bandas de rock ecuatoriano en un solo escenario",
//     artistas: ["Rocola Bacalao", "Sal y Mileto", "Mamá Vudú"],
//     capacidad: 800,
//     disponibles: 350
//   },
//   {
//     id: "EVT003",
//     nombre: "Stand Up Comedy Night",
//     fecha: "5 de Abril 2026",
//     hora: "21:00",
//     ubicacion: "Centro de Arte Contemporáneo, Quito",
//     precioMin: 15,
//     precioMax: 35,
//     precioTexto: "$15 - $35",
//     categorias: ["Comedia", "Stand Up", "Entretenimiento"],
//     linkPassline: "https://passline.ec/eventos/comedy-night-2026",
//     descripcion: "Noche de risas con los mejores comediantes del país",
//     artistas: ["Andrés López", "Carlos Vera", "Michela Pincay"],
//     capacidad: 300,
//     disponibles: 50
//   },
//   {
//     id: "EVT004",
//     nombre: "Feria Gastronómica Internacional",
//     fecha: "10-12 de Abril 2026",
//     hora: "12:00 - 22:00",
//     ubicacion: "Plaza Foch, Quito",
//     precioMin: 10,
//     precioMax: 10,
//     precioTexto: "$10 (Entrada general)",
//     categorias: ["Gastronomía", "Feria", "Cultura"],
//     linkPassline: "https://passline.ec/eventos/feria-gastronomica-2026",
//     descripcion: "3 días de experiencias culinarias de todo el mundo",
//     artistas: ["Chefs internacionales", "Food trucks", "Mixología"],
//     capacidad: 10000,
//     disponibles: 8500
//   },
//   {
//     id: "EVT005",
//     nombre: "Torneo de eSports - League of Legends",
//     fecha: "20 de Abril 2026",
//     hora: "14:00",
//     ubicacion: "Centro de Convenciones Metropolitano, Quito",
//     precioMin: 20,
//     precioMax: 60,
//     precioTexto: "$20 - $60",
//     categorias: ["Gaming", "eSports", "Competencia"],
//     linkPassline: "https://passline.ec/eventos/esports-lol-2026",
//     descripcion: "Torneo nacional con premios de $10,000 USD",
//     artistas: ["Equipos nacionales", "Streamers invitados"],
//     capacidad: 2000,
//     disponibles: 900
//   }
// ];

// const POLITICAS_PASSLINE = {
//   devoluciones: {
//     permitidas: true,
//     condiciones: "Hasta 24 horas antes del evento, con cargo del 10% por gestión administrativa",
//     proceso: "Solicitar a través de soporte@passline.ec con número de orden"
//   },
//   cambios: {
//     permitidos: true,
//     condiciones: "Cambio de fecha solo si el organizador lo autoriza",
//     proceso: "Contactar a soporte en caso de reprogramación"
//   },
//   transferencia: {
//     permitida: true,
//     condiciones: "Se puede transferir el ticket a otra persona hasta 12 horas antes del evento",
//     proceso: "Desde la app o web de Passline, sección 'Mis Tickets'"
//   },
//   menores: {
//     restricciones: "Depende del evento. Ver descripción específica de cada evento",
//     acompañante: "Menores de 12 años deben ir acompañados de un adulto"
//   },
//   acceso: {
//     validacion: "QR code único por ticket",
//     reingreso: "No permitido salvo autorización del organizador",
//     anticipacion: "Llegar 30 minutos antes para validación"
//   }
// };

const METODOS_PAGO = {
  opciones: [
    {
      nombre: "Tarjeta de Crédito o Débito",
      marcas: ["Visa", "Mastercard", "Maestro", "American Express", "Apple Pay", "Google Pay", "Discover"],
      descripcion: "Pago instantáneo con cualquier tarjeta"
    },
    {
      nombre: "PayPal",
      descripcion: "Paga de forma segura con tu cuenta PayPal"
    },
    {
      nombre: "Pago con tu Banco",
      descripcion: "Pago directo desde tu cuenta bancaria (Prometeo)"
    },
    {
      nombre: "Transferencia Bancaria",
      descripcion: "Transferencia bancaria directa"
    }
  ],
  textoSimple: "Aceptamos: Tarjetas de crédito/débito (Visa, Mastercard, Maestro, American Express), Apple Pay, Google Pay, PayPal, pago con tu banco y transferencia bancaria."
};

// const FAQ = [
//   {
//     pregunta: "¿Cómo obtengo mi ticket después de pagar?",
//     respuesta: "Tu ticket llega automáticamente por WhatsApp y email inmediatamente después de confirmar el pago. También puedes descargarlo desde tu cuenta en passline.ec"
//   },
//   {
//     pregunta: "¿Qué pasa si pierdo mi ticket?",
//     respuesta: "No te preocupes, puedes recuperarlo ingresando a tu cuenta en passline.ec o contactando a soporte@passline.ec con tu número de orden"
//   },
//   {
//     pregunta: "¿Puedo comprar tickets para varias personas?",
//     respuesta: "Sí, en el proceso de compra puedes seleccionar la cantidad de tickets que necesites"
//   },
//   {
//     pregunta: "¿El ticket es digital o físico?",
//     respuesta: "Es 100% digital con código QR único. Solo necesitas tu celular para ingresar al evento"
//   },
//   {
//     pregunta: "¿Qué hago si el evento se cancela?",
//     respuesta: "Recibirás un reembolso automático del 100% del valor pagado en un plazo de 5-7 días hábiles"
//   }
// ];

const SOPORTE = {
  email: "contacto@passline.ec",
  whatsapp: "+593 98 382 31 70",
  horario: "24/7 - Sistema de ventas activo las 24 horas",
  tiempoRespuesta: "Atención personalizada de calidad",
  redesSociales: {
    instagram: "@passline_ecuador_oficial",
    facebook: "Passline Ecuador",
    web: "https://www.passline.ec/"
  }
};

const COMISIONES_ORGANIZADOR = {
  comision: "5% del valor del ticket",
  sinCostosOcultos: "Sin retenciones ni cobros ocultos",
  capacitacion: "120 horas de capacitación GRATUITA del sistema",
  puntoVentaOpcional: {
    costo: "$40 por 8 horas",
    incluye: "Cajero, computador, WiFi, 1 persona, Transbank"
  },
  ventaRRPP: "0% de comisión en venta por RRPP (efectivo y punto de venta)",
  caracteristicas: [
    "Plataforma de venta de tickets en línea personalizada",
    "Interfaz fácil de usar, accesible desde móviles",
    "Sistema disponible 24/7",
    "Aplicación de validación para accesos",
    "Base de datos para mailing masivo",
    "Página personalizada dentro de la plataforma",
    "Tickets físicos disponibles (costo adicional)",
    "Estrategias de promoción y marketing incluidas",
    "Promoción en redes sociales (@passline_ecuador_oficial)",
    "Control de acceso con QR",
    "Reportes detallados de ventas"
  ],
  mediosPagoIncluidos: [
    "Tarjetas de débito y crédito (Visa, Mastercard, Dinners, Titanium, Discover)",
    "Transferencia bancaria",
    "PayPal"
  ],
  mediosPagoOpcionales: [
    "Sana Sana",
    "Servipagos",
    "Pago Fácil",
    "Mi Vecino",
    "Farmacias 911",
    "Western Union",
    "Banco Pichincha",
    "Banco de Guayaquil"
  ]
};

const PROCESO_CREAR_EVENTO = {
  descripcion: "Crear tu evento en Passline es fácil y rápido. La plataforma es AUTOGESTIONABLE, puedes editar cuando quieras.",
  pasos: [
    "1. Ingresa a www.passline.ec y crea tu cuenta o inicia sesión",
    "2. En el menú, selecciona 'Crear Evento' → 'Crear Evento Presencial'",
    "3. Completa los datos básicos: nombre del evento, fecha, hora, lugar, descripción",
    "4. Agrega la ubicación: departamento, ciudad, dirección exacta del lugar",
    "5. Sube una imagen de portada del evento (puedes agregar video de YouTube opcional)",
    "6. Configura tus eTickets: tipos de entradas, precios, cantidades disponibles, fecha límite de venta",
    "7. Personaliza cada ticket con su propia imagen (opcional)",
    "8. Envía tu evento para revisión"
  ],
  datosNecesarios: [
    "Información del evento (nombre, descripción, fecha, hora)",
    "Ubicación exacta (lugar, dirección, ciudad)",
    "Imagen de portada",
    "Configuración de tickets (tipos, precios, cantidades)",
    "Video promocional (opcional)",
    "Imágenes personalizadas para tickets (opcional)"
  ],
  aprobacion: "Un ejecutivo de Passline revisará tu evento y lo aprobará. Una vez aprobado, estará visible para la venta.",
  ventajas: [
    "Plataforma autogestionable - edita cuando quieras",
    "Proceso simple y guiado paso a paso",
    "No necesitas conocimientos técnicos",
    "Soporte disponible 24/7"
  ],
  contactoAyuda: "Si necesitas ayuda para crear tu evento, contacta: contacto@passline.ec o WhatsApp: +593 98 382 31 70"
};

const SERVICIOS_GRATIS = {
  titulo: "Servicios GRATUITOS incluidos en Passline",
  servicios: [
    {
      nombre: "Crear eventos es GRATIS",
      descripcion: "100% autoadministrable, crea tus eventos en tiempo real sin costo alguno. Base de datos actualizada y propia."
    },
    {
      nombre: "App de Acreditación GRATIS",
      descripcion: "Aplicación profesional para validar entradas el día del evento. Incluye capacitación GRATUITA de tu equipo. Disponible en Google Play y App Store."
    },
    {
      nombre: "Envío de E-Tickets GRATIS",
      descripcion: "Los tickets se envían automáticamente por WhatsApp, SMS y correo electrónico sin costo adicional. Tus clientes reciben sus tickets al instante."
    },
    {
      nombre: "App Passline para compradores",
      descripcion: "Tus clientes pueden gestionar sus tickets desde la app móvil, reenviarlos a otras personas y tenerlos siempre disponibles en su celular."
    },
    {
      nombre: "Sistema de Cortesías",
      descripcion: "Envía invitaciones y entradas de cortesía sin costo a través de la plataforma."
    },
    {
      nombre: "Reportes en tiempo real",
      descripcion: "Acceso en línea a estadísticas de ventas, ganancias y asistencia. Siempre actualizado."
    },
    {
      nombre: "Ticketera personalizada",
      descripcion: "Podemos desarrollar tu propia ticketera para que todos tus eventos estén en un solo lugar, de manera gratuita."
    }
  ],
  serviciosOpcionales: [
    {
      nombre: "Planimetrías 3D",
      descripcion: "Para eventos con asientos numerados, visualización realista del recinto con ubicación precisa."
    },
    {
      nombre: "Passline Club",
      descripcion: "Sistema de puntos y descuentos para clientes frecuentes. Beneficios en próximas compras."
    },
    {
      nombre: "Tickets físicos de alta seguridad",
      descripcion: "Disponibles bajo pedido con tecnología anti-clonación."
    }
  ],
  destacados: [
    "✨ Crear eventos: GRATIS",
    "✨ App de acreditación: GRATIS con capacitación",
    "✨ Envío de tickets (WhatsApp/SMS/Email): GRATIS",
    "✨ Plataforma 100% autoadministrable",
    "✨ Base de datos propia actualizada"
  ]
};

module.exports = {
  EVENTOS_ACTIVOS,
  POLITICAS_PASSLINE,
  METODOS_PAGO,
  FAQ,
  SOPORTE,
  COMISIONES_ORGANIZADOR,
  PROCESO_CREAR_EVENTO,
  SERVICIOS_GRATIS
};




