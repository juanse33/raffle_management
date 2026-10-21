/**
 * Gestor de Rifas · Backend en Google Sheets (Google Apps Script)
 *
 * Cómo instalarlo:
 *  1. En tu hoja de Google: Extensiones → Apps Script.
 *  2. Borra todo el código del editor y pega este archivo completo.
 *  3. Cambia PIN_ADMIN (abajo) y guarda (Ctrl + S).
 *  4. Implementar → Gestionar implementaciones → ✏️ (editar) →
 *     Versión: "Nueva versión" → Implementar.
 *     (Así la URL /exec se mantiene igual. Si es la primera vez:
 *      Nueva implementación → Aplicación web · Ejecutar como: Yo ·
 *      Quién tiene acceso: Cualquier usuario).
 *
 * La pestaña "boletas" se crea sola. Puedes editar sus celdas a mano
 * (la app lo refleja en unos segundos), pero no escribas otras tablas en ella.
 */

const PIN_ADMIN = '1234';   // ← CÁMBIALO. Se pide para crear, ajustar o reiniciar la rifa.
const ID_HOJA = '';         // Opcional: ID de la hoja si el script NO se creó desde ella.
const HOJA = 'boletas';
const COLUMNAS = ['numero', 'estado', 'vendedor', 'comprador', 'precio', 'vendida_en'];

function doGet(e) {
  return atender_(Object.assign({ accion: 'listar' }, (e && e.parameter) || {}));
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, codigo: 'PEDIDO_INVALIDO', mensaje: 'Pedido inválido.' });
  }
  return atender_(pedido);
}

function atender_(p) {
  try {
    const accion = String(p.accion || 'listar');
    if (accion === 'listar') {
      return json_({ ok: true, filas: leer_(hoja_()).map(publica_) });
    }
    // Las escrituras se atienden una a la vez: así nadie vende la misma boleta dos veces.
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) falla_('OCUPADO', 'Hay muchas operaciones al mismo tiempo. Intenta de nuevo.');
    try {
      const resultado = ejecutar_(accion, p);
      SpreadsheetApp.flush();
      return json_(Object.assign({ ok: true }, resultado));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, codigo: err.codigo || 'ERROR', mensaje: err.codigo ? err.mensajeUsuario : String(err.message || err) });
  }
}

function ejecutar_(accion, p) {
  const hoja = hoja_();
  const filas = leer_(hoja);

  switch (accion) {
    case 'vender': {
      const b = buscar_(filas, p.numero);
      if (!b || b.estado !== 'disponible') falla_('YA_VENDIDA', null);
      const vendedor = texto_(p.vendedor, 60);
      const comprador = texto_(p.comprador, 80);
      if (!vendedor) falla_('DATOS', 'El vendedor es obligatorio.');
      const ahora = new Date();
      hoja.getRange(b._fila, 2, 1, 5).setValues([['vendida', celda_(vendedor), celda_(comprador), b.precio, ahora]]);
      return { fila: publica_(Object.assign(b, { estado: 'vendida', vendedor: vendedor, comprador: comprador || null, vendida_en: ahora.toISOString() })) };
    }

    case 'anular': {
      const b = buscar_(filas, p.numero);
      if (!b || b.estado !== 'vendida') falla_('YA_DISPONIBLE', null);
      hoja.getRange(b._fila, 2, 1, 5).setValues([['disponible', '', '', b.precio, '']]);
      return { fila: publica_(Object.assign(b, { estado: 'disponible', vendedor: null, comprador: null, vendida_en: null })) };
    }

    case 'insertar': {
      exigirPin_(p.pin);
      const existentes = new Set(filas.map(function (f) { return f.numero; }));
      const nuevas = (p.filas || []).map(function (f) {
        const numero = Number(f.numero);
        const precio = Number(f.precio);
        if (!Number.isInteger(numero) || numero < 0) falla_('DATOS', 'Número de boleta inválido.');
        if (!(precio >= 0)) falla_('DATOS', 'Precio inválido.');
        if (existentes.has(numero)) falla_('DUPLICADA', 'Esas boletas ya existen: alguien más acaba de crearlas. El tablero se actualizó.');
        return [numero, 'disponible', '', '', precio, ''];
      });
      if (nuevas.length) hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, COLUMNAS.length).setValues(nuevas);
      return { insertadas: nuevas.length };
    }

    case 'cambiarPrecio': {
      exigirPin_(p.pin);
      const precio = Number(p.precio);
      if (!(precio >= 0)) falla_('DATOS', 'Precio inválido.');
      const ultima = hoja.getLastRow();
      if (ultima < 2) return {};
      const rango = hoja.getRange(2, 5, ultima - 1, 1);
      const precios = rango.getValues();
      filas.forEach(function (f) { if (f.estado === 'disponible') precios[f._fila - 2][0] = precio; });
      rango.setValues(precios);
      return {};
    }

    case 'borrarDisponiblesMayoresA': {
      exigirPin_(p.pin);
      const limite = Number(p.numero);
      reescribir_(hoja, filas.filter(function (f) { return !(f.numero > limite && f.estado === 'disponible'); }));
      return {};
    }

    case 'borrarTodo': {
      exigirPin_(p.pin);
      reescribir_(hoja, []);
      return {};
    }

    case 'verificarPin': {
      exigirPin_(p.pin);
      return {};
    }

    default:
      falla_('ACCION', 'Acción desconocida: ' + accion);
  }
}

