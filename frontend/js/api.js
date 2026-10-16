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

export async function apiFetch(ruta, { metodo = 'GET', cuerpo = null, autenticado = true } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== null) {
    cabeceras['Content-Type'] = 'application/json';
  }
  if (autenticado) {
    const sesion = obtenerSesion();
    if (!sesion) {
      redirigirALogin('expirada');
      throw new ApiError(401, 'Su sesión expiró.');
    }
    cabeceras.Authorization = `Bearer ${sesion.token}`;
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== null ? JSON.stringify(cuerpo) : undefined
    });
  } catch (error) {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.');
  }

  if (respuesta.status === 401 && autenticado) {
    limpiarSesion();
    redirigirALogin('expirada');
    throw new ApiError(401, 'Su sesión expiró.');
  }
  if (respuesta.status === 204) {
    return null;
  }

  let datos = null;
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('json')) {
    datos = await respuesta.json();
  }
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      datos && datos.detail ? datos.detail : 'Ocurrió un error al procesar la solicitud.',
      datos ? datos.errores : null
    );
  }
  return datos;
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