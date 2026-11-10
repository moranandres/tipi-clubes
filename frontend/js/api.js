import { API_BASE_URL } from './config.js';
import { obtenerSesion, limpiarSesion } from './auth.js';

export class ApiError extends Error {
  constructor(estado, detalle, errores) {
    super(detalle || 'Ocurrió un error inesperado.');
    this.estado = estado;
    this.errores = errores || null;
  }
}

function redirigirALogin(motivo) {
  window.location.replace(`login.html?motivo=${motivo}`);
}

function cabecerasBase(autenticado) {
  const cabeceras = { Accept: 'application/json' };
  if (autenticado) {
    const sesion = obtenerSesion();
    if (!sesion) {
      redirigirALogin('expirada');
      throw new ApiError(401, 'Su sesión expiró.');
    }
    cabeceras.Authorization = `Bearer ${sesion.token}`;
  }
  return cabeceras;
}

async function ejecutar(ruta, opciones, autenticado) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
  } catch (error) {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.');
  }

  if (respuesta.status === 401 && autenticado) {
    limpiarSesion();
    redirigirALogin('expirada');
    throw new ApiError(401, 'Su sesión expiró.');
  }
  if (!respuesta.ok) {
    let datos = null;
    const tipo = respuesta.headers.get('content-type') || '';
    if (tipo.includes('json')) {
      datos = await respuesta.json();
    }
    throw new ApiError(
      respuesta.status,
      datos && datos.detail ? datos.detail : 'Ocurrió un error al procesar la solicitud.',
      datos ? datos.errores : null
    );
  }
  return respuesta;
}

async function leerJson(respuesta) {
  if (respuesta.status === 204) {
    return null;
  }
  const tipo = respuesta.headers.get('content-type') || '';
  return tipo.includes('json') ? respuesta.json() : null;
}

export async function apiFetch(ruta, { metodo = 'GET', cuerpo = null, autenticado = true } = {}) {
  const cabeceras = cabecerasBase(autenticado);
  if (cuerpo !== null) {
    cabeceras['Content-Type'] = 'application/json';
  }
  const respuesta = await ejecutar(ruta, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo !== null ? JSON.stringify(cuerpo) : undefined
  }, autenticado);
  return leerJson(respuesta);
}

export async function apiEnviarArchivo(ruta, archivo, { campo = 'archivo', metodo = 'POST' } = {}) {
  const formulario = new FormData();
  formulario.append(campo, archivo);
  const respuesta = await ejecutar(ruta, {
    method: metodo,
    headers: cabecerasBase(true),
    body: formulario
  }, true);
  return leerJson(respuesta);
}

export async function apiEnviarFormulario(ruta, formulario, { metodo = 'POST' } = {}) {
  const respuesta = await ejecutar(ruta, {
    method: metodo,
    headers: cabecerasBase(true),
    body: formulario
  }, true);
  return leerJson(respuesta);
}

export async function apiObtenerArchivo(ruta) {
  const cabeceras = cabecerasBase(true);
  cabeceras.Accept = '*/*';
  const respuesta = await ejecutar(ruta, { method: 'GET', headers: cabeceras }, true);
  return respuesta.blob();
}

export async function apiDescargarArchivo(ruta, nombreArchivo) {
  const contenido = await apiObtenerArchivo(ruta);
  const direccion = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = direccion;
  enlace.download = nombreArchivo || 'documento';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(direccion), 1000);
}

export function construirConsulta(parametros) {
  const busqueda = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      busqueda.append(clave, valor);
    }
  });
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}
