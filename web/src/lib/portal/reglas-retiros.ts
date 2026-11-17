import { LIMITES_DE_SOLICITUD, errorDeMotivo } from "./reglas-solicitudes";
import { enteroDe } from "./validacion";

export type DatosDeRetiro = {
  clubId: string;
  inscripcionId: string;
  motivo: string;
};

export type CampoDeRetiro = keyof DatosDeRetiro;
export type ErroresDeRetiro = Partial<Record<CampoDeRetiro, string>>;

export const CAMPOS_DE_RETIRO: readonly CampoDeRetiro[] = ["clubId", "inscripcionId", "motivo"];

export const MOTIVO_MINIMO_DE_RETIRO = 10;
export const MOTIVO_MAXIMO_DE_RETIRO = LIMITES_DE_SOLICITUD.motivoMaximo;
export const OBSERVACION_MAXIMA_DE_RETIRO = LIMITES_DE_SOLICITUD.observacion;

export function validarRetiro(datos: DatosDeRetiro): ErroresDeRetiro {
  const errores: ErroresDeRetiro = {};

  if (!enteroDe(datos.inscripcionId)) {
    errores.inscripcionId = "Elige al estudiante que se retira del club.";
  }

  const motivo = errorDeMotivo(datos.motivo, MOTIVO_MINIMO_DE_RETIRO);
  if (motivo) {
    errores.motivo = datos.motivo.trim() ? motivo : "Escribe el motivo del retiro.";
  }

  return errores;
}

export function errorDeObservacion(observacion: string): string | undefined {
  return observacion.trim().length > OBSERVACION_MAXIMA_DE_RETIRO
    ? `Admite hasta ${OBSERVACION_MAXIMA_DE_RETIRO} caracteres.`
    : undefined;
}
