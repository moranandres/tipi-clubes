import type { EstadoClub } from "./filtros-clubes";
import { esHoraValida, minutosDe } from "./tiempo";
import { enteroDe } from "./validacion";

export type DatosDeClub = {
  nombre: string;
  objetivo: string;
  institucionId: string;
  periodoId: string;
  docenteId: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  cupoMaximo: string;
};

export type CampoDeClub = keyof DatosDeClub;
export type ErroresDeClub = Partial<Record<CampoDeClub, string>>;

export const CAMPOS_DE_CLUB: readonly CampoDeClub[] = [
  "nombre",
  "objetivo",
  "institucionId",
  "periodoId",
  "docenteId",
  "diaSemana",
  "horaInicio",
  "horaFin",
  "lugar",
  "cupoMaximo",
];

export const LIMITES_DE_CLUB = {
  nombre: 150,
  objetivo: 2000,
  lugar: 150,
  cupoMinimo: 1,
  cupoMaximo: 500,
} as const;

export const LONGITUD_MAXIMA_DE_MOTIVO = 255;

export const TRANSICIONES_DE_CLUB: Record<EstadoClub, readonly EstadoClub[]> = {
  PLANIFICADO: ["ACTIVO", "CERRADO"],
  ACTIVO: ["SUSPENDIDO", "CERRADO"],
  SUSPENDIDO: ["ACTIVO", "CERRADO"],
  CERRADO: ["ACTIVO"],
};

export const ESTADO_DE_CLUB_CERRADO: EstadoClub = "CERRADO";

export function exigeMotivoDeClub(actual: EstadoClub, nuevo: EstadoClub): boolean {
  return nuevo === "SUSPENDIDO" || nuevo === "CERRADO" || actual === "CERRADO";
}

type Contexto = {
  esNuevo: boolean;
  integrantesActivos: number;
};

export function validarClub(datos: DatosDeClub, contexto: Contexto): ErroresDeClub {
  const errores: ErroresDeClub = {};

  const nombre = datos.nombre.trim();
  if (!nombre) {
    errores.nombre = "Escribe el nombre del club.";
  } else if (nombre.length > LIMITES_DE_CLUB.nombre) {
    errores.nombre = `El nombre admite hasta ${LIMITES_DE_CLUB.nombre} caracteres.`;
  }

  const objetivo = datos.objetivo.trim();
  if (!objetivo) {
    errores.objetivo = "Escribe el objetivo del club.";
  } else if (objetivo.length > LIMITES_DE_CLUB.objetivo) {
    errores.objetivo = `El objetivo admite hasta ${LIMITES_DE_CLUB.objetivo} caracteres.`;
  }

  if (contexto.esNuevo) {
    if (!enteroDe(datos.institucionId)) {
      errores.institucionId = "Elige la institución del club.";
    }
    if (!enteroDe(datos.periodoId)) {
      errores.periodoId = "Elige el período académico.";
    }
  }

  if (!enteroDe(datos.docenteId)) {
    errores.docenteId = "Elige el docente responsable.";
  }

  const hayDia = datos.diaSemana !== "";
  const hayInicio = datos.horaInicio !== "";
  const hayFin = datos.horaFin !== "";

  if (hayDia || hayInicio || hayFin) {
    const dia = enteroDe(datos.diaSemana);
    if (!hayDia) {
      errores.diaSemana = "Elige el día o deja el horario vacío.";
    } else if (!dia || dia < 1 || dia > 7) {
      errores.diaSemana = "Elige un día de la semana válido.";
    }
    if (!hayInicio) {
      errores.horaInicio = "Indica la hora de inicio.";
    } else if (!esHoraValida(datos.horaInicio)) {
      errores.horaInicio = "Escribe la hora con el formato 08:00.";
    }
    if (!hayFin) {
      errores.horaFin = "Indica la hora de fin.";
    } else if (!esHoraValida(datos.horaFin)) {
      errores.horaFin = "Escribe la hora con el formato 10:00.";
    }
    if (
      !errores.horaInicio &&
      !errores.horaFin &&
      minutosDe(datos.horaFin) <= minutosDe(datos.horaInicio)
    ) {
      errores.horaFin = "La hora de fin debe ser posterior a la de inicio.";
    }
  }

  if (datos.lugar.trim().length > LIMITES_DE_CLUB.lugar) {
    errores.lugar = `El lugar admite hasta ${LIMITES_DE_CLUB.lugar} caracteres.`;
  }

  const cupo = enteroDe(datos.cupoMaximo);
  if (datos.cupoMaximo.trim() === "") {
    errores.cupoMaximo = "Escribe el cupo máximo.";
  } else if (
    cupo === null ||
    cupo < LIMITES_DE_CLUB.cupoMinimo ||
    cupo > LIMITES_DE_CLUB.cupoMaximo
  ) {
    errores.cupoMaximo = `El cupo debe ser un número entero entre ${LIMITES_DE_CLUB.cupoMinimo} y ${LIMITES_DE_CLUB.cupoMaximo}.`;
  } else if (!contexto.esNuevo && cupo < contexto.integrantesActivos) {
    errores.cupoMaximo = `El cupo no puede ser menor que los ${contexto.integrantesActivos} integrantes activos.`;
  }

  return errores;
}
