import "server-only";
import { revalidatePath } from "next/cache";
import { exigirAutenticacion, type Resultado } from "@/lib/api/con-sesion";
import {
  MENSAJE_REVISAR_CAMPOS,
  accionFallida,
  type AccionFallida,
} from "./resultado";

export type PistaDeCampo = {
  patron: RegExp;
  campo: string;
};

const SIN_RESPUESTA = 0;
const DATOS_INVALIDOS = 400;
const ACCESO_DENEGADO = 403;
const NO_ENCONTRADO = 404;
const CONFLICTO = 409;

const MENSAJE_SIN_SERVICIO =
  "El servidor de TIPI 3.0 no responde. Tus datos siguen en el formulario; vuelve a intentarlo en unos minutos.";
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para realizar esta acción.";
const MENSAJE_NO_ENCONTRADO = "El registro ya no existe. Vuelve a la lista y actualízala.";
const MENSAJE_CONFLICTO = "La operación entra en conflicto con el estado actual de los datos.";
const MENSAJE_GENERICO = "No se pudo completar la operación. Vuelve a intentarlo.";

const RUTA_DEL_PORTAL = "/portal";

export function falloDeApi(
  respuesta: Resultado<unknown>,
  pistas: readonly PistaDeCampo[] = [],
): AccionFallida {
  exigirAutenticacion(respuesta);

  if (respuesta.estado === SIN_RESPUESTA) {
    return accionFallida(MENSAJE_SIN_SERVICIO);
  }

  if (respuesta.estado === DATOS_INVALIDOS && respuesta.errores) {
    return accionFallida(MENSAJE_REVISAR_CAMPOS, respuesta.errores);
  }

  if (respuesta.detalle) {
    const detalle = respuesta.detalle;
    const pista = pistas.find(({ patron }) => patron.test(detalle));
    return pista
      ? accionFallida(MENSAJE_REVISAR_CAMPOS, { [pista.campo]: detalle })
      : accionFallida(detalle);
  }

  if (respuesta.estado === ACCESO_DENEGADO) {
    return accionFallida(MENSAJE_DENEGADO);
  }
  if (respuesta.estado === NO_ENCONTRADO) {
    return accionFallida(MENSAJE_NO_ENCONTRADO);
  }
  if (respuesta.estado === CONFLICTO) {
    return accionFallida(MENSAJE_CONFLICTO);
  }
  return accionFallida(MENSAJE_GENERICO);
}

export function fueCorrecta(respuesta: Resultado<unknown>): boolean {
  return respuesta.estado >= 200 && respuesta.estado < 300;
}

export function revalidarPortal(): void {
  revalidatePath(RUTA_DEL_PORTAL, "layout");
}
