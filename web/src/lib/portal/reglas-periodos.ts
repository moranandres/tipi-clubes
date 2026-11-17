import { esFechaValida } from "./tiempo";
import { errorDeObligatorio } from "./validacion";

export type DatosDePeriodo = {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
};

export type CampoDePeriodo = keyof DatosDePeriodo;
export type ErroresDePeriodo = Partial<Record<CampoDePeriodo, string>>;

export const CAMPOS_DE_PERIODO: readonly CampoDePeriodo[] = ["nombre", "fechaInicio", "fechaFin"];

export const RUTA_PERIODOS = "/portal/periodos";
export const LONGITUD_MAXIMA_DE_PERIODO = 50;

export const PUNTO_VIGENTE = "bg-exito";
export const PUNTO_NO_VIGENTE = "bg-tenue";

export function validarPeriodo(datos: DatosDePeriodo): ErroresDePeriodo {
  const errores: ErroresDePeriodo = {
    nombre: errorDeObligatorio(datos.nombre, "El nombre es obligatorio", LONGITUD_MAXIMA_DE_PERIODO),
  };

  if (!datos.fechaInicio) {
    errores.fechaInicio = "La fecha de inicio es obligatoria";
  } else if (!esFechaValida(datos.fechaInicio)) {
    errores.fechaInicio = "Escribe la fecha con el formato día/mes/año.";
  }

  if (!datos.fechaFin) {
    errores.fechaFin = "La fecha de fin es obligatoria";
  } else if (!esFechaValida(datos.fechaFin)) {
    errores.fechaFin = "Escribe la fecha con el formato día/mes/año.";
  }

  if (!errores.fechaInicio && !errores.fechaFin && datos.fechaFin <= datos.fechaInicio) {
    errores.fechaFin = "La fecha de fin debe ser posterior a la fecha de inicio.";
  }

  return errores;
}
