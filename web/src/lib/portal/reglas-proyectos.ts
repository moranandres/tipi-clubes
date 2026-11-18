import { TIPOS_DE_PROYECTO, type TipoProyecto } from "./filtros-proyectos";
import { esFechaValida, fechaConBarras } from "./tiempo";
import { errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeProyecto = {
  clubId: string;
  tipo: string;
  titulo: string;
  objetivo: string;
  descripcion: string;
  docenteId: string;
  fechaInicio: string;
  fechaFinPrevista: string;
};

export type CampoDeProyecto = keyof DatosDeProyecto | "estudianteIds";
export type ErroresDeProyecto = Partial<Record<CampoDeProyecto, string>>;

export type PeriodoDelClub = {
  inicio: string;
  fin: string;
};

export type ContextoDeProyecto = {
  periodo: PeriodoDelClub | null;
  hoy: string | null;
};

export type DatosDeFinalizacion = {
  resultadoFinal: string;
  fechaFinalizacion: string;
};

export const CAMPOS_DE_PROYECTO: readonly (keyof DatosDeProyecto)[] = [
  "clubId",
  "tipo",
  "titulo",
  "objetivo",
  "descripcion",
  "docenteId",
  "fechaInicio",
  "fechaFinPrevista",
];

export const CAMPOS_CON_ERROR_DE_PROYECTO: readonly CampoDeProyecto[] = [...CAMPOS_DE_PROYECTO, "estudianteIds"];

export const LIMITES_DE_PROYECTO = {
  titulo: 150,
  objetivo: 1000,
  descripcion: 4000,
  integrantes: 30,
  evidencias: 30,
  resultadoFinal: 2000,
  motivo: 500,
} as const;

export function esTipoDeProyecto(valor: string): valor is TipoProyecto {
  return TIPOS_DE_PROYECTO.includes(valor as TipoProyecto);
}

export function mensajeDeInicioFueraDelPeriodo(periodo: PeriodoDelClub): string {
  return `La fecha de inicio del proyecto debe estar dentro del período académico del club (${fechaConBarras(periodo.inicio)} a ${fechaConBarras(periodo.fin)}) y no puede ser posterior a hoy.`;
}

function errorDeInicio(fecha: string, contexto: ContextoDeProyecto): string | undefined {
  if (!fecha) {
    return "Indique la fecha de inicio del proyecto";
  }
  if (!esFechaValida(fecha)) {
    return "Escribe una fecha válida.";
  }
  const { periodo, hoy } = contexto;
  if (periodo && hoy) {
    const limite = periodo.fin < hoy ? periodo.fin : hoy;
    if (fecha < periodo.inicio || fecha > limite) {
      return mensajeDeInicioFueraDelPeriodo(periodo);
    }
  }
  return undefined;
}

function errorDeFinPrevista(fin: string, inicio: string, contexto: ContextoDeProyecto): string | undefined {
  if (!fin) {
    return undefined;
  }
  if (!esFechaValida(fin)) {
    return "Escribe una fecha válida.";
  }
  if (inicio && fin < inicio) {
    return "La fecha prevista de finalización no puede ser anterior a la fecha de inicio.";
  }
  if (contexto.periodo && fin > contexto.periodo.fin) {
    return `La fecha prevista de finalización no puede superar el fin del período académico del club (${fechaConBarras(contexto.periodo.fin)}).`;
  }
  return undefined;
}

export function validarProyecto(
  datos: DatosDeProyecto,
  estudiantes: readonly number[],
  contexto: ContextoDeProyecto,
): ErroresDeProyecto {
  const errores: ErroresDeProyecto = {
    clubId: datos.clubId ? undefined : "El club es obligatorio",
    tipo: esTipoDeProyecto(datos.tipo) ? undefined : "Indique el tipo: PROTOTIPO, SOFTWARE u OTRO",
    titulo: errorDeObligatorio(datos.titulo, "Indique el título del proyecto", LIMITES_DE_PROYECTO.titulo),
    objetivo: errorDeObligatorio(datos.objetivo, "Indique el objetivo del proyecto", LIMITES_DE_PROYECTO.objetivo),
    descripcion: errorDeLongitud(datos.descripcion, LIMITES_DE_PROYECTO.descripcion),
    docenteId: datos.docenteId ? undefined : "Indique el docente tutor del proyecto",
    fechaInicio: errorDeInicio(datos.fechaInicio, contexto),
  };

  if (!errores.fechaInicio) {
    errores.fechaFinPrevista = errorDeFinPrevista(datos.fechaFinPrevista, datos.fechaInicio, contexto);
  }

  if (estudiantes.length === 0) {
    errores.estudianteIds = "Indique al menos un estudiante integrante del proyecto";
  } else if (estudiantes.length > LIMITES_DE_PROYECTO.integrantes) {
    errores.estudianteIds = `Máximo ${LIMITES_DE_PROYECTO.integrantes} integrantes por proyecto`;
  }

  return errores;
}

export function validarFinalizacion(
  datos: DatosDeFinalizacion,
  inicio: string | null,
  hoy: string | null,
): Partial<Record<keyof DatosDeFinalizacion, string>> {
  const errores: Partial<Record<keyof DatosDeFinalizacion, string>> = {
    resultadoFinal: errorDeObligatorio(
      datos.resultadoFinal,
      "Describa el resultado final del proyecto",
      LIMITES_DE_PROYECTO.resultadoFinal,
    ),
  };

  const fecha = datos.fechaFinalizacion;
  if (fecha && !esFechaValida(fecha)) {
    errores.fechaFinalizacion = "Escribe una fecha válida.";
  } else if (fecha && inicio && hoy && (fecha < inicio || fecha > hoy)) {
    errores.fechaFinalizacion = `La fecha de finalización debe estar entre la fecha de inicio del proyecto (${fechaConBarras(inicio)}) y hoy.`;
  }

  return errores;
}

export function errorDeMotivoDeCancelacion(motivo: string): string | undefined {
  return errorDeObligatorio(motivo, "Indique el motivo de la cancelación", LIMITES_DE_PROYECTO.motivo);
}

export function idsValidos(valor: unknown, maximo: number): number[] {
  const lista = Array.isArray(valor) ? valor : [];
  const ids = lista
    .map((elemento) => (typeof elemento === "number" ? elemento : Number(elemento)))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, maximo + 1);
}
