/**
 * Servicio de Google Sheets
 * Maneja lectura de eventos y escritura de ventas
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Cargar credenciales (desde env en producción o archivo en desarrollo)
let credentials;
try {
  // Prioridad 1: Variable de entorno (Railway/producción)
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ Credenciales de Google cargadas desde variable de entorno');
  } 
  // Prioridad 2: Archivo local (desarrollo)
  else {
    credentials = require('../credentials.json');
    console.log('✅ Credenciales de Google cargadas desde archivo local');
  }
} catch (error) {
  console.error('⚠️  No se encontraron credenciales de Google - Google Sheets no disponible');
  credentials = null;
}

/**
 * Inicializar conexión con Google Sheets
 */
async function getSheetConnection() {
  if (!credentials) {
    throw new Error('No se encontraron credenciales de Google Sheets');
  }

  const serviceAccountAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  
  return doc;
}

/**
 * Obtener eventos activos desde Google Sheets
 * Lee de la pestaña 'Eventos'
 * Columnas: Nombre, Precio, Fecha, Link, Descripcion, Estado
 * 
 * @returns {Promise<Array>} Array de eventos activos
 */
async function getEvents() {
  try {
    const doc = await getSheetConnection();
    const sheet = doc.sheetsByTitle['Eventos'];
    
    if (!sheet) {
      throw new Error('No se encontró la pestaña "Eventos"');
    }

    const rows = await sheet.getRows();
    
    // Mapear y filtrar eventos activos (sin logs para velocidad)
    const eventos = rows
      .filter(row => {
        const estado = row.get('Estado') || '';
        return estado.toLowerCase() === 'activo';
      })
      .map(row => ({
        nombre: row.get('Nombre') || '',
        precio: row.get('Precio') || '',
        fecha: row.get('Fecha') || '',
        link: row.get('Link') || '',
        descripcion: row.get('Descripcion') || '',
        estado: row.get('Estado') || ''
      }));

    return eventos;

  } catch (error) {
    console.error('❌ Error eventos:', error.message);
    throw error;
  }
}

/**
 * Guardar venta en Google Sheets
 * Escribe en la pestaña 'Ventas'
 * Columnas: Fecha_Venta, Nombre, Telefono, Mail, Evento_Comprado, Monto_Pagado, ID_Transaccion
 * 
 * @param {Object} data - Datos de la venta
 * @param {string} data.nombre - Nombre del cliente
 * @param {string} data.telefono - Teléfono del cliente
 * @param {string} data.mail - Email del cliente (opcional)
 * @param {string} data.eventoComprado - Nombre del evento
 * @param {number} data.montoPagado - Monto pagado
 * @param {string} data.idTransaccion - ID de la transacción
 * @returns {Promise<boolean>} True si se guardó exitosamente
 */
async function saveSale(data) {
  try {
    console.log('💾 Guardando venta en Google Sheets...');
    
    const doc = await getSheetConnection();
    const sheet = doc.sheetsByTitle['Ventas'];
    
    if (!sheet) {
      throw new Error('No se encontró la pestaña "Ventas"');
    }

    // Formatear fecha
    const fechaVenta = new Date().toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Agregar fila con los datos
    await sheet.addRow({
      'Fecha_Venta': fechaVenta,
      'Nombre': data.nombre || '',
      'Telefono': data.telefono || '',
      'Mail': data.mail || '',
      'Evento_Comprado': data.eventoComprado || '',
      'Monto_Pagado': data.montoPagado || 0,
      'ID_Transaccion': data.idTransaccion || ''
    });

    console.log(`✅ Venta registrada: ${data.nombre} - ${data.eventoComprado}`);
    return true;

  } catch (error) {
    console.error('❌ Error guardando venta:', error.message);
    throw error;
  }
}

/**
 * Obtener base de conocimientos del bot desde la pestaña 'Configuraciones'
 * Columnas esperadas: Seccion, Clave, Contenido
 * Retorna un objeto anidado: { SECCION: { clave: contenido, ... }, ... }
 *
 * @returns {Promise<Object>} Objeto cerebro con toda la configuración
 */
async function getBotKnowledge() {
  try {
    const doc = await getSheetConnection();
    const sheet = doc.sheetsByTitle['Configuraciones'];

    if (!sheet) {
      throw new Error('No se encontró la pestaña "Configuraciones"');
    }

    const rows = await sheet.getRows();
    const cerebro = {};

    for (const row of rows) {
      const seccion = (row.get('Seccion') || '').trim();
      const clave = (row.get('Clave') || '').trim();
      const contenido = (row.get('Contenido') || '').trim();

      if (!seccion || !clave) continue; // Saltar filas vacías

      if (!cerebro[seccion]) {
        cerebro[seccion] = {};
      }
      cerebro[seccion][clave] = contenido;
    }

    console.log(`🧠 Cerebro cargado: ${Object.keys(cerebro).length} secciones`);
    return cerebro;

  } catch (error) {
    console.error('❌ Error cargando conocimiento:', error.message);
    return {}; // Devolver objeto vacío como fallback
  }
}

/**
 * Probar conexión con Google Sheets
 */
async function testConnection() {
  try {
    console.log('🔍 Probando conexión con Google Sheets...');
    
    const doc = await getSheetConnection();
    console.log(`✅ Conectado a: "${doc.title}"`);
    
    // Listar pestañas
    console.log('📋 Pestañas encontradas:');
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.title}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

module.exports = {
  getEvents,
  saveSale,
  getBotKnowledge,
  testConnection
};