/* ----------------------------- utilidades ----------------------------- */

function hoja_() {
  const libro = ID_HOJA ? SpreadsheetApp.openById(ID_HOJA) : SpreadsheetApp.getActiveSpreadsheet();
  if (!libro) falla_('CONFIG', 'El script no está vinculado a una hoja. Escribe el ID de la hoja en ID_HOJA.');
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) hoja = libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.getRange('F:F').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return hoja;
}

function leer_(hoja) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  const valores = hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).getValues();
  const filas = [];
  valores.forEach(function (v, i) {
    const numero = Number(v[0]);
    if (v[0] === '' || !Number.isInteger(numero) || numero < 0) return;   // filas vacías o inválidas
    filas.push({
      _fila: i + 2,
      numero: numero,
      estado: /^vendid/i.test(String(v[1]).trim()) ? 'vendida' : 'disponible',
      vendedor: texto_(v[2], 60) || null,
      comprador: texto_(v[3], 80) || null,
      precio: Number(v[4]) || 0,
      vendida_en: v[5] instanceof Date ? v[5].toISOString() : (v[5] ? String(v[5]) : null),
    });
  });
  return filas;
}

function reescribir_(hoja, filas) {
  const ultima = hoja.getLastRow();
  if (ultima > 1) hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).clearContent();
  if (!filas.length) return;
  filas.sort(function (a, b) { return a.numero - b.numero; });
  hoja.getRange(2, 1, filas.length, COLUMNAS.length).setValues(filas.map(function (f) {
    return [f.numero, f.estado, celda_(f.vendedor || ''), celda_(f.comprador || ''), f.precio, f.vendida_en ? new Date(f.vendida_en) : ''];
  }));
}

function buscar_(filas, numero) {
  const n = Number(numero);
  for (let i = 0; i < filas.length; i++) if (filas[i].numero === n) return filas[i];
  return null;
}

function publica_(f) {
  return { numero: f.numero, estado: f.estado, vendedor: f.vendedor, comprador: f.comprador, precio: f.precio, vendida_en: f.vendida_en };
}

function texto_(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 100);
}

// Evita que un nombre como "=FORMULA()" se ejecute como fórmula en la hoja.
function celda_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function exigirPin_(pin) {
  if (String(pin == null ? '' : pin).trim() !== String(PIN_ADMIN)) falla_('PIN_INVALIDO', 'PIN de administrador incorrecto.');
}

function falla_(codigo, mensaje) {
  const e = new Error(mensaje || codigo);
  e.codigo = codigo;
  e.mensajeUsuario = mensaje;
  throw e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
