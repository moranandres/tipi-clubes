import {
  CODIGOS_DE_CURSO_EDUCATIVO,
  type CursoEducativo,
  type EstadoEstudiante,
} from "./filtros-estudiantes";
import { enteroDe } from "./validacion";

export type DatosDeEstudiante = {
  institucionId: string;
  nombres: string;
  apellidos: string;
  curso: string;
};

export type CampoDeEstudiante = keyof DatosDeEstudiante;
export type ErroresDeEstudiante = Partial<Record<CampoDeEstudiante, string>>;

export const CAMPOS_DE_ESTUDIANTE: readonly CampoDeEstudiante[] = [
  "institucionId",
  "nombres",
  "apellidos",
  "curso",
];

export const LONGITUD_MAXIMA_DE_NOMBRE = 100;
export const CAMPO_DE_HOMONIMO = "confirmarHomonimo";

export const TRANSICIONES_DE_ESTUDIANTE: Record<EstadoEstudiante, readonly EstadoEstudiante[]> = {
  ACTIVO: ["RETIRADO", "EGRESADO"],
  RETIRADO: ["ACTIVO", "EGRESADO"],
  EGRESADO: ["ACTIVO", "RETIRADO"],
};

const NOMBRE_DE_PERSONA = /^\p{L}[\p{L}\p{M}'’. -]*$/u;
const MENSAJE_DE_FORMATO = "Solo se admiten letras, tildes, espacios, apóstrofo, punto y guion.";

export function normalizarNombre(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

export function errorDeNombre(valor: string, vacio: string): string | undefined {
  const texto = normalizarNombre(valor);
  if (!texto) {
    return vacio;
  }
  if (texto.length > LONGITUD_MAXIMA_DE_NOMBRE) {
    return `Admite hasta ${LONGITUD_MAXIMA_DE_NOMBRE} caracteres.`;
  }
  return NOMBRE_DE_PERSONA.test(texto) ? undefined : MENSAJE_DE_FORMATO;
}

export function esCursoEducativo(valor: string): valor is CursoEducativo {
  return CODIGOS_DE_CURSO_EDUCATIVO.includes(valor as CursoEducativo);
}

export function validarEstudiante(datos: DatosDeEstudiante, esNuevo: boolean): ErroresDeEstudiante {
  const errores: ErroresDeEstudiante = {};

  if (esNuevo && !enteroDe(datos.institucionId)) {
    errores.institucionId = "Elige la institución del estudiante.";
  }

  errores.nombres = errorDeNombre(datos.nombres, "Escribe los nombres del estudiante.");
  errores.apellidos = errorDeNombre(datos.apellidos, "Escribe los apellidos del estudiante.");

  if (!esCursoEducativo(datos.curso)) {
    errores.curso = "Elige el grado o curso que cursa en su institución.";
  }

  return errores;
}
