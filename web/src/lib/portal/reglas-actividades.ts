import { TIPOS_DE_CONTENIDO, type TipoContenido } from "./filtros-actividades";
import { esFechaValida, esHoraValida, minutosDe } from "./tiempo";
import { enteroDe } from "./validacion";

export type DatosDeActividad = {
  clubId: string;
  cursoId: string;
  responsableId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tema: string;
  objetivo: string;
  descripcion: string;
  lugar: string;
  motivoReprogramacion: string;
};

export type CampoDeActividad = keyof DatosDeActividad | "contenidoIds";
export type ErroresDeActividad = Partial<Record<CampoDeActividad, string>>;

export type DatosDeEjecucion = {
  resumen: string;
  observaciones: string;
};

export type CampoDeEjecucion = keyof DatosDeEjecucion | "contenidoIds";
export type ErroresDeEjecucion = Partial<Record<CampoDeEjecucion, string>>;

export type HorarioOriginal = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

export const CAMPOS_DE_ACTIVIDAD: readonly (keyof DatosDeActividad)[] = [
  "clubId",
  "cursoId",
  "responsableId",
  "fecha",
  "horaInicio",
  "horaFin",
  "tema",
  "objetivo",
  "descripcion",
  "lugar",
  "motivoReprogramacion",
];

export const CAMPOS_CON_ERROR_DE_ACTIVIDAD: readonly CampoDeActividad[] = [
  ...CAMPOS_DE_ACTIVIDAD,
  "contenidoIds",
];

export const CAMPOS_DE_EJECUCION: readonly (keyof DatosDeEjecucion)[] = ["resumen", "observaciones"];

export const CAMPOS_CON_ERROR_DE_EJECUCION: readonly CampoDeEjecucion[] = [
  ...CAMPOS_DE_EJECUCION,
  "contenidoIds",
];

export const LIMITES_DE_ACTIVIDAD = {
  tema: 200,
  objetivo: 2000,
  descripcion: 4000,
  lugar: 150,
  motivo: 500,
  resumen: 4000,
  observaciones: 4000,
  contenidos: 30,
  minutosMaximos: 8 * 60,
} as const;

export const CLUBES_PROGRAMABLES = ["PLANIFICADO", "ACTIVO"] as const;

function errorDeTexto(
  valor: string,
  maximo: number,
  vacio?: string,
): string | undefined {
  const texto = valor.trim();
  if (!texto) {
    return vacio;
  }
  return texto.length > maximo ? `Admite hasta ${maximo} caracteres.` : undefined;
}

export function errorDeContenidos(ids: readonly number[], obligatorio: boolean): string | undefined {
  if (obligatorio && ids.length === 0) {
    return "Indica al menos una herramienta, lenguaje, componente o competencia trabajada.";
  }
  return ids.length > LIMITES_DE_ACTIVIDAD.contenidos
    ? `Elige como máximo ${LIMITES_DE_ACTIVIDAD.contenidos} contenidos por actividad.`
    : undefined;
}

export function esReprogramacion(datos: DatosDeActividad, original: HorarioOriginal | null): boolean {
  if (!original) {
    return false;
  }
  return (
    datos.fecha !== original.fecha ||
    datos.horaInicio !== original.horaInicio ||
    datos.horaFin !== original.horaFin
  );
}

export function validarActividad(
  datos: DatosDeActividad,
  contenidoIds: readonly number[],
  original: HorarioOriginal | null,
): ErroresDeActividad {
  const errores: ErroresDeActividad = {};

  if (!original && !enteroDe(datos.clubId)) {
    errores.clubId = "Elige el club de la actividad.";
  }
  if (datos.cursoId && !enteroDe(datos.cursoId)) {
    errores.cursoId = "Elige un curso de la lista o deja la sesión para todo el club.";
  }

  if (!datos.fecha) {
    errores.fecha = "Indica la fecha de la sesión.";
  } else if (!esFechaValida(datos.fecha)) {
    errores.fecha = "Escribe una fecha válida.";
  }

  if (!datos.horaInicio) {
    errores.horaInicio = "Indica la hora de inicio.";
  } else if (!esHoraValida(datos.horaInicio)) {
    errores.horaInicio = "Escribe la hora con el formato 14:00.";
  }

  if (!datos.horaFin) {
    errores.horaFin = "Indica la hora de fin.";
  } else if (!esHoraValida(datos.horaFin)) {
    errores.horaFin = "Escribe la hora con el formato 16:00.";
  }

  if (!errores.horaInicio && !errores.horaFin) {
    const duracion = minutosDe(datos.horaFin) - minutosDe(datos.horaInicio);
    if (duracion <= 0) {
      errores.horaFin = "La hora de fin debe ser posterior a la hora de inicio.";
    } else if (duracion > LIMITES_DE_ACTIVIDAD.minutosMaximos) {
      errores.horaFin = "Una actividad puede durar como máximo 8 horas.";
    }
  }

  errores.tema = errorDeTexto(datos.tema, LIMITES_DE_ACTIVIDAD.tema, "Escribe el tema de la sesión.");
  errores.objetivo = errorDeTexto(
    datos.objetivo,
    LIMITES_DE_ACTIVIDAD.objetivo,
    "Escribe el objetivo de la sesión.",
  );
  errores.descripcion = errorDeTexto(datos.descripcion, LIMITES_DE_ACTIVIDAD.descripcion);
  errores.lugar = errorDeTexto(datos.lugar, LIMITES_DE_ACTIVIDAD.lugar);
  errores.contenidoIds = errorDeContenidos(contenidoIds, false);

  if (esReprogramacion(datos, original)) {
    errores.motivoReprogramacion = errorDeTexto(
      datos.motivoReprogramacion,
      LIMITES_DE_ACTIVIDAD.motivo,
      "Cambiar la fecha o el horario es una reprogramación: escribe el motivo.",
    );
  }

  return errores;
}

