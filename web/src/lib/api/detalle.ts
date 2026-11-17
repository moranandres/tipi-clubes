import "server-only";
import { exigirAutenticacion, type Resultado } from "./con-sesion";

export type ResultadoDeDetalle<T> =
  | { estado: "ok"; datos: T }
  | { estado: "no-encontrado" }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

const ACCESO_DENEGADO = 403;
const NO_ENCONTRADO = 404;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver este registro.";

export function comoDetalle<T>(respuesta: Resultado<T>): ResultadoDeDetalle<T> {
  exigirAutenticacion(respuesta);

  if (respuesta.estado === ACCESO_DENEGADO) {
    return { estado: "denegado", mensaje: respuesta.detalle ?? MENSAJE_DENEGADO };
  }
  if (respuesta.estado === NO_ENCONTRADO) {
    return { estado: "no-encontrado" };
  }
  if (!respuesta.datos) {
    return { estado: "sin-servicio" };
  }
  return { estado: "ok", datos: respuesta.datos };
}
