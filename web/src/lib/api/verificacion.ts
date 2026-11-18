import "server-only";
import { api, type Esquemas } from "./cliente";

export type VerificacionPublica = Esquemas["VerificacionPublicaResponse"];

export type ResultadoDeVerificacion =
  | { estado: "ok"; datos: VerificacionPublica }
  | { estado: "rechazado"; mensaje: string }
  | { estado: "sin-servicio" };

const ESPERA_MAXIMA_MS = 8000;
const DATOS_INVALIDOS = 400;
const NO_ENCONTRADO = 404;
const MENSAJE_FORMATO = "El código de verificación debe tener el formato TIPI-XXXX-XXXX-XXXX.";
const MENSAJE_NO_ENCONTRADO = "No existe un certificado con ese código.";
const LONGITUD_MAXIMA_DE_CODIGO = 40;

export function codigoDeConsulta(valor: string | string[] | undefined): string {
  const texto = (Array.isArray(valor) ? valor[0] : valor) ?? "";
  return texto.trim().slice(0, LONGITUD_MAXIMA_DE_CODIGO);
}

export async function verificarCertificado(codigo: string): Promise<ResultadoDeVerificacion> {
  try {
    const { data, error, response } = await api.GET("/api/publico/certificados/{codigo}", {
      params: { path: { codigo } },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (data) {
      return { estado: "ok", datos: data };
    }
    const detalle = (error as { detail?: string } | undefined)?.detail;
    if (response.status === DATOS_INVALIDOS) {
      return { estado: "rechazado", mensaje: detalle ?? MENSAJE_FORMATO };
    }
    if (response.status === NO_ENCONTRADO) {
      return { estado: "rechazado", mensaje: detalle ?? MENSAJE_NO_ENCONTRADO };
    }
    return { estado: "sin-servicio" };
  } catch {
    return { estado: "sin-servicio" };
  }
}
