import { ALCANCES_DE_AVANCE, NIVELES_DE_LOGRO, type AlcanceAvance, type NivelLogro } from "./filtros-avances";
import type { PeriodoDelClub } from "./reglas-proyectos";
import { esFechaValida, fechaConBarras } from "./tiempo";
import { enteroDe, errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeAvance = {
  alcance: string;
  clubId: string;
  estudianteId: string;
  proyectoId: string;
  actividadId: string;
  fecha: string;
  resultados: string;
  logros: string;
  dificultades: string;
  proximosPasos: string;
  porcentajeAvance: string;
};

export type CompetenciaEvaluada = {
  contenidoId: number;
  nivel: string;
};

export type CampoDeAvance = keyof DatosDeAvance | "competencias";
export type ErroresDeAvance = Partial<Record<CampoDeAvance, string>>;

export type ContextoDeAvance = {
  periodo: PeriodoDelClub | null;
  hoy: string | null;
  inicioDelProyecto: { titulo: string; fecha: string } | null;
  actividad: { tema: string; fecha: string } | null;
  exigeFecha: boolean;
};

export const CAMPOS_DE_AVANCE: readonly (keyof DatosDeAvance)[] = [
  "alcance",
  "clubId",
  "estudianteId",
  "proyectoId",
  "actividadId",
  "fecha",
  "resultados",
  "logros",
  "dificultades",
  "proximosPasos",
  "porcentajeAvance",
];

export const CAMPOS_CON_ERROR_DE_AVANCE: readonly CampoDeAvance[] = [...CAMPOS_DE_AVANCE, "competencias"];

export const LIMITES_DE_AVANCE = {
  resultados: 2000,
  logros: 2000,
  dificultades: 2000,
  proximosPasos: 1000,
  competencias: 15,
  motivo: 500,
} as const;

export function esAlcanceDeAvance(valor: string): valor is AlcanceAvance {
  return ALCANCES_DE_AVANCE.includes(valor as AlcanceAvance);
}

export function esNivelDeLogro(valor: string): valor is NivelLogro {
  return NIVELES_DE_LOGRO.includes(valor as NivelLogro);
}

function errorDeFecha(fecha: string, contexto: ContextoDeAvance): string | undefined {
  if (!fecha) {
    return contexto.exigeFecha ? "Indique la fecha del avance" : undefined;
  }
  if (!esFechaValida(fecha)) {
    return "Escribe una fecha válida.";
  }
  const { periodo, hoy, inicioDelProyecto, actividad } = contexto;
  if (periodo && hoy) {
    const limite = periodo.fin < hoy ? periodo.fin : hoy;
    if (fecha < periodo.inicio || fecha > limite) {
      return `La fecha del avance debe estar dentro del período académico del club (${fechaConBarras(periodo.inicio)} a ${fechaConBarras(periodo.fin)}) y no puede ser posterior a hoy.`;
    }
  }
  if (inicioDelProyecto && fecha < inicioDelProyecto.fecha) {
    return `La fecha del avance no puede ser anterior al inicio del proyecto «${inicioDelProyecto.titulo}» (${fechaConBarras(inicioDelProyecto.fecha)}).`;
  }
  if (actividad && fecha < actividad.fecha) {
    return `La fecha del avance no puede ser anterior a la de la actividad «${actividad.tema}» (${fechaConBarras(actividad.fecha)}).`;
  }
  return undefined;
}

function errorDeCompetencias(alcance: string, competencias: readonly CompetenciaEvaluada[]): string | undefined {
  if (competencias.length === 0) {
    return undefined;
  }
  if (alcance !== "ESTUDIANTE") {
    return "Las competencias se evalúan en avances individuales de un estudiante (alcance ESTUDIANTE).";
  }
  if (competencias.length > LIMITES_DE_AVANCE.competencias) {
    return `Máximo ${LIMITES_DE_AVANCE.competencias} competencias por avance`;
  }
  if (competencias.some((competencia) => !esNivelDeLogro(competencia.nivel))) {
    return "Indique el nivel: INICIAL, EN_PROCESO, LOGRADO o DESTACADO";
  }
  const ids = competencias.map((competencia) => competencia.contenidoId);
  const repetida = ids.find((id, indice) => ids.indexOf(id) !== indice);
  return repetida === undefined
    ? undefined
    : `La competencia con id ${repetida} está repetida; evalúe cada competencia una sola vez por avance.`;
}

export function validarAvance(
  datos: DatosDeAvance,
  competencias: readonly CompetenciaEvaluada[],
  contexto: ContextoDeAvance,
): ErroresDeAvance {
  const alcance = datos.alcance;
  const errores: ErroresDeAvance = {
    alcance: esAlcanceDeAvance(alcance) ? undefined : "Indique el alcance: CLUB, ESTUDIANTE o PROYECTO",
    clubId: datos.clubId ? undefined : "El club es obligatorio",
    fecha: errorDeFecha(datos.fecha, contexto),
    resultados: errorDeObligatorio(datos.resultados, "Describa los resultados obtenidos", LIMITES_DE_AVANCE.resultados),
    logros: errorDeLongitud(datos.logros, LIMITES_DE_AVANCE.logros),
    dificultades: errorDeLongitud(datos.dificultades, LIMITES_DE_AVANCE.dificultades),
    proximosPasos: errorDeLongitud(datos.proximosPasos, LIMITES_DE_AVANCE.proximosPasos),
    competencias: errorDeCompetencias(alcance, competencias),
  };

  if (alcance === "ESTUDIANTE" && !datos.estudianteId) {
    errores.estudianteId = "Indique el estudiante del avance.";
  }
  if (alcance === "PROYECTO" && !datos.proyectoId) {
    errores.proyectoId = "Indique el proyecto del avance.";
  }

  const porcentajeEscrito = datos.porcentajeAvance.trim();
  if (alcance === "PROYECTO") {
    const porcentaje = enteroDe(porcentajeEscrito);
    if (!porcentajeEscrito) {
      errores.porcentajeAvance = "Indique el porcentaje de avance del proyecto (0 a 100).";
    } else if (porcentaje === null || porcentaje > 100) {
      errores.porcentajeAvance = "El porcentaje de avance va de 0 a 100";
    }
  } else if (porcentajeEscrito) {
    errores.porcentajeAvance = "El porcentaje de avance solo se registra en los avances de un proyecto.";
  }

  return errores;
}

export function competenciasValidas(valor: unknown): CompetenciaEvaluada[] {
  const lista = Array.isArray(valor) ? valor : [];
  return lista
    .filter((elemento): elemento is Record<string, unknown> => typeof elemento === "object" && elemento !== null)
    .map((elemento) => ({
      contenidoId: Number(elemento.contenidoId),
      nivel: typeof elemento.nivel === "string" ? elemento.nivel : "",
    }))
    .filter((competencia) => Number.isSafeInteger(competencia.contenidoId) && competencia.contenidoId > 0)
    .slice(0, LIMITES_DE_AVANCE.competencias + 1);
}

export function errorDeMotivoDeAnulacion(motivo: string): string | undefined {
  return errorDeObligatorio(motivo, "Indique el motivo de la anulación", LIMITES_DE_AVANCE.motivo);
}