export function validarEjecucion(
  datos: DatosDeEjecucion,
  contenidoIds: readonly number[],
): ErroresDeEjecucion {
  return {
    resumen: errorDeTexto(
      datos.resumen,
      LIMITES_DE_ACTIVIDAD.resumen,
      "Describe los contenidos impartidos en la sesión.",
    ),
    observaciones: errorDeTexto(datos.observaciones, LIMITES_DE_ACTIVIDAD.observaciones),
    contenidoIds: errorDeContenidos(contenidoIds, true),
  };
}

export function idsDeContenido(valor: unknown): number[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  const ids = valor
    .map((elemento) => (typeof elemento === "number" ? elemento : Number(elemento)))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, LIMITES_DE_ACTIVIDAD.contenidos + 1);
}

export function duracionLegible(minutos?: number): string {
  if (typeof minutos !== "number" || minutos <= 0) {
    return "";
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) {
    return `${resto} min`;
  }
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

type ContenidoDeApi = {
  id?: number;
  tipo?: string;
  nombre?: string;
  activo?: boolean;
};

export type ContenidoElegible = {
  id: number;
  tipo: TipoContenido;
  nombre: string;
  activo: boolean;
};

function esTipoDeContenido(valor?: string): valor is TipoContenido {
  return TIPOS_DE_CONTENIDO.includes(valor as TipoContenido);
}

export function contenidosElegibles(
  activos: readonly ContenidoDeApi[],
  asignados: readonly ContenidoDeApi[],
): ContenidoElegible[] {
  const porId = new Map<number, ContenidoElegible>();
  for (const contenido of [...activos, ...asignados]) {
    if (typeof contenido.id !== "number" || !esTipoDeContenido(contenido.tipo) || porId.has(contenido.id)) {
      continue;
    }
    porId.set(contenido.id, {
      id: contenido.id,
      tipo: contenido.tipo,
      nombre: contenido.nombre ?? "Contenido",
      activo: contenido.activo ?? true,
    });
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

type ClubDeApi = {
  id?: number;
  nombre?: string;
  institucionNombre?: string;
  periodoNombre?: string;
  lugar?: string;
};

type CursoDeApi = {
  id?: number;
  nombre?: string;
  clubId?: number;
  estado?: string;
};

export type OpcionDeClubParaActividad = {
  valor: string;
  texto: string;
  lugar: string;
};

export type OpcionDeCursoParaActividad = {
  valor: string;
  texto: string;
  clubId: string;
};

const CURSOS_PROGRAMABLES = ["PLANIFICADO", "EN_CURSO"];

export function clubParaActividad(club: ClubDeApi, conInstitucion: boolean): OpcionDeClubParaActividad {
  return {
    valor: String(club.id ?? ""),
    texto: [club.nombre ?? "Club", conInstitucion ? club.institucionNombre : null, club.periodoNombre]
      .filter(Boolean)
      .join(" · "),
    lugar: club.lugar ?? "",
  };
}

export function cursosParaActividad(
  cursos: readonly CursoDeApi[],
  actual?: { id?: number; nombre?: string; clubId?: number },
): OpcionDeCursoParaActividad[] {
  const opciones = cursos
    .filter(
      (curso) =>
        typeof curso.id === "number" &&
        typeof curso.clubId === "number" &&
        (CURSOS_PROGRAMABLES.includes(curso.estado ?? "") || curso.id === actual?.id),
    )
    .map((curso) => ({
      valor: String(curso.id),
      texto: curso.nombre ?? "Curso",
      clubId: String(curso.clubId),
    }));
  if (actual?.id && actual.clubId && !opciones.some((opcion) => opcion.valor === String(actual.id))) {
    opciones.unshift({
      valor: String(actual.id),
      texto: actual.nombre ?? "Curso",
      clubId: String(actual.clubId),
    });
  }
  return opciones;
}
