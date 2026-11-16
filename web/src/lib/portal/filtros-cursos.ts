export const ESTADOS_DE_CURSO = ["EN_CURSO", "PLANIFICADO", "FINALIZADO", "CANCELADO"] as const;
export const NIVELES_DE_CURSO = ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"] as const;
export const MODALIDADES_DE_CURSO = ["PRESENCIAL", "ONLINE", "HIBRIDO"] as const;

export type EstadoCurso = (typeof ESTADOS_DE_CURSO)[number];
export type NivelCurso = (typeof NIVELES_DE_CURSO)[number];
export type ModalidadCurso = (typeof MODALIDADES_DE_CURSO)[number];

export const NOMBRES_DE_ESTADO_DE_CURSO: Record<EstadoCurso, string> = {
  EN_CURSO: "En curso",
  PLANIFICADO: "Planificado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const PUNTOS_DE_ESTADO_DE_CURSO: Record<EstadoCurso, string> = {
  EN_CURSO: "bg-exito",
  PLANIFICADO: "bg-acento",
  FINALIZADO: "bg-tenue",
  CANCELADO: "bg-error",
};

export const NOMBRES_DE_NIVEL: Record<NivelCurso, string> = {
  PRINCIPIANTE: "Principiante",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

export const NOMBRES_DE_MODALIDAD: Record<ModalidadCurso, string> = {
  PRESENCIAL: "Presencial",
  ONLINE: "En línea",
  HIBRIDO: "Híbrida",
};

export type FiltrosCursos = {
  q: string;
  estado: EstadoCurso | null;
  nivel: NivelCurso | null;
  modalidad: ModalidadCurso | null;
  institucion: number | null;
  pagina: number;
};

export type ParametrosDeBusqueda = Record<string, string | string[] | undefined>;

export const RUTA_CURSOS = "/portal/cursos";
export const CURSOS_POR_PAGINA = 10;

export const FILTROS_DE_CURSOS_VACIOS: FiltrosCursos = {
  q: "",
  estado: null,
  nivel: null,
  modalidad: null,
  institucion: null,
  pagina: 1,
};

const LONGITUD_MAXIMA_BUSQUEDA = 80;

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function enteroPositivo(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function opcionValida<T extends string>(opciones: readonly T[], valor: string): T | null {
  return opciones.includes(valor as T) ? (valor as T) : null;
}

export function leerFiltrosDeCursos(parametros: ParametrosDeBusqueda): FiltrosCursos {
  return {
    q: primero(parametros.q).trim().slice(0, LONGITUD_MAXIMA_BUSQUEDA),
    estado: opcionValida(ESTADOS_DE_CURSO, primero(parametros.estado)),
    nivel: opcionValida(NIVELES_DE_CURSO, primero(parametros.nivel)),
    modalidad: opcionValida(MODALIDADES_DE_CURSO, primero(parametros.modalidad)),
    institucion: enteroPositivo(primero(parametros.institucion)),
    pagina: enteroPositivo(primero(parametros.pagina)) ?? 1,
  };
}

export function rutaDeCursos(filtros: FiltrosCursos): string {
  const parametros = new URLSearchParams();
  if (filtros.q) {
    parametros.set("q", filtros.q);
  }
  if (filtros.estado) {
    parametros.set("estado", filtros.estado);
  }
  if (filtros.nivel) {
    parametros.set("nivel", filtros.nivel);
  }
  if (filtros.modalidad) {
    parametros.set("modalidad", filtros.modalidad);
  }
  if (filtros.institucion) {
    parametros.set("institucion", String(filtros.institucion));
  }
  if (filtros.pagina > 1) {
    parametros.set("pagina", String(filtros.pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `${RUTA_CURSOS}?${consulta}` : RUTA_CURSOS;
}

export function hayFiltrosDeCursos(filtros: FiltrosCursos): boolean {
  return Boolean(
    filtros.q || filtros.estado || filtros.nivel || filtros.modalidad || filtros.institucion,
  );
}
